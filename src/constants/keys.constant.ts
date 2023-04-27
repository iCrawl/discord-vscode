export const enum REPLACE_KEYS {
    Empty = '{empty}',
    FileName = '{file_name}',
    DirName = '{dir_name}',
    FullDirName = '{full_dir_name}',
    Workspace = '{workspace}',
    VSCodeWorkspace = '(Workspace)',
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
    DetailsIdling = 'detailsIdling',
    DetailsEditing = 'detailsEditing',
    DetailsDebugging = 'detailsDebugging',
    LowerDetailsIdling = 'lowerDetailsIdling',
    LowerDetailsEditing = 'lowerDetailsEditing',
    LowerDetailsDebugging = 'lowerDetailsDebugging',
    LowerDetailsNoWorkspaceFound = 'lowerDetailsNoWorkspaceFound',
    LargeImageIdling = 'largeImageIdling',
    LargeImage = 'largeImage',
    SmallImage = 'smallImage',
    SuppressNotifications = 'suppressNotifications',
    WorkspaceExcludePatterns = 'workspaceExcludePatterns',
    SwapBigAndSmallImage = 'swapBigAndSmallImage',
    RemoveDetails = 'removeDetails',
    RemoveLowerDetails = 'removeLowerDetails',
    RemoveTimestamp = 'removeTimestamp',
    RemoveRemoteRepository = 'removeRemoteRepository',
    IdleTimeout = 'idleTimeout',
}


export const IDLE_IMAGE_KEY = 'vscode-big' as const;
export const DEBUG_IMAGE_KEY = 'debug' as const;
export const VSCODE_IMAGE_KEY = 'vscode' as const;
export const VSCODE_INSIDERS_IMAGE_KEY = 'vscode-insiders' as const;
