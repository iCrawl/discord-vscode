const { Client } = require('discord-rpc'); // tslint:disable-line
import {
	Disposable,
	StatusBarItem,
	workspace,
	Uri,
	window
} from 'vscode'; // tslint:disable-line
import * as vsls from 'vsls/vscode';
import Activity from '../structures/Activity';
import Logger from '../structures/Logger';
const clipboardy = require('clipboardy');

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

	public async allowSpectate() {
		if (!this._rpc) return;
		Logger.log('Allowed spectating.');
		Logger.log('Sending spectate activity to Discord.');
		await this._activity.allowSpectate();
	}

	public async disableSpectate() {
		if (!this._rpc) return;
		Logger.log('Disabled spectating.');
		await this._activity.disableSpectate();
	}

	public async allowJoinRequests() {
		if (!this._rpc) return;
		Logger.log('Allowed join requests.');
		Logger.log('Sending join activity to Discord.');
		await this._activity.allowJoinRequests();
	}

	public async disableJoinRequests() {
		if (!this._rpc) return;
		Logger.log('Disabled join requests.');
		await this._activity.disableJoinRequests();
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

			this._rpc.subscribe('ACTIVITY_SPECTATE', async ({ secret }: { secret: string }) => {
				const liveshare = await vsls.getApi();
				if (!liveshare) return;
				try {
					await clipboardy.write(secret);
					await liveshare.join(Uri.parse(secret));
					await clipboardy.read();
				} catch (error) {
					Logger.log(error);
				}
			});
			setTimeout(() => {
				this._rpc.subscribe('ACTIVITY_JOIN_REQUEST', async ({ user }: { user: { username: string, discriminator: string } }) => {
					window.showInformationMessage(`${user.username}#${user.discriminator} wants to join your session`, { title: 'Accept' }, { title: 'Decline' })
						.then(async val => {
							if (val && val.title === 'Accept') await this._rpc.sendJoinInvite(user);
							else await this._rpc.closeJoinRequest(user);
						});
				});
			}, 500);
			setTimeout(() => {
				this._rpc.subscribe('ACTIVITY_JOIN', async ({ secret }: { secret: string }) => {
					const liveshare = await vsls.getApi();
					if (!liveshare) return;
					try {
						await clipboardy.write(secret);
						await liveshare.join(Uri.parse(secret));
						await clipboardy.read();
					} catch (error) {
						Logger.log(error);
					}
				});
			}, 1000);
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
