const { Client } = require('discord-rpc'); // tslint:disable-line
import {
	Disposable,
	StatusBarItem,
	workspace,
	Uri
} from 'vscode'; // tslint:disable-line
import * as vsls from 'vsls/vscode';
import Activity from '../structures/Activity';
import Logger from '../structures/Logger';

let activityTimer: NodeJS.Timer;

export default class RPCClient implements Disposable {
	public statusBarIcon: StatusBarItem;

	public config = workspace.getConfiguration('discord');

	private _rpc: any; // tslint:disable-line

	private readonly _activity = new Activity(); // tslint:disable-line

	private readonly _clientId: string; // tslint:disable-line

	public constructor(clientId: string, statusBarIcon: StatusBarItem) {
		this._clientId = clientId;
		this.statusBarIcon = statusBarIcon;
	}

	public get client() {
		return this._rpc;
	}

	public setActivity(workspaceElapsedTime: boolean = false) {
		if (!this._rpc) return;
		const activity = this._activity.generate(workspaceElapsedTime);
		Logger.log('Sending activity to Discord.');
		this._rpc.setActivity(activity);
	}

	public async login() {
		if (this._rpc) return;
		this._rpc = new Client({ transport: 'ipc' });
		Logger.log('Logging into RPC.');
		this._rpc.once('ready', () => {
			Logger.log('Successfully connected to Discord.');
			this.statusBarIcon.text = '$(globe) Connected to Discord';
			this.statusBarIcon.tooltip = 'Connected to Discord';

			setTimeout(() => this.statusBarIcon.text = '$(globe)', 5000);

			if (activityTimer) clearInterval(activityTimer);
			this.setActivity();

			this._rpc.transport.once('close', async () => {
				if (!this.config.get<boolean>('enabled')) return;
				await this.dispose();
				this.statusBarIcon.text = '$(plug) Reconnect to Discord';
				this.statusBarIcon.command = 'discord.reconnect';
			});

			activityTimer = setInterval(() => {
				this.config = workspace.getConfiguration('discord');
				this.setActivity(this.config.get<boolean>('workspaceElapsedTime'));
			}, 10000);

			this._rpc.subscribe('ACTIVITY_SPECTATE', async ({ secret }: { secret: any }) => {
				console.log('should spectate game with secret:', secret);
				const liveshare = await vsls.getApi();
				if (!liveshare) return;
				try {
					await liveshare.join(Uri.parse(secret));
				} catch (error) {
					Logger.log(error);
				}
			});
		});
		await this._rpc.login({ clientId: this._clientId });
	}

	public async dispose() {
		this._activity.dispose();
		if (this._rpc) {
			await this._rpc.destroy();
			this._rpc = null;
		}
		clearInterval(activityTimer);
		this.statusBarIcon.hide();
	}
}
