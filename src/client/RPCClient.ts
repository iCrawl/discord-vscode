const { Client } = require('discord-rpc');
import {
	Disposable,
	StatusBarItem,
	window,
	workspace,
} from 'vscode';
import Activity from '../structures/Activity';
import Logger from '../structures/Logger';

let activityTimer: NodeJS.Timer;

export default class RPCClient implements Disposable {
	statusBarIcon: StatusBarItem;
	_config = workspace.getConfiguration('discord');

	private _rpc: any;

	private _activity = new Activity();

	private _clientID: string;

	constructor(clientID: string, statusBarIcon: StatusBarItem) {
		this._clientID = clientID;
		this.statusBarIcon = statusBarIcon;
	}

	get client() {
		return this._rpc;
	}

	setActivity(workspaceElapsedTime: boolean = false) {
		if (!this._rpc) return;
		const activity = this._activity.generate(workspaceElapsedTime);
		Logger.log('Sending activity to Discord.');
		this._rpc.setActivity(activity);
	}

	async login() {
		if (this._rpc) return;
		this._rpc = new Client({ transport: 'ipc' });
		Logger.log('Logging into RPC.');
		this._rpc.once('ready', () => {
			Logger.log('Successfully connected to Discord.');
			if (!this._config.get<boolean>('silent')) window.showInformationMessage('Successfully connected to Discord RPC');

			this.statusBarIcon.hide();

			this.statusBarIcon.text = '$(plug) Reconnect to Discord';
			this.statusBarIcon.command = 'discord.reconnect';

			if (activityTimer) clearInterval(activityTimer);
			this.setActivity();

			this._rpc.transport.once('close', async () => {
				if (!this._config.get<boolean>('enabled')) return;
				await this.dispose();
				this.statusBarIcon.show();
			});

			activityTimer = setInterval(() => {
				this._config = workspace.getConfiguration('discord');
				this.setActivity(this._config.get<boolean>('workspaceElapsedTime'));
			}, 10000);
		});
		await this._rpc.login({ clientId: this._clientID });
	}

	async dispose() {
		this._activity.dispose();
		if (this._rpc) {
			await this._rpc.destroy();
			this._rpc = null;
		}
		clearInterval(activityTimer);
	}
}
