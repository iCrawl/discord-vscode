import { basename, parse, sep } from 'node:path';
import type { Selection, TextDocument, Diagnostic } from 'vscode';
import { debug, env, window, workspace, languages, DiagnosticSeverity, TabInputCustom } from 'vscode';
import {
	CONFIG_KEYS,
	CURSOR_IMAGE_KEY,
	DEBUG_IMAGE_KEY,
	EMPTY,
	FAKE_EMPTY,
	FILE_SIZES,
	IDLE_IMAGE_KEY,
	REPLACE_KEYS,
	UNKNOWN_GIT_BRANCH,
	UNKNOWN_GIT_REPO_NAME,
	VSCODE_IMAGE_KEY,
	VSCODE_INSIDERS_IMAGE_KEY,
} from './constants';
import { log, LogLevel } from './logger';
import { getConfig, getGit, resolveFileIcon, toLower, toTitle, toUpper } from './util';

interface ActivityPayload {
	buttons?: { label: string; url: string }[] | undefined;
	details?: string | undefined;
	instance?: boolean | undefined;
	joinSecret?: string | undefined;
	largeImageKey?: string | undefined;
	largeImageText?: string | undefined;
	matchSecret?: string | undefined;
	partyId?: string | undefined;
	partyMax?: number | undefined;
	partySize?: number | undefined;
	smallImageKey?: string | undefined;
	smallImageText?: string | undefined;
	spectateSecret?: string | undefined;
	startTimestamp?: number | null | undefined;
	state?: string | undefined;
	type?: number | undefined;
}

async function fileDetails(_raw: string, document: TextDocument, selection: Selection) {
	let raw = _raw.slice();

	if (raw.includes(REPLACE_KEYS.TotalLines)) {
		raw = raw.replace(REPLACE_KEYS.TotalLines, document.lineCount.toLocaleString());
	}

	if (raw.includes(REPLACE_KEYS.CurrentLine)) {
		raw = raw.replace(REPLACE_KEYS.CurrentLine, (selection.active.line + 1).toLocaleString());
	}

	if (raw.includes(REPLACE_KEYS.CurrentColumn)) {
		raw = raw.replace(REPLACE_KEYS.CurrentColumn, (selection.active.character + 1).toLocaleString());
	}

	if (raw.includes(REPLACE_KEYS.CurrentErrors)) {
		const diagnostics = languages.getDiagnostics(document.uri);
		const errors = diagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity === DiagnosticSeverity.Error);
		raw = raw.replace(REPLACE_KEYS.CurrentErrors, errors.length.toLocaleString());
	}

	if (raw.includes(REPLACE_KEYS.FileSize)) {
		let currentDivision = 0;
		let size: number;
		try {
			({ size } = await workspace.fs.stat(document.uri));
		} catch {
			size = document.getText().length;
		}

		const originalSize = size;
		if (originalSize > 1_000) {
			size /= 1_000;
			currentDivision++;
			while (size > 1_000) {
				currentDivision++;
				size /= 1_000;
			}
		}

		raw = raw.replace(
			REPLACE_KEYS.FileSize,
			`${originalSize > 1_000 ? size.toFixed(2) : size}${FILE_SIZES[currentDivision]}`,
		);
	}

	const git = await getGit();

	if (raw.includes(REPLACE_KEYS.GitBranch)) {
		if (git?.repositories.length) {
			raw = raw.replace(
				REPLACE_KEYS.GitBranch,
				git.repositories.find((repo) => repo.ui.selected)?.state.HEAD?.name ?? FAKE_EMPTY,
			);
		} else {
			raw = raw.replace(REPLACE_KEYS.GitBranch, UNKNOWN_GIT_BRANCH);
		}
	}

	if (raw.includes(REPLACE_KEYS.GitRepoName)) {
		if (git?.repositories.length) {
			raw = raw.replace(
				REPLACE_KEYS.GitRepoName,
				git.repositories
					?.find((repo) => repo.ui.selected)
					?.state.remotes[0]?.fetchUrl?.split('/')[1]
					?.replace('.git', '') ?? FAKE_EMPTY,
			);
		} else {
			raw = raw.replace(REPLACE_KEYS.GitRepoName, UNKNOWN_GIT_REPO_NAME);
		}
	}

	return raw;
}

