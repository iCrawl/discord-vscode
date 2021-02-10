import LANG from './data/languages.json';

export const CLIENT_ID = '383226320970055681' as const;

export const KNOWN_EXTENSIONS: { [key: string]: { image: string } } = LANG.KNOWN_EXTENSIONS;
export const KNOWN_LANGUAGES: { language: string; image: string }[] = LANG.KNOWN_LANGUAGES;

export const EMPTY = '\u200b\u200b';
export const FILE_SIZES = [' bytes', 'kb', 'mb', 'gb', 'tb'];

export const IDLE_IMAGE_KEY = 'vscode-big';
export const DEBUG_IMAGE_KEY = 'debug';
export const VSCODE_IMAGE_KEY = 'vscode';
export const VSCODE_INSIDERS_IMAGE_KEY = 'vscode-insiders';

export const enum REPLACE_KEYS {
	Empty = '{empty}',
	FileName = '{file_name}',
	DirName = '{dir_name}',
	FullDirName = '{full_dir_name}',
	Workspace = '{workspace}',
	WorkspaceFolder = '{workspace_folder}',
	WorkspaceAndFolder = '{workspace_and_folder}',
	LanguageLowerCase = '{lang}',
	LanguageTitleCase = '{Lang}',
	LanguageUpperCase = '{LANG}',
	TotalLines = '{total_lines}',
	CurrentLine = '{current_line}',
	CurrentColumn = '{current_column}',
	FileSize = '{file_size}',
	AppName = '{app_name}',
	GitRepoName = '{git_repo_name}',
	GitBranch = '{git_branch}',
}

export const enum CONFIG_KEYS {
	Enabled = 'enabled',
	DetailsIdling = 'details_idling',
	DetailsEditing = 'details_editing',
	DetailsDebugging = 'details_debugging',
	LowerDetailsIdling = 'lower_details_idling',
	LowerDetailsEditing = 'lower_details_editing',
	LowerDetailsDebugging = 'lower_details_debugging',
	LowerDetailsNoWorkspaceFound = 'lower_details_no_workspace_found',
	LargeImageIdling = 'large_image_idling',
	LargeImage = 'large_image',
	SmallImage = 'small_image',
	SuppressNotifications = 'suppress_notifications',
	WorkspaceElapsedTime = 'workspace_elapsed_time',
	WorkspaceExcludePatterns = 'workspace_exclude_patterns',
}
