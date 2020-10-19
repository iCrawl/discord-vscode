import { basename, parse, sep } from 'path';
import { debug, Disposable, env, window, workspace } from 'vscode';
import * as vsls from 'vsls';
import RPCClient from '../client/RPCClient';
import lang from '../data/languages.json';

const knownExtensions: { [key: string]: { image: string } } = lang.knownExtensions;
const knownLanguages: string[] = lang.knownLanguages;

const empty = '\u200b\u200b';
const sizes = [' bytes', 'kb', 'mb', 'gb', 'tb'];

export interface State {
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
	gitbranch?: string;
	gitreponame?: string;
}

export default class Activity implements Disposable {
	private _state: State | null = null;

	private lastKnownFile = '';

	public constructor(private readonly client: RPCClient) {}

	public get state() {
		return this._state;
	}

	public async generate(workspaceElapsedTime = false) {
		let largeImageKey: any = 'vscode-big';
		if (window.activeTextEditor) {
			if (window.activeTextEditor.document.languageId === 'Log') return this._state;
			if (this._state && window.activeTextEditor.document.fileName === this.lastKnownFile) {
				return (this._state = {
					...this._state,
					details: await this._generateDetails(
						'detailsDebugging',
						'detailsEditing',
						'detailsIdle',
						this._state.largeImageKey,
					),
					smallImageKey: debug.activeDebugSession
						? 'debug'
						: env.appName.includes('Insiders')
						? 'vscode-insiders'
						: 'vscode',
					state: await this._generateDetails(
						'lowerDetailsDebugging',
						'lowerDetailsEditing',
						'lowerDetailsIdle',
						this._state.largeImageKey,
					),
				});
			}
			this.lastKnownFile = window.activeTextEditor.document.fileName;
			const filename = basename(window.activeTextEditor.document.fileName);
			largeImageKey =
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				knownExtensions[
					Object.keys(knownExtensions).find((key) => {
						if (filename.endsWith(key)) return true;
						const match = /^\/(.*)\/([mgiy]+)$/.exec(key);
						if (!match) return false;
						const regex = new RegExp(match[1], match[2]);
						return regex.test(filename);
					})!
				] ??
				(knownLanguages.includes(window.activeTextEditor.document.languageId)
					? window.activeTextEditor.document.languageId
					: null);
		}

		let previousTimestamp = null;
		if (this._state?.startTimestamp) previousTimestamp = this._state.startTimestamp;

		this._state = {
			...this._state,
			details: await this._generateDetails('detailsDebugging', 'detailsEditing', 'detailsIdle', largeImageKey),
			startTimestamp:
				window.activeTextEditor && previousTimestamp && workspaceElapsedTime
					? previousTimestamp
					: window.activeTextEditor
					? new Date().getTime()
					: null,
			state: await this._generateDetails(
				'lowerDetailsDebugging',
				'lowerDetailsEditing',
				'lowerDetailsIdle',
				largeImageKey,
			),
			largeImageKey: largeImageKey ? largeImageKey.image || largeImageKey : 'txt',
			largeImageText: window.activeTextEditor
				? this.client.config
						.get<string>('largeImage')!
						.replace('{lang}', largeImageKey ? largeImageKey.image || largeImageKey : 'txt')
						.replace(
							'{Lang}',
							largeImageKey
								? (largeImageKey.image || largeImageKey).toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())
								: 'Txt',
						)
						.replace('{LANG}', largeImageKey ? (largeImageKey.image || largeImageKey).toUpperCase() : 'TXT') ||
				  window.activeTextEditor.document.languageId.padEnd(2, '\u200b')
				: this.client.config.get<string>('largeImageIdle'),
			smallImageKey: debug.activeDebugSession
				? 'debug'
				: env.appName.includes('Insiders')
				? 'vscode-insiders'
				: 'vscode',
			smallImageText: this.client.config.get<string>('smallImage')!.replace('{appname}', env.appName),
		};

