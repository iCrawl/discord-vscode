import { basename } from 'node:path';
import type { TextDocument, WorkspaceConfiguration } from 'vscode';
import { workspace, extensions } from 'vscode';
import type { API, GitExtension } from './@types/git';
import { KNOWN_EXTENSIONS, KNOWN_LANGUAGES } from './constants';
import { log, LogLevel } from './logger';

let git: API | null | undefined;

type WorkspaceExtensionConfiguration = WorkspaceConfiguration & {
	detailsDebugging: string;
	detailsEditing: string;
	detailsIdling: string;
	enabled: boolean;
	idleTimeout: number;
	largeImage: string;
	largeImageIdling: string;
	lowerDetailsDebugging: string;
	lowerDetailsEditing: string;
	lowerDetailsIdling: string;
	lowerDetailsNoWorkspaceFound: string;
	removeDetails: boolean;
	removeLowerDetails: boolean;
	removeRemoteRepository: boolean;
	removeTimestamp: boolean;
	smallImage: string;
	suppressNotifications: boolean;
	swapBigAndSmallImage: boolean;
	workspaceExcludePatterns: string[];
};

export function getConfig() {
	return workspace.getConfiguration('discord') as WorkspaceExtensionConfiguration;
}

export const toLower = (str: string) => str.toLocaleLowerCase();

export const toUpper = (str: string) => str.toLocaleUpperCase();

export const toTitle = (str: string) => toLower(str).replace(/^\w/, (char) => toUpper(char));

export function resolveFileIcon(document: TextDocument) {
	const filename = basename(document.fileName);
	const findKnownExtension = Object.keys(KNOWN_EXTENSIONS).find((key) => {
		if (filename.endsWith(key)) {
			return true;
		}

		const match = /^\/(.*)\/([gimy]+)$/.exec(key);
		if (!match) {
			return false;
		}

		const regex = new RegExp(match[1] as string, match[2] as string);
		return regex.test(filename);
	});
	const findKnownLanguage = KNOWN_LANGUAGES.find((key) => key.language === document.languageId);
	const fileIcon = findKnownExtension
		? KNOWN_EXTENSIONS[findKnownExtension]
		: findKnownLanguage
			? findKnownLanguage.image
			: null;

	return typeof fileIcon === 'string' ? fileIcon : (fileIcon?.image ?? 'text');
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

		// eslint-disable-next-line require-atomic-updates
		git = gitExtension?.exports.getAPI(1);
	} catch (error) {
		// eslint-disable-next-line require-atomic-updates
		git = null;
		log(LogLevel.Error, `Failed to load git extension, is git installed?; ${error as string}`);
	}

	return git;
}
