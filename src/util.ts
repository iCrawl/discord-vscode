import { basename } from 'node:path';
import type { TextDocument, WorkspaceConfiguration } from 'vscode';
import { workspace, extensions, window, TabInputWebview } from 'vscode';
import type { API, GitExtension } from './@types/git';
import {
	AI_CHAT_IMAGE_KEYS,
	CONFIG_KEYS,
	IDLE_IMAGE_KEY,
	KNOWN_EXTENSIONS,
	KNOWN_LANGUAGES,
	WEBVIEW_TAB_VIEW_TYPE_PREFIX,
} from './constants';
import { log, LogLevel } from './logger';

let git: API | null | undefined;

type WorkspaceExtensionConfiguration = WorkspaceConfiguration & {
	aiChatViewTypes: Record<string, string>;
	detailsAiChat: string;
	detailsDebugging: string;
	detailsEditing: string;
	detailsIdling: string;
	enabled: boolean;
	idleTimeout: number;
	largeImage: string;
	largeImageAiChat: string;
	largeImageIdling: string;
	lowerDetailsAiChat: string;
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

export function resolveAiChat() {
	const input = window.tabGroups.activeTabGroup?.activeTab?.input;
	if (!(input instanceof TabInputWebview)) {
		return undefined;
	}

	const viewType = input.viewType.startsWith(WEBVIEW_TAB_VIEW_TYPE_PREFIX)
		? input.viewType.slice(WEBVIEW_TAB_VIEW_TYPE_PREFIX.length)
		: input.viewType;

	const match = Object.entries(getConfig()[CONFIG_KEYS.AiChatViewTypes]).find(([pattern]) => {
		try {
			return new RegExp(pattern).test(viewType);
		} catch {
			log(LogLevel.Error, `Invalid pattern in discord.aiChatViewTypes: ${pattern}`);
			return false;
		}
	});

	if (!match) {
		return undefined;
	}

	const [, name] = match;
	const image = toLower(name).replaceAll(' ', '-');

	return { name, image: AI_CHAT_IMAGE_KEYS.includes(image) ? image : IDLE_IMAGE_KEY };
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
