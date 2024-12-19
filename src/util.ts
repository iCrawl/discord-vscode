import { basename } from 'path';
import { TextDocument, workspace, extensions, WorkspaceConfiguration, window } from 'vscode';
import fetch from 'node-fetch';

import { KNOWN_EXTENSIONS, KNOWN_LANGUAGES } from './constants';
import type { API, GitExtension } from './git';
import { log, LogLevel } from './logger';

let git: API | null | undefined;

interface GitHubRepoResponse {
	private: boolean;
	message?: string;
}

type WorkspaceExtensionConfiguration = WorkspaceConfiguration & {
	enabled: boolean;
	detailsIdling: string;
	detailsEditing: string;
	detailsDebugging: string;
	lowerDetailsIdling: string;
	lowerDetailsEditing: string;
	lowerDetailsDebugging: string;
	lowerDetailsNoWorkspaceFound: string;
	largeImageIdling: string;
	largeImage: string;
	smallImage: string;
	suppressNotifications: boolean;
	workspaceExcludePatterns: string[];
	swapBigAndSmallImage: boolean;
	removeDetails: boolean;
	removeLowerDetails: boolean;
	removeTimestamp: boolean;
	removeRemoteRepository: boolean;
	idleTimeout: number;
	showPrivateRepositories: boolean;
};

export function getConfig() {
	return workspace.getConfiguration('discord') as WorkspaceExtensionConfiguration;
}

export const toLower = (str: string) => str.toLocaleLowerCase();

export const toUpper = (str: string) => str.toLocaleUpperCase();

export const toTitle = (str: string) => toLower(str).replace(/^\w/, (c) => toUpper(c));

export function resolveFileIcon(document: TextDocument) {
	const filename = basename(document.fileName);
	const findKnownExtension = Object.keys(KNOWN_EXTENSIONS).find((key) => {
		if (filename.endsWith(key)) {
			return true;
		}

		const match = /^\/(.*)\/([mgiy]+)$/.exec(key);
		if (!match) {
			return false;
		}

		const regex = new RegExp(match[1], match[2]);
		return regex.test(filename);
	});
	const findKnownLanguage = KNOWN_LANGUAGES.find((key) => key.language === document.languageId);
	const fileIcon = findKnownExtension
		? KNOWN_EXTENSIONS[findKnownExtension]
		: findKnownLanguage
			? findKnownLanguage.image
			: null;

	return typeof fileIcon === 'string' ? fileIcon : fileIcon?.image ?? 'text';
}

/**
 * 
 * @param repoUrl 
 * 
 * send a GET request to Githubs api to check if the repo is private.. to do that:
 * 
 * extract owner name and repo name
 * handle if SSH
 * handle if HTTP
 * 
 * use owner name and repo name in the request
 * 
 * @returns Promise of boolean or null
 */
export async function checkRepoVisibility(repoUrl: string): Promise<boolean | null> {
	try {
		// export username from url
		let owner, repo;

		// handle SSH URLs (git@github.com:owner/repo.git)
		if (repoUrl.startsWith('git@github.com')) {
			[owner, repo] = repoUrl.split(':')[1].split('/');

		} else if (repoUrl.includes("github.com")) {
			const urlParts = new URL(repoUrl).pathname.split('/');
			owner = urlParts[1];
			repo = urlParts[2];
		} else {
			return null;
		}

		// clean up repo name to use it in request
		repo = repo.replace('.git', '');

		const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
			headers: {
				'Accept': 'application/vnd.github.v3+json',
				// Use PAT if available
				...await getGitHubToken(),
			}
		});

		const data = await response.json() as GitHubRepoResponse;

		//  if not found , it is not available , so it's not visible 
		if (data.message === 'Not Found') {
			return true;
		}

		return data.private
	} catch (error) {
		// Log the error for debugging
		log(LogLevel.Error, `Failed to check repository visibility: ${error as string}`);
		// If we can't determine visibility, err on the side of caution
		return true;
	}
}

// Helper function to get GitHub token if user has configured it
async function getGitHubToken(): Promise<Record<string, string>> {
	const config = getConfig();
	const token = await workspace.getConfiguration('github').get<string>('token');

	return token ? { 'Authorization': `token ${token}` } : {};
}

export async function getGit() {
	if (git || git === null) {
		return git;
	}

	try {
		log(LogLevel.Debug, 'Loading git extension');
		const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
		if (!gitExtension?.isActive) {
			log(LogLevel.Trace, 'Git extension not activated, activating...');
			await gitExtension?.activate();
		}
		git = gitExtension?.exports.getAPI(1);
	} catch (error) {
		git = null;
		log(LogLevel.Error, `Failed to load git extension, is git installed?; ${error as string}`);
	}

	return git;
}