async function details(idling: CONFIG_KEYS, editing: CONFIG_KEYS, debugging: CONFIG_KEYS, viewing: CONFIG_KEYS) {
	const config = getConfig();
	let raw = (config[idling] as string).replace(REPLACE_KEYS.Empty, FAKE_EMPTY);

	const editor = window.activeTextEditor;
	const activeTab = window.tabGroups.activeTabGroup.activeTab;
	const tabInput = activeTab?.input instanceof TabInputCustom ? activeTab.input : null;
	const uri = editor?.document.uri ?? tabInput?.uri;

	const noWorkspaceFound = config[CONFIG_KEYS.LowerDetailsNoWorkspaceFound].replace(REPLACE_KEYS.Empty, FAKE_EMPTY);
	const workspaceFolder = uri ? workspace.getWorkspaceFolder(uri) : undefined;
	const workspaceFolderName = workspaceFolder?.name ?? noWorkspaceFound;
	const workspaceName = workspace.name?.replace(REPLACE_KEYS.VSCodeWorkspace, EMPTY) ?? workspaceFolderName;
	const workspaceAndFolder = `${workspaceName}${workspaceFolderName === FAKE_EMPTY ? '' : ` - ${workspaceFolderName}`}`;

	if (editor) {
		const fileName = basename(editor.document.fileName);
		const { dir } = parse(editor.document.fileName);
		const split = dir.split(sep);
		const dirName = split[split.length - 1];

		const fileIcon = resolveFileIcon(editor.document);

		if (debug.activeDebugSession) {
			raw = config[debugging] as string;
		} else {
			raw = config[editing] as string;
		}

		if (workspaceFolder) {
			const { name } = workspaceFolder;
			const relativePath = workspace.asRelativePath(editor.document.fileName).split(sep);
			relativePath.splice(-1, 1);
			raw = raw.replace(REPLACE_KEYS.FullDirName, `${name}${sep}${relativePath.join(sep)}`);
		}

		try {
			raw = await fileDetails(raw, editor.document, editor.selection);
		} catch (error) {
			log(LogLevel.Error, `Failed to generate file details: ${error as string}`);
		}

		raw = raw
			.replace(REPLACE_KEYS.FileName, fileName)
			.replace(REPLACE_KEYS.DirName, dirName as string)
			.replace(REPLACE_KEYS.Workspace, workspaceName)
			.replace(REPLACE_KEYS.WorkspaceFolder, workspaceFolderName)
			.replace(REPLACE_KEYS.WorkspaceAndFolder, workspaceAndFolder)
			.replace(REPLACE_KEYS.LanguageLowerCase, toLower(fileIcon))
			.replace(REPLACE_KEYS.LanguageTitleCase, toTitle(fileIcon))
			.replace(REPLACE_KEYS.LanguageUpperCase, toUpper(fileIcon));
	} else if (tabInput) {
		const activeTab = window.tabGroups.activeTabGroup.activeTab;
		if (activeTab?.input instanceof TabInputCustom) {
			const uri = activeTab.input.uri;
			const fileName = basename(uri.fsPath);
			const { dir } = parse(uri.fsPath);
			const split = dir.split(sep);
			const dirName = split[split.length - 1];
			const ext = parse(uri.fsPath).ext.slice(1).toLowerCase();
			const DB_EXTENSIONS = ['db', 'sqlite', 'sqlite3'];

			if (DB_EXTENSIONS.includes(ext)) {
				raw = config[viewing] as string;
			} else {
				raw = config[editing] as string;
			}

			if (workspaceFolder) {
				const { name } = workspaceFolder;
				const relativePath = workspace.asRelativePath(uri.fsPath).split(sep);
				relativePath.splice(-1, 1);
				raw = raw.replace(REPLACE_KEYS.FullDirName, `${name}${sep}${relativePath.join(sep)}`);
			}

			raw = raw
				.replace(REPLACE_KEYS.FileName, fileName)
				.replace(REPLACE_KEYS.DirName, dirName as string)
				.replace(REPLACE_KEYS.Workspace, workspaceName)
				.replace(REPLACE_KEYS.WorkspaceFolder, workspaceFolderName)
				.replace(REPLACE_KEYS.WorkspaceAndFolder, workspaceAndFolder)
				.replace(REPLACE_KEYS.LanguageLowerCase, toLower(ext))
				.replace(REPLACE_KEYS.LanguageTitleCase, toTitle(ext))
				.replace(REPLACE_KEYS.LanguageUpperCase, toUpper(ext));
		}
	}

	return raw;
}

