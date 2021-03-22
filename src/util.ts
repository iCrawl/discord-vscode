import { basename } from 'path';
import { TextDocument, workspace, WorkspaceConfiguration } from 'vscode';

import { KNOWN_EXTENSIONS, KNOWN_LANGUAGES } from './constants';

type WorkspaceExtensionConfiguration = WorkspaceConfiguration & {
	enabled: boolean;
	enabledIdling: boolean;
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
