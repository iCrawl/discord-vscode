import { parse, sep } from 'path';
import { debug, env, Selection, TextDocument, window, workspace } from 'vscode';
import GitUrlParse from 'git-url-parse';

import {
	CONFIG_KEYS,
	DEBUG_IMAGE_KEY,
	EMPTY,
	FAKE_EMPTY,
	FILE_SIZES,
	IDLE_IMAGE_KEY,
	REPLACE_KEYS,
	UNKNOWN_GIT_BRANCH,
	UNKNOWN_GIT_REPO_NAME,
	UNKNOWN_GIT_REPO_OWNER,
	VSCODE_IMAGE_KEY,
	VSCODE_INSIDERS_IMAGE_KEY,
} from './constants';
import { log, LogLevel } from './logger';
import { getConfig, getGit, resolveFileIcon, toLower, toTitle, toUpper } from './util';

interface ActivityPayload {
	details?: string | undefined;
	state?: string | undefined;
	startTimestamp?: number | null | undefined;
	largeImageKey?: string | undefined;
	largeImageText?: string | undefined;
	smallImageKey?: string | undefined;
	smallImageText?: string | undefined;
	partyId?: string | undefined;
	partySize?: number | undefined;
	partyMax?: number | undefined;
	matchSecret?: string | undefined;
	joinSecret?: string | undefined;
	spectateSecret?: string | undefined;
	buttons?: { label: string; url: string }[] | undefined;
	instance?: boolean | undefined;
}

async function repoDetails(_raw: string) {
	let raw = _raw.slice();

	const git = await getGit();
	const repo = git?.repositories.find((repo) => repo.ui.selected);
	const repo_data = repo?.state.remotes[0].fetchUrl ? GitUrlParse(repo.state.remotes[0].fetchUrl) : undefined;

	raw = raw
		.replace(REPLACE_KEYS.GitBranch, repo ? repo.state.HEAD?.name ?? FAKE_EMPTY : UNKNOWN_GIT_BRANCH)
		.replace(REPLACE_KEYS.GitRepoName, repo_data?.name ?? UNKNOWN_GIT_REPO_NAME)
		.replace(REPLACE_KEYS.GitRepoOwner, repo_data?.owner ?? UNKNOWN_GIT_REPO_OWNER);

	return raw;
}

async function fileDetails(_raw: string, document: TextDocument) {
	let raw = _raw.slice();

	const { dir, base: fileName } = parse(document.fileName);
	const split = dir.split(sep);
	const dirName = split[split.length - 1];

	const fileIcon = resolveFileIcon(document);

	if (raw.includes(REPLACE_KEYS.FileSize)) {
		let currentDivision = 0;
		let size: number;
		try {
			({ size } = await workspace.fs.stat(document.uri));
		} catch {
			size = document.getText().length;
		}
		while (size > 1000) {
			currentDivision++;
			size /= 1000;
		}

		raw = raw.replace(REPLACE_KEYS.FileSize, `${size.toFixed(currentDivision ? 2 : 0)}${FILE_SIZES[currentDivision]}`);
	}

	raw = raw
		.replace(REPLACE_KEYS.DirName, dirName)
		.replace(REPLACE_KEYS.FileName, fileName)
		.replace(REPLACE_KEYS.LanguageLowerCase, toLower(fileIcon))
		.replace(REPLACE_KEYS.LanguageTitleCase, toTitle(fileIcon))
		.replace(REPLACE_KEYS.LanguageUpperCase, toUpper(fileIcon))
		.replace(REPLACE_KEYS.TotalLines, document.lineCount.toLocaleString());

	return raw;
}

async function editDetails(_raw: string, selection: Selection) {
	let raw = _raw.slice();

	if (raw.includes(REPLACE_KEYS.CurrentLine)) {
		raw = raw.replace(REPLACE_KEYS.CurrentLine, (selection.active.line + 1).toLocaleString());
	}

	if (raw.includes(REPLACE_KEYS.CurrentColumn)) {
		raw = raw.replace(REPLACE_KEYS.CurrentColumn, (selection.active.character + 1).toLocaleString());
	}
	raw = raw
		.replace(REPLACE_KEYS.CurrentLine, (selection.active.line + 1).toLocaleString())
		.replace(REPLACE_KEYS.CurrentColumn, (selection.active.character + 1).toLocaleString());

	return raw;
}

async function workspaceDetails(_raw: string, document: TextDocument) {
	let raw = _raw.slice();
	const config = getConfig();
	const noWorkspaceFound = config[CONFIG_KEYS.LowerDetailsNoWorkspaceFound].replace(REPLACE_KEYS.Empty, FAKE_EMPTY);
	const workspaceFolder = workspace.getWorkspaceFolder(document.uri);
	const workspaceFolderName = workspaceFolder?.name ?? noWorkspaceFound;
	const workspaceName = workspace.name?.replace(REPLACE_KEYS.VSCodeWorkspace, EMPTY) ?? workspaceFolderName;
	const workspaceAndFolder = `${workspaceName}${workspaceFolderName === FAKE_EMPTY ? '' : ` - ${workspaceFolderName}`}`;
	if (workspaceFolder) {
		const { name } = workspaceFolder;
		const relativePath = workspace.asRelativePath(document.fileName).split(sep);
		relativePath.splice(-1, 1);
		raw = raw.replace(REPLACE_KEYS.FullDirName, `${name}${sep}${relativePath.join(sep)}`);
	}
	raw = raw
		.replace(REPLACE_KEYS.Workspace, workspaceName)
		.replace(REPLACE_KEYS.WorkspaceFolder, workspaceFolderName)
		.replace(REPLACE_KEYS.WorkspaceAndFolder, workspaceAndFolder);
	return raw;
}

