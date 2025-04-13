import LANG from './data/languages.json';

export const CLIENT_ID = '383226320970055681' as const;

export const KNOWN_EXTENSIONS: { [key: string]: { image: string } } = LANG.KNOWN_EXTENSIONS;
export const KNOWN_LANGUAGES: { image: string; language: string }[] = LANG.KNOWN_LANGUAGES;

export const EMPTY = '' as const;
export const FAKE_EMPTY = '\u200B\u200B' as const;
export const FILE_SIZES = [' bytes', 'KB', 'MB', 'GB', 'TB'] as const;

export const IDLE_IMAGE_KEY = 'idle-vscode' as const;
export const DEBUG_IMAGE_KEY = 'debug' as const;
export const VSCODE_IMAGE_KEY = 'vscode' as const;
export const VSCODE_INSIDERS_IMAGE_KEY = 'vscode-insiders' as const;
export const CURSOR_IMAGE_KEY = 'cursor' as const;

export const UNKNOWN_GIT_BRANCH = 'Unknown' as const;
export const UNKNOWN_GIT_REPO_NAME = 'Unknown' as const;

export const enum REPLACE_KEYS {
	AppName = '{app_name}',
	CurrentColumn = '{current_column}',
	CurrentLine = '{current_line}',
	DirName = '{dir_name}',
	Empty = '{empty}',
	FileName = '{file_name}',
	FileSize = '{file_size}',
	FullDirName = '{full_dir_name}',
	GitBranch = '{git_branch}',
	GitRepoName = '{git_repo_name}',
	LanguageLowerCase = '{lang}',
	LanguageTitleCase = '{Lang}',
	LanguageUpperCase = '{LANG}',
	TotalLines = '{total_lines}',
	VSCodeWorkspace = '(Workspace)',
	Workspace = '{workspace}',
	WorkspaceAndFolder = '{workspace_and_folder}',
	WorkspaceFolder = '{workspace_folder}',
}

export const enum CONFIG_KEYS {
	DetailsDebugging = 'detailsDebugging',
	DetailsEditing = 'detailsEditing',
	DetailsIdling = 'detailsIdling',
	DisconnectButton = 'disconnectButton',
	Enabled = 'enabled',
	IdleTimeout = 'idleTimeout',
	LargeImage = 'largeImage',
	LargeImageIdling = 'largeImageIdling',
	LowerDetailsDebugging = 'lowerDetailsDebugging',
	LowerDetailsEditing = 'lowerDetailsEditing',
	LowerDetailsIdling = 'lowerDetailsIdling',
	LowerDetailsNoWorkspaceFound = 'lowerDetailsNoWorkspaceFound',
	RemoveDetails = 'removeDetails',
	RemoveLowerDetails = 'removeLowerDetails',
	RemoveRemoteRepository = 'removeRemoteRepository',
	RemoveTimestamp = 'removeTimestamp',
	SmallImage = 'smallImage',
	SuppressNotifications = 'suppressNotifications',
	SwapBigAndSmallImage = 'swapBigAndSmallImage',
	WorkspaceExcludePatterns = 'workspaceExcludePatterns',
}