export async function activity(previous: ActivityPayload = {}) {
	const config = getConfig();
	const swapBigAndSmallImage = config[CONFIG_KEYS.SwapBigAndSmallImage];

	const appName = env.appName;
	const defaultSmallImageKey = debug.activeDebugSession
		? DEBUG_IMAGE_KEY
		: appName.includes('Cursor')
			? CURSOR_IMAGE_KEY
			: appName.includes('Insiders')
				? VSCODE_INSIDERS_IMAGE_KEY
				: VSCODE_IMAGE_KEY;
	const defaultSmallImageText = config[CONFIG_KEYS.SmallImage].replace(REPLACE_KEYS.AppName, appName);
	const defaultLargeImageText = config[CONFIG_KEYS.LargeImageIdling];
	const removeDetails = config[CONFIG_KEYS.RemoveDetails];
	const removeLowerDetails = config[CONFIG_KEYS.RemoveLowerDetails];
	const removeRemoteRepository = config[CONFIG_KEYS.RemoveRemoteRepository];

	const git = await getGit();

	let state: ActivityPayload = {
		type: 0,
		details: removeDetails
			? undefined
			: await details(
					CONFIG_KEYS.DetailsIdling,
					CONFIG_KEYS.DetailsEditing,
					CONFIG_KEYS.DetailsDebugging,
					CONFIG_KEYS.DetailsViewingDatabase,
				),
		startTimestamp: config[CONFIG_KEYS.RemoveTimestamp] ? undefined : (previous.startTimestamp ?? Date.now()),
		largeImageKey: IDLE_IMAGE_KEY,
		largeImageText: defaultLargeImageText,
		smallImageKey: defaultSmallImageKey,
		smallImageText: defaultSmallImageText,
	};

	if (swapBigAndSmallImage) {
		state = {
			...state,
			largeImageKey: defaultSmallImageKey,
			largeImageText: defaultSmallImageText,
			smallImageKey: IDLE_IMAGE_KEY,
			smallImageText: defaultLargeImageText,
		};
	}

	if (!removeRemoteRepository && git?.repositories.length) {
		let repo = git.repositories.find((repo) => repo.ui.selected)?.state.remotes[0]?.fetchUrl;

		if (repo) {
			if (repo.startsWith('git@') || repo.startsWith('ssh://')) {
				repo = repo.replace('ssh://', '').replace(':', '/').replace('git@', 'https://').replace('.git', '');
			} else {
				repo = repo.replace(/(https:\/\/)([^@]*)@(.*?$)/, '$1$3').replace('.git', '');
			}

			state = {
				...state,
				buttons: [{ label: 'View Repository', url: repo }],
			};
		}
	}

	const activeTab = window.tabGroups.activeTabGroup.activeTab;
	const tabInput = activeTab?.input instanceof TabInputCustom ? activeTab.input : null;
	if (tabInput) {
		const activeTab = window.tabGroups.activeTabGroup.activeTab;
		const tabInput = activeTab?.input instanceof TabInputCustom ? activeTab.input : null;
		if (tabInput) {
			const ext = parse(tabInput.uri.fsPath).ext.slice(1).toLowerCase();
			const DB_EXTENSIONS = ['db', 'sqlite', 'sqlite3'];
			if (DB_EXTENSIONS.includes(ext)) {
				// Viewing datbase file, other activites can be added in else if statments.
				const largeImageKey = 'sql';
				const largeImageText = config[CONFIG_KEYS.LargeImageViewingDatabase]
					.replace(REPLACE_KEYS.LanguageLowerCase, toLower(largeImageKey))
					.replace(REPLACE_KEYS.LanguageTitleCase, toTitle(largeImageKey))
					.replace(REPLACE_KEYS.LanguageUpperCase, toUpper(largeImageKey))
					.padEnd(2, FAKE_EMPTY);
				state = {
					...state,
					details: removeDetails
						? undefined
						: await details(
								CONFIG_KEYS.DetailsIdling,
								CONFIG_KEYS.DetailsEditing,
								CONFIG_KEYS.DetailsDebugging,
								CONFIG_KEYS.DetailsViewingDatabase,
							),
					state: removeLowerDetails
						? undefined
						: await details(
								CONFIG_KEYS.LowerDetailsIdling,
								CONFIG_KEYS.LowerDetailsEditing,
								CONFIG_KEYS.LowerDetailsDebugging,
								CONFIG_KEYS.LowerDetailsViewingDatabase,
							),
					largeImageKey,
					largeImageText,
				};
				if (swapBigAndSmallImage) {
					state = {
						...state,
						smallImageKey: largeImageKey,
						smallImageText: largeImageText,
					};
				} else {
					state = {
						...state,
						largeImageKey,
						largeImageText,
					};
				}
			}
		}
	} else if (window.activeTextEditor) {
		const largeImageKey = resolveFileIcon(window.activeTextEditor.document);
		const largeImageText = config[CONFIG_KEYS.LargeImage]
			.replace(REPLACE_KEYS.LanguageLowerCase, toLower(largeImageKey))
			.replace(REPLACE_KEYS.LanguageTitleCase, toTitle(largeImageKey))
			.replace(REPLACE_KEYS.LanguageUpperCase, toUpper(largeImageKey))
			.padEnd(2, FAKE_EMPTY);

		state = {
			...state,
			details: removeDetails
				? undefined
				: await details(
						CONFIG_KEYS.DetailsIdling,
						CONFIG_KEYS.DetailsEditing,
						CONFIG_KEYS.DetailsDebugging,
						CONFIG_KEYS.DetailsViewingDatabase,
					),
			state: removeLowerDetails
				? undefined
				: await details(
						CONFIG_KEYS.LowerDetailsIdling,
						CONFIG_KEYS.LowerDetailsEditing,
						CONFIG_KEYS.LowerDetailsDebugging,
						CONFIG_KEYS.LowerDetailsViewingDatabase,
					),
		};

		if (swapBigAndSmallImage) {
			state = {
				...state,
				smallImageKey: largeImageKey,
				smallImageText: largeImageText,
			};
		} else {
			state = {
				...state,
				largeImageKey,
				largeImageText,
			};
		}

		log(LogLevel.Trace, `VSCode language id: ${window.activeTextEditor.document.languageId}`);
	}

	return state;
}