async function catchDetailsErrors<T extends any[]>(
	addDetails: (_raw: string, ...args: T) => Promise<string>,
	detail_name: string,
	...args: Parameters<typeof addDetails>
) {
	let raw = args[0].slice();
	try {
		raw = await addDetails.apply(undefined, [...args]);
	} catch (error) {
		log(LogLevel.Error, `Failed to generate ${detail_name} details: ${error as string}`);
	}
	return raw;
}

async function details(idling: CONFIG_KEYS, editing: CONFIG_KEYS, debugging: CONFIG_KEYS) {
	const config = getConfig();

	let raw = config[window.activeTextEditor?idling:debug.activeDebugSession?debugging:editing] as string;
	raw = raw.replace(REPLACE_KEYS.Empty, FAKE_EMPTY);
	if (window.activeTextEditor) {
		raw = await catchDetailsErrors(editDetails, 'edit', raw, window.activeTextEditor.selection);
		raw = await catchDetailsErrors(fileDetails, 'file', raw, window.activeTextEditor.document);
		raw = await catchDetailsErrors(workspaceDetails, 'workspace', raw, window.activeTextEditor.document);
		raw = await catchDetailsErrors(repoDetails, 'repository', raw);
	}

	return raw;
}

export async function activity(previous: ActivityPayload = {}) {
	const config = getConfig();
	const swapBigAndSmallImage = config[CONFIG_KEYS.SwapBigAndSmallImage];

	const appName = env.appName;
	const smallImageKey = debug.activeDebugSession
		? DEBUG_IMAGE_KEY
		: appName.includes('Insiders')
		? VSCODE_INSIDERS_IMAGE_KEY
		: VSCODE_IMAGE_KEY;
	const smallImageText = config[CONFIG_KEYS.SmallImage].replace(REPLACE_KEYS.AppName, appName);
	const largeImageKey = window.activeTextEditor ? resolveFileIcon(window.activeTextEditor.document) : IDLE_IMAGE_KEY;
	const largeImageText = window.activeTextEditor
		? config[CONFIG_KEYS.LargeImage]
				.replace(REPLACE_KEYS.LanguageLowerCase, toLower(largeImageKey))
				.replace(REPLACE_KEYS.LanguageTitleCase, toTitle(largeImageKey))
				.replace(REPLACE_KEYS.LanguageUpperCase, toUpper(largeImageKey))
				.padEnd(2, FAKE_EMPTY)
		: config[CONFIG_KEYS.LargeImageIdling];
	const removeDetails = config[CONFIG_KEYS.RemoveDetails];
	const removeLowerDetails = config[CONFIG_KEYS.RemoveLowerDetails];
	const removeRemoteRepository = config[CONFIG_KEYS.RemoveRemoteRepository];

	let state: ActivityPayload = {
		details: removeDetails
			? undefined
			: await details(CONFIG_KEYS.DetailsIdling, CONFIG_KEYS.DetailsEditing, CONFIG_KEYS.DetailsDebugging),
		state:
			window.activeTextEditor && removeLowerDetails
				? undefined
				: await details(
						CONFIG_KEYS.LowerDetailsIdling,
						CONFIG_KEYS.LowerDetailsEditing,
						CONFIG_KEYS.LowerDetailsDebugging,
				  ),
		startTimestamp: config[CONFIG_KEYS.RemoveTimestamp] ? undefined : previous.startTimestamp ?? Date.now(),
		largeImageKey,
		largeImageText,
		smallImageKey,
		smallImageText,
	};

	if (swapBigAndSmallImage) {
		[state.smallImageKey, state.largeImageKey, state.smallImageText, state.largeImageText] = [
			state.largeImageKey,
			state.smallImageKey,
			state.largeImageText,
			state.smallImageText,
		];
	}

	const git = await getGit();
	const repo = git?.repositories.find((repo) => repo.ui.selected);
	const repoURL = repo?.state.remotes[0].fetchUrl;
	const repo_data = repoURL ? GitUrlParse(repoURL) : undefined;

	if (!removeRemoteRepository && repo_data?.href) {
		let viewRemoteRepository = config[CONFIG_KEYS.ViewRemoteRepository];
		viewRemoteRepository = await catchDetailsErrors(repoDetails, 'repository', viewRemoteRepository);

		state = {
			...state,
			buttons: [{ label: viewRemoteRepository, url: repo_data.href }],
		};
	}

	if (window.activeTextEditor) {
		log(LogLevel.Trace, `VSCode language id: ${window.activeTextEditor.document.languageId}`);
	}

	return state;
}
