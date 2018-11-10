import { statSync } from 'fs';
import { basename, parse, sep } from 'path';
import {
	debug,
	Disposable,
	env,
	window,
	workspace,
} from 'vscode';
const lang = require('../data/languages.json');
const knownExtentions: { [key: string]: { image: string } } = lang.knownExtentions;
const knownLanguages: string[] = lang.knownLanguages;

const empty = '\u200b\u200b';
const sizes = [' bytes', 'kb', 'mb', 'gb', 'tb'];

interface IActivity {
	details?: string;
	state?: string;
	startTimestamp?: number | null;
	largeImageKey?: string;
	largeImageText?: string;
	smallImageKey?: string;
	smallImageText?: string;
	instance?: boolean;
}

interface IFileDetail {
	size?: string;
	totalLines?: string;
	currentLine?: string;
	currentColumn?: string;
}

export default class Activity implements Disposable {

	get state() {
		return this._state;
	}
	private _state: IActivity | null = null;

	private _config = workspace.getConfiguration('discord');

	private _lastKnownFile: string = '';

	generate(workspaceElapsedTime: boolean = false) {
		let largeImageKey: any = 'vscode-big';
		if (window.activeTextEditor) {
			if (window.activeTextEditor.document.fileName === this._lastKnownFile) {
				return this._state = {
					...this._state,
					details: this._generateDetails('detailsDebugging', 'detailsEditing', 'detailsIdle', this._state!.largeImageKey),
					smallImageKey: debug.activeDebugSession ? 'debug' : env.appName.includes('Insiders') ? 'vscode-insiders' : 'vscode',
					state: this._generateDetails('lowerDetailsDebugging', 'lowerDetailsEditing', 'lowerDetailsIdle', this._state!.largeImageKey),
				};
			}
			this._lastKnownFile = window.activeTextEditor.document.fileName;
			const filename = basename(window.activeTextEditor.document.fileName);
			largeImageKey = knownExtentions[Object.keys(knownExtentions).find((key) => {
				if (key.startsWith('.') && filename.endsWith(key)) return true;
				const match = key.match(/^\/(.*)\/([mgiy]+)$/);
				if (!match) return false;
				const regex = new RegExp(match[1], match[2]);
				return regex.test(filename);
			})!] || (knownLanguages.includes(window.activeTextEditor.document.languageId) ? window.activeTextEditor.document.languageId : null);
		}

		let previousTimestamp = null;
		if (this.state && this.state.startTimestamp) previousTimestamp = this.state.startTimestamp;

		this._state = {
			details: this._generateDetails('detailsDebugging', 'detailsEditing', 'detailsIdle', largeImageKey),
			startTimestamp: window.activeTextEditor && previousTimestamp && workspaceElapsedTime ? previousTimestamp : window.activeTextEditor ? new Date().getTime() : null,
			state: this._generateDetails('lowerDetailsDebugging', 'lowerDetailsEditing', 'lowerDetailsIdle', largeImageKey),
			largeImageKey: largeImageKey ? largeImageKey.image || largeImageKey : 'txt',
			largeImageText: window.activeTextEditor
				? this._config.get<string>('largeImage')!
					.replace('{lang}', largeImageKey ? largeImageKey.image || largeImageKey : 'txt')
					.replace('{Lang}', largeImageKey ? (largeImageKey.image || largeImageKey).toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase()) : 'Txt')
					.replace('{LANG}', largeImageKey ? (largeImageKey.image || largeImageKey).toUpperCase() : 'TXT')
					|| window.activeTextEditor.document.languageId.padEnd(2, '\u200b')
				: this._config.get<string>('largeImageIdle'),
			smallImageKey: debug.activeDebugSession ? 'debug' : env.appName.includes('Insiders') ? 'vscode-insiders' : 'vscode',
			smallImageText: this._config.get<string>('smallImage')!.replace('{appname}', env.appName),
			instance: false,
		};

		return this._state;
	}

	dispose() {
		this._state = null;
		this._lastKnownFile = '';
	}

	private _generateDetails(debugging: string, editing: string, idling: string, largeImageKey: any) {
		let raw: string = this._config.get<string>(idling)!.replace('{null}', empty);
		let filename = null;
		let dirname = null;
		let checkState = false;
		let workspaceFolder = null;
		let fullDirname = null;
		if (window.activeTextEditor) {
			filename = basename(window.activeTextEditor.document.fileName);

			const { dir } = parse(window.activeTextEditor.document.fileName);
			const split = dir.split(sep);
			dirname = split[split.length - 1];

			checkState = Boolean(workspace.getWorkspaceFolder(window.activeTextEditor.document.uri));

			workspaceFolder = checkState ? workspace.getWorkspaceFolder(window.activeTextEditor.document.uri) : null;

			if (workspaceFolder) {
				const { name } = workspaceFolder;
				const relativePath = workspace.asRelativePath(window.activeTextEditor.document.fileName).split(sep);
				relativePath.splice(-1, 1);
				fullDirname = `${name}${sep}${relativePath.join(sep)}`;
			}

			raw = debug.activeDebugSession ? this._config.get<string>(debugging)! : this._config.get<string>(editing)!;

			const { totalLines, size, currentLine, currentColumn } = this._generateFileDetails(raw);
			raw = raw!
				.replace('{null}', empty)
				.replace('{filename}', filename)
				.replace('{dirname}', dirname)
				.replace('{fulldirname}', fullDirname!)
				.replace('{workspace}', checkState && workspaceFolder ? workspaceFolder.name : this._config.get<string>('lowerDetailsNotFound')!.replace('{null}', empty))
				.replace('{lang}', largeImageKey ? largeImageKey.image || largeImageKey : 'txt')
				.replace('{Lang}', largeImageKey ? (largeImageKey.image || largeImageKey).toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase()) : 'Txt')
				.replace('{LANG}', largeImageKey ? (largeImageKey.image || largeImageKey).toUpperCase() : 'TXT');
			if (totalLines) raw = raw!.replace('{totallines}', totalLines);
			if (size) raw = raw!.replace('{filesize}', size);
			if (currentLine) raw = raw!.replace('{currentline}', currentLine);
			if (currentColumn) raw = raw!.replace('{currentcolumn}', currentColumn);

		}

		return raw;
	}

	private _generateFileDetails(str?: string) {
		const fileDetail: IFileDetail = {};
		if (!str) return fileDetail;

		if (window.activeTextEditor) {
			if (str.includes('{totallines}'))
				fileDetail.totalLines = window.activeTextEditor.document.lineCount.toLocaleString();

			if (str.includes('{currentline}'))
				fileDetail.currentLine = (window.activeTextEditor.selection.active.line + 1).toLocaleString();

			if (str.includes('{currentcolumn}'))
				fileDetail.currentColumn = (window.activeTextEditor.selection.active.character + 1).toLocaleString();

			if (str.includes('{filesize}')) {
				let currentDivision = 0;
				let { size } = statSync(window.activeTextEditor.document.fileName);
				const originalSize = size;
				if (originalSize > 1000) {
					size /= 1000;
					currentDivision++;
					while (size > 1000) {
						currentDivision++;
						size /= 1000;
					}
				}
				fileDetail.size = `${originalSize > 1000 ? size.toFixed(2) : size}${sizes[currentDivision]}`;
			}
		}

		return fileDetail;
	}
}
