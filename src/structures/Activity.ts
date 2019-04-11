import { statSync } from 'fs';
import { basename, parse, sep } from 'path';
import {
	debug,
	Disposable,
	env,
	window,
	workspace
} from 'vscode'; // tslint:disable-line
import * as vsls from 'vsls/vscode';
const lang = require('../data/languages.json'); // tslint:disable-line
const knownExtentions: { [key: string]: { image: string } } = lang.knownExtentions;
const knownLanguages: string[] = lang.knownLanguages;

const empty = '\u200b\u200b';
const sizes = [' bytes', 'kb', 'mb', 'gb', 'tb'];

interface State {
	details?: string;
	state?: string;
	startTimestamp?: number | null;
	largeImageKey?: string;
	largeImageText?: string;
	smallImageKey?: string;
	smallImageText?: string;
	partyId?: string;
	partySize?: number;
	partyMax?: number;
	matchSecret?: string;
	joinSecret?: string;
	spectateSecret?: string;
	instance?: boolean;
}

interface FileDetail {
	size?: string;
	totalLines?: string;
	currentLine?: string;
	currentColumn?: string;
}

export default class Activity implements Disposable {
	private _state: State | null = null; // tslint:disable-line

	private readonly _config = workspace.getConfiguration('discord'); // tslint:disable-line

	private _lastKnownFile: string = ''; // tslint:disable-line

	public get state() {
		return this._state;
	}

	public generate(workspaceElapsedTime: boolean = false) {
		let largeImageKey: any = 'vscode-big';
		if (window.activeTextEditor) {
			if (window.activeTextEditor.document.fileName === this._lastKnownFile) {
				return this._state = {
					...this._state,
					details: this._generateDetails('detailsDebugging', 'detailsEditing', 'detailsIdle', this._state!.largeImageKey),
					smallImageKey: debug.activeDebugSession ? 'debug' : env.appName.includes('Insiders') ? 'vscode-insiders' : 'vscode',
					state: this._generateDetails('lowerDetailsDebugging', 'lowerDetailsEditing', 'lowerDetailsIdle', this._state!.largeImageKey)
				};
			}
			this._lastKnownFile = window.activeTextEditor.document.fileName;
			const filename = basename(window.activeTextEditor.document.fileName);
			largeImageKey = knownExtentions[Object.keys(knownExtentions).find(key => {
				if (filename.endsWith(key)) return true;
				const match = key.match(/^\/(.*)\/([mgiy]+)$/);
				if (!match) return false;
				const regex = new RegExp(match[1], match[2]);
				return regex.test(filename);
			})!] || (knownLanguages.includes(window.activeTextEditor.document.languageId) ? window.activeTextEditor.document.languageId : null);
		}

		let previousTimestamp = null;
		if (this._state && this._state.startTimestamp) previousTimestamp = this._state.startTimestamp;

		this._state = {
			...this._state,
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
			smallImageText: this._config.get<string>('smallImage')!.replace('{appname}', env.appName)
		};

		return this._state;
	}

	public async allowSpectate() {
		const liveshare = await vsls.getApi();
		if (!liveshare) return;
		const join = await liveshare.share({ suppressNotification: true, access: vsls.Access.ReadOnly });
		this._state = {
			...this._state,
			spectateSecret: join ? Buffer.from(join.toString()).toString('base64') : undefined,
			instance: true
		};

		return this._state;
	}

	public async disableSpectate() {
		const liveshare = await vsls.getApi();
		if (!liveshare) return;
		await liveshare.end();
		this._state = {
			...this._state,
			spectateSecret: undefined,
			instance: false
		};

		return this._state;
	}

	public async allowJoinRequests() {
		const liveshare = await vsls.getApi();
		if (!liveshare) return;
		const join = await liveshare.share({ suppressNotification: true });
		this._state = {
			...this._state,
			partyId: join ? join.query : undefined,
			partySize: 1,
			partyMax: 5,
			joinSecret: join ? Buffer.from(join.toString()).toString('base64') : undefined,
			instance: true
		};

		return this._state;
	}

	public async disableJoinRequests() {
		const liveshare = await vsls.getApi();
		if (!liveshare) return;
		await liveshare.end();
		this._state = {
			...this._state,
			partyId: undefined,
			partySize: undefined,
			partyMax: undefined,
			joinSecret: undefined,
			instance: false
		};

		return this._state;
	}

	public changePartyId(id?: string) {
		if (!this._state) return;
		this._state = {
			...this._state,
			partyId: id,
			partySize: this._state.partySize ? this._state.partySize + 1 : 1,
			partyMax: id ? 5 : undefined
		};

		return this._state;
	}

	public increasePartySize(size?: number) {
		if (!this._state) return;
		if (this.state && this._state.partySize === 5) return;
		this._state = {
			...this._state,
			partySize: this._state.partySize ? this._state.partySize + 1 : size
		};

		return this._state;
	}

	public decreasePartySize(size?: number) {
		if (!this._state) return;
		if (this.state && this._state.partySize === 1) return;
		this._state = {
			...this._state,
			partySize: this._state.partySize ? this._state.partySize - 1 : size
		};

		return this._state;
	}

	public dispose() {
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

			if (debug.activeDebugSession) {
				raw = this._config.get<string>(debugging)!;
			} else {
				raw = this._config.get<string>(editing)!;
			}

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
		const fileDetail: FileDetail = {};
		if (!str) return fileDetail;

		if (window.activeTextEditor) {
			if (str.includes('{totallines}')) {
				fileDetail.totalLines = window.activeTextEditor.document.lineCount.toLocaleString();
			}

			if (str.includes('{currentline}')) {
				fileDetail.currentLine = (window.activeTextEditor.selection.active.line + 1).toLocaleString(); // tslint:disable-line
			}

			if (str.includes('{currentcolumn}')) {
				fileDetail.currentColumn = (window.activeTextEditor.selection.active.character + 1).toLocaleString(); // tslint:disable-line
			}

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