		return this._state;
	}

	public async allowSpectate() {
		if (!this._state) return;
		const liveshare = await vsls.getApi();
		if (!liveshare) return;
		const join = await liveshare.share({ suppressNotification: true, access: vsls.Access.ReadOnly });
		this._state = {
			...this._state,
			spectateSecret: join ? Buffer.from(join.toString()).toString('base64') : undefined,
			instance: true,
		};

		return this._state;
	}

	public async disableSpectate() {
		if (!this._state) return;
		const liveshare = await vsls.getApi();
		if (!liveshare) return;
		await liveshare.end();

		delete this._state.spectateSecret;
		this._state.instance = false;

		return this._state;
	}

	public async allowJoinRequests() {
		if (!this._state) return;
		const liveshare = await vsls.getApi();
		if (!liveshare) return;
		const join = await liveshare.share({ suppressNotification: true });
		this._state = {
			...this._state,
			partyId: join ? join.query : undefined,
			partySize: 1,
			partyMax: 5,
			joinSecret: join ? Buffer.from(join.toString()).toString('base64') : undefined,
			instance: true,
		};

		return this._state;
	}

	public async disableJoinRequests() {
		if (!this._state) return;
		const liveshare = await vsls.getApi();
		if (!liveshare) return;
		await liveshare.end();

		delete this._state.partyId;
		delete this._state.partySize;
		delete this._state.partyMax;
		delete this._state.joinSecret;
		this._state.instance = false;

		return this._state;
	}

	public changePartyId(id?: string) {
		if (!this._state) return;
		if (!id) {
			delete this._state.partyId;
			delete this._state.partySize;
			delete this._state.partyMax;
			this._state.instance = false;

			return this._state;
		}
		this._state = {
			...this._state,
			partyId: id,
			partySize: this._state.partySize ? this._state.partySize + 1 : 1,
			partyMax: 5,
			instance: true,
		};

		return this._state;
	}

	public increasePartySize(size?: number) {
		if (!this._state) return;
		if (this._state.partySize === 5) return;
		this._state = {
			...this._state,
			partySize: this._state.partySize ? this._state.partySize + 1 : size,
		};

		return this._state;
	}

	public decreasePartySize(size?: number) {
		if (!this._state) return;
		if (this._state.partySize === 1) return;
		this._state = {
			...this._state,
			partySize: this._state.partySize ? this._state.partySize - 1 : size,
		};

		return this._state;
	}

	public dispose() {
		this._state = null;
		this.lastKnownFile = '';
	}

	private async _generateDetails(debugging: string, editing: string, idling: string, largeImageKey: any) {
		let raw = this.client.config.get<string>(idling)!.replace('{null}', empty);
		let filename = null;
		let dirname = null;
		let checkState = false;
		let workspaceName = null;
		let workspaceFolder = null;
		let fullDirname = null;
		if (window.activeTextEditor) {
			filename = basename(window.activeTextEditor.document.fileName);

			const { dir } = parse(window.activeTextEditor.document.fileName);
			const split = dir.split(sep);
			dirname = split[split.length - 1];

			checkState = Boolean(workspace.getWorkspaceFolder(window.activeTextEditor.document.uri));
			workspaceName = workspace.name;
			workspaceFolder = checkState ? workspace.getWorkspaceFolder(window.activeTextEditor.document.uri) : null;

			if (workspaceFolder) {
				const { name } = workspaceFolder;
				const relativePath = workspace.asRelativePath(window.activeTextEditor.document.fileName).split(sep);
				relativePath.splice(-1, 1);
				fullDirname = `${name}${sep}${relativePath.join(sep)}`;
			}

			if (debug.activeDebugSession) {
				raw = this.client.config.get<string>(debugging)!;
			} else {
				raw = this.client.config.get<string>(editing)!;
			}

			const { totalLines, size, currentLine, currentColumn, gitbranch, gitreponame } = await this._generateFileDetails(
				raw,
			);
			raw = raw
				.replace('{null}', empty)
				.replace('{filename}', filename)
				.replace('{dirname}', dirname)
				.replace('{fulldirname}', fullDirname!)
				.replace(
					'{workspaceRaw}',
					workspaceName
						? workspaceName
						: checkState && workspaceFolder
						? workspaceFolder.name
						: this.client.config.get<string>('lowerDetailsNotFound')!.replace(`{null}`, empty),
				)
				.replace(
					'{workspace}',
					workspaceName
						? workspaceName.replace('(Workspace)', empty)
						: checkState && workspaceFolder
						? workspaceFolder.name
						: this.client.config.get<string>('lowerDetailsNotFound')!.replace('{null}', empty),
				)
				.replace(
					'{workspaceFolder}',
					checkState && workspaceFolder
						? workspaceFolder.name
						: this.client.config.get<string>('lowerDetailsNotFound')!.replace('{null}', empty),
				)
				.replace(
					'{workspaceAndFolderRaw}',
					checkState && workspaceName && workspaceFolder
						? `${workspaceName} - ${workspaceFolder.name}`
						: this.client.config.get<string>('lowerDetailsNotFound')!.replace('{null}', empty),
				)
				.replace(
					'{workspaceAndFolder}',
					checkState && workspaceName && workspaceFolder
						? `${workspaceName.replace('(Workspace)', empty)} - ${workspaceFolder.name}`
						: this.client.config.get<string>('lowerDetailsNotFound')!.replace('{null}', empty),
				)
				.replace('{lang}', largeImageKey ? largeImageKey.image || largeImageKey : 'txt')
				.replace(
					'{Lang}',
					largeImageKey
						? (largeImageKey.image || largeImageKey).toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())
						: 'Txt',
				)
				.replace('{LANG}', largeImageKey ? (largeImageKey.image || largeImageKey).toUpperCase() : 'TXT');
			if (totalLines) raw = raw.replace('{totallines}', totalLines);
			if (size) raw = raw.replace('{filesize}', size);
			if (currentLine) raw = raw.replace('{currentline}', currentLine);
			if (currentColumn) raw = raw.replace('{currentcolumn}', currentColumn);
			if (gitbranch) raw = raw.replace('{gitbranch}', gitbranch);
			if (gitreponame) raw = raw.replace('{gitreponame}', gitreponame);
		}

		return raw;
	}

	private async _generateFileDetails(str?: string) {
		const fileDetail: FileDetail = {};
		if (!str) return fileDetail;

		if (window.activeTextEditor) {
			if (str.includes('{totallines}')) {
				fileDetail.totalLines = window.activeTextEditor.document.lineCount.toLocaleString();
			}

			if (str.includes('{currentline}')) {
				fileDetail.currentLine = (window.activeTextEditor.selection.active.line + 1).toLocaleString();
			}

			if (str.includes('{currentcolumn}')) {
				fileDetail.currentColumn = (window.activeTextEditor.selection.active.character + 1).toLocaleString();
			}

			if (str.includes('{filesize}')) {
				let currentDivision = 0;
				let { size } = await workspace.fs.stat(window.activeTextEditor.document.uri);
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

			if (str.includes('{gitbranch}')) {
				if (this.client.git?.repositories.length) {
					fileDetail.gitbranch = this.client.git.repositories.find((repo) => repo.ui.selected)!.state.HEAD!.name;
				} else {
					fileDetail.gitbranch = 'Unknown';
				}
			}

			if (str.includes('{gitreponame}')) {
				if (this.client.git?.repositories.length) {
					fileDetail.gitreponame = this.client.git.repositories
						.find((repo) => repo.ui.selected)!
						.state.remotes[0].fetchUrl!.split('/')[1]
						.replace('.git', '');
				} else {
					fileDetail.gitreponame = 'Unknown';
				}
			}
		}

		return fileDetail;
	}
}
