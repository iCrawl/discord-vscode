import { basename, extname, parse, sep } from 'node:path';
import type { Selection, TextDocument, Diagnostic } from 'vscode';
import { debug, env, window, workspace, languages, DiagnosticSeverity } from 'vscode';
import {
	CONFIG_KEYS,
	CURSOR_IMAGE_KEY,
	DEBUG_IMAGE_KEY,
	EMPTY,
	FAKE_EMPTY,
	FILE_SIZES,
	IDLE_IMAGE_KEY,
	PRIVATE_VALUE,
	REPLACE_KEYS,
	SECRET_IMAGE_KEY,
	SLEEP_IMAGE_KEY,
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

function replace(raw: string, searchValue: string, replaceValue: string) {
	return raw.replaceAll(searchValue, replaceValue);
}

function diagnostics(document: TextDocument) {
	const items = languages.getDiagnostics(document.uri);
	const errors = items.filter((diagnostic: Diagnostic) => diagnostic.severity === DiagnosticSeverity.Error);
	const warnings = items.filter((diagnostic: Diagnostic) => diagnostic.severity === DiagnosticSeverity.Warning);

	return { errors, items, warnings };
}

function isPrivateDocument(document: TextDocument) {
	const config = getConfig();
	if (config[CONFIG_KEYS.PrivacyMode]) {
		return true;
	}

	const relativePath = workspace.asRelativePath(document.uri, false);
	const paths = [document.uri.fsPath, relativePath, basename(document.fileName)];

	for (const pattern of config[CONFIG_KEYS.FileExcludePatterns]) {
		try {
			const regex = new RegExp(pattern);
			if (paths.some((path) => regex.test(path))) {
				return true;
			}
		} catch (error) {
			log(LogLevel.Warn, `Invalid file exclude pattern "${pattern}": ${error as string}`);
		}
	}

	return false;
}

async function fileDetails(_raw: string, document: TextDocument, selection: Selection, privateDocument: boolean) {
	let raw = _raw.slice();

	if (raw.includes(REPLACE_KEYS.TotalLines)) {
		raw = replace(raw, REPLACE_KEYS.TotalLines, privateDocument ? PRIVATE_VALUE : document.lineCount.toLocaleString());
	}

	if (raw.includes(REPLACE_KEYS.CurrentLine)) {
		raw = replace(
			raw,
			REPLACE_KEYS.CurrentLine,
			privateDocument ? PRIVATE_VALUE : (selection.active.line + 1).toLocaleString(),
		);
	}

	if (raw.includes(REPLACE_KEYS.CurrentColumn)) {
		raw = replace(
			raw,
			REPLACE_KEYS.CurrentColumn,
			privateDocument ? PRIVATE_VALUE : (selection.active.character + 1).toLocaleString(),
		);
	}

	if (raw.includes(REPLACE_KEYS.CurrentErrors)) {
		const { errors } = diagnostics(document);
		raw = replace(raw, REPLACE_KEYS.CurrentErrors, errors.length.toLocaleString());
	}

	if (raw.includes(REPLACE_KEYS.CurrentWarnings)) {
		const { warnings } = diagnostics(document);
		raw = replace(raw, REPLACE_KEYS.CurrentWarnings, warnings.length.toLocaleString());
	}

	if (raw.includes(REPLACE_KEYS.CurrentProblems)) {
		const { items } = diagnostics(document);
		raw = replace(raw, REPLACE_KEYS.CurrentProblems, items.length.toLocaleString());
	}

	if (raw.includes(REPLACE_KEYS.FileExtension)) {
		raw = replace(raw, REPLACE_KEYS.FileExtension, privateDocument ? PRIVATE_VALUE : extname(document.fileName));
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

		raw = replace(
			raw,
			REPLACE_KEYS.FileSize,
			privateDocument
				? PRIVATE_VALUE
				: `${originalSize > 1_000 ? size.toFixed(2) : size}${FILE_SIZES[currentDivision]}`,
		);
	}

	const git = await getGit();

	if (raw.includes(REPLACE_KEYS.GitBranch)) {
		if (privateDocument) {
			raw = replace(raw, REPLACE_KEYS.GitBranch, PRIVATE_VALUE);
		} else if (git?.repositories.length) {
			raw = replace(
				raw,
				REPLACE_KEYS.GitBranch,
				git.repositories.find((repo) => repo.ui.selected)?.state.HEAD?.name ?? FAKE_EMPTY,
			);
		} else {
			raw = replace(raw, REPLACE_KEYS.GitBranch, UNKNOWN_GIT_BRANCH);
		}
	}

	if (raw.includes(REPLACE_KEYS.GitRepoName)) {
		if (privateDocument) {
			raw = replace(raw, REPLACE_KEYS.GitRepoName, PRIVATE_VALUE);
		} else if (git?.repositories.length) {
			raw = replace(
				raw,
				REPLACE_KEYS.GitRepoName,
				git.repositories
					?.find((repo) => repo.ui.selected)
					?.state.remotes[0]?.fetchUrl?.split('/')[1]
					?.replace('.git', '') ?? FAKE_EMPTY,
			);
		} else {
			raw = replace(raw, REPLACE_KEYS.GitRepoName, UNKNOWN_GIT_REPO_NAME);
		}
	}

	return raw;
}

async function details(idling: CONFIG_KEYS, editing: CONFIG_KEYS, debugging: CONFIG_KEYS) {
	const config = getConfig();
	let raw = (config[idling] as string).replace(REPLACE_KEYS.Empty, FAKE_EMPTY);
	const noWorkspaceFound = config[CONFIG_KEYS.LowerDetailsNoWorkspaceFound].replace(REPLACE_KEYS.Empty, FAKE_EMPTY);
	let workspaceFolderName = workspace.workspaceFolders?.[0]?.name ?? noWorkspaceFound;
	let workspaceName = workspace.name?.replace(REPLACE_KEYS.VSCodeWorkspace, EMPTY) ?? workspaceFolderName;
	let workspaceAndFolder = `${workspaceName}${workspaceFolderName === FAKE_EMPTY ? '' : ` - ${workspaceFolderName}`}`;

	if (window.activeTextEditor) {
		const fileName = basename(window.activeTextEditor.document.fileName);
		const { dir } = parse(window.activeTextEditor.document.fileName);
		const split = dir.split(sep);
		const dirName = split[split.length - 1];

		const workspaceFolder = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri);
		workspaceFolderName = workspaceFolder?.name ?? noWorkspaceFound;
		workspaceName = workspace.name?.replace(REPLACE_KEYS.VSCodeWorkspace, EMPTY) ?? workspaceFolderName;
		workspaceAndFolder = `${workspaceName}${workspaceFolderName === FAKE_EMPTY ? '' : ` - ${workspaceFolderName}`}`;

		const fileIcon = resolveFileIcon(window.activeTextEditor.document);
		const privateDocument = isPrivateDocument(window.activeTextEditor.document);

		if (debug.activeDebugSession) {
			raw = config[debugging] as string;
		} else {
			raw = config[editing] as string;
		}

		if (workspaceFolder) {
			const { name } = workspaceFolder;
			const relativePath = workspace.asRelativePath(window.activeTextEditor.document.fileName).split(sep);
			relativePath.splice(-1, 1);
			raw = replace(
				raw,
				REPLACE_KEYS.FullDirName,
				privateDocument ? PRIVATE_VALUE : `${name}${sep}${relativePath.join(sep)}`,
			);
		}

		try {
			raw = await fileDetails(
				raw,
				window.activeTextEditor.document,
				window.activeTextEditor.selection,
				privateDocument,
			);
		} catch (error) {
			log(LogLevel.Error, `Failed to generate file details: ${error as string}`);
		}

		raw = raw
			.replaceAll(REPLACE_KEYS.FileName, privateDocument ? PRIVATE_VALUE : fileName)
			.replaceAll(REPLACE_KEYS.DirName, privateDocument ? PRIVATE_VALUE : (dirName as string))
			.replaceAll(REPLACE_KEYS.Workspace, privateDocument ? PRIVATE_VALUE : workspaceName)
			.replaceAll(REPLACE_KEYS.WorkspaceFolder, privateDocument ? PRIVATE_VALUE : workspaceFolderName)
			.replaceAll(REPLACE_KEYS.WorkspaceAndFolder, privateDocument ? PRIVATE_VALUE : workspaceAndFolder)
			.replaceAll(REPLACE_KEYS.LanguageLowerCase, toLower(fileIcon))
			.replaceAll(REPLACE_KEYS.LanguageTitleCase, toTitle(fileIcon))
			.replaceAll(REPLACE_KEYS.LanguageUpperCase, toUpper(fileIcon));
	}

	return raw
		.replaceAll(REPLACE_KEYS.Workspace, workspaceName)
		.replaceAll(REPLACE_KEYS.WorkspaceFolder, workspaceFolderName)
		.replaceAll(REPLACE_KEYS.WorkspaceAndFolder, workspaceAndFolder);
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
	const privacyMode = config[CONFIG_KEYS.PrivacyMode];

	const git = await getGit();

	let state: ActivityPayload = {
		type: 0,
		details: removeDetails
			? undefined
			: privacyMode
				? config[CONFIG_KEYS.PrivacyDetails]
				: await details(CONFIG_KEYS.DetailsIdling, CONFIG_KEYS.DetailsEditing, CONFIG_KEYS.DetailsDebugging),
		startTimestamp: config[CONFIG_KEYS.RemoveTimestamp] ? undefined : (previous.startTimestamp ?? Date.now()),
		largeImageKey: privacyMode
			? config[CONFIG_KEYS.PrivacyLargeImageKey] || SECRET_IMAGE_KEY
			: config[CONFIG_KEYS.ShowIdleImage]
				? SLEEP_IMAGE_KEY
				: IDLE_IMAGE_KEY,
		largeImageText: defaultLargeImageText,
		smallImageKey: defaultSmallImageKey,
		smallImageText: defaultSmallImageText,
	};

	if (privacyMode) {
		return state;
	}

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
				repo = repo.replace(/(?<protocol>https:\/\/)[^@]*@(?<host>.*?$)/, '$<protocol>$<host>').replace('.git', '');
			}

			state = {
				...state,
				buttons: [{ label: config[CONFIG_KEYS.RepositoryButtonLabel], url: repo }],
			};
		}
	}

	if (window.activeTextEditor) {
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
				: await details(CONFIG_KEYS.DetailsIdling, CONFIG_KEYS.DetailsEditing, CONFIG_KEYS.DetailsDebugging),
			state: removeLowerDetails
				? undefined
				: await details(
						CONFIG_KEYS.LowerDetailsIdling,
						CONFIG_KEYS.LowerDetailsEditing,
						CONFIG_KEYS.LowerDetailsDebugging,
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
