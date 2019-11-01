const { Client } = require('discord-rpc'); // eslint-disable-line
import { Disposable, StatusBarItem, Uri, window, workspace } from 'vscode';
import * as vsls from 'vsls';
import Activity from '../structures/Activity';
import Logger from '../structures/Logger';
import { API } from '../git';
const clipboardy = require('clipboardy'); // eslint-disable-line

let activityTimer: NodeJS.Timer;

export default class RPCClient implements Disposable {
	public statusBarIcon: StatusBarItem;

	public config = workspace.getConfiguration('discord');

	public git!: API;

	private _rpc: any;

	private readonly _activity = new Activity(this);

	private readonly _clientId: string;

	public constructor(clientId: string, statusBarIcon: StatusBarItem) {
		this._clientId = clientId;
		this.statusBarIcon = statusBarIcon;
	}

	public get client() {
		return this._rpc;
	}

	public async setActivity(workspaceElapsedTime = false) {
		if (!this._rpc) return;
		const activity = await this._activity.generate(workspaceElapsedTime);
		if (!activity) return;
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
		this._rpc.once('ready', async () => {
			Logger.log('Successfully connected to Discord.');
			this.statusBarIcon.text = '$(globe) Connected to Discord';
			this.statusBarIcon.tooltip = 'Connected to Discord';

			// @ts-ignore
			setTimeout(() => (this.statusBarIcon.text = '$(globe)'), 5000);

			if (activityTimer) clearInterval(activityTimer);
			await this.setActivity(this.config.get<boolean>('workspaceElapsedTime'));

			activityTimer = setInterval(async () => {
				this.config = workspace.getConfiguration('discord');
				await this.setActivity(this.config.get<boolean>('workspaceElapsedTime'));
			}, 10000);

			this._rpc.subscribe('ACTIVITY_SPECTATE', async ({ secret }: { secret: string }) => {
				const liveshare = await vsls.getApi();
				if (!liveshare) return;
				try {
					const s = Buffer.from(secret, 'base64').toString();
					// You might be asking yourself: "but why?"
					// VS Liveshare has this annoying bug where you convert a URL string to a URI object to autofill
					// But the autofill will be empty, so to circumvent this I need to add copying the link to the clipboard
					// And immediately pasting it after the window pops up empty
					await clipboardy.write(s);
					await liveshare.join(Uri.parse(s));
					await clipboardy.read();
				} catch (error) {
					Logger.log(error);
				}
			});

			// You might be asking yourself again: "but why?"
			// Same here, this is a real nasty race condition that happens inside the discord-rpc module currently
			// To circumvent this we need to timeout sending the subscribe events to the discord client
			setTimeout(() => {
				this._rpc.subscribe(
					'ACTIVITY_JOIN_REQUEST',
					async ({ user }: { user: { username: string; discriminator: string } }) => {
						const val = await window.showInformationMessage(
							`${user.username}#${user.discriminator} wants to join your session`,
							{ title: 'Accept' },
							{ title: 'Decline' },
						);
						if (val && val.title === 'Accept') await this._rpc.sendJoinInvite(user);
						else await this._rpc.closeJoinRequest(user);
					},
				);
			}, 1000);
			setTimeout(() => {
				this._rpc.subscribe('ACTIVITY_JOIN', async ({ secret }: { secret: string }) => {
					const liveshare = await vsls.getApi();
					if (!liveshare) return;
					try {
						const s = Buffer.from(secret, 'base64').toString();
						// You might be asking yourself again again: "but why?"
						// See first comment on clipboardy above
						await clipboardy.write(s);
						await liveshare.join(Uri.parse(s));
						await clipboardy.read();
					} catch (error) {
						Logger.log(error);
					}
				});
			}, 2000);

			const liveshare = await vsls.getApi();
			if (!liveshare) return;
			liveshare.onDidChangeSession(({ session }) => {
				if (session.id) return this._activity.changePartyId(session.id);
				return this._activity.changePartyId();
			});
			liveshare.onDidChangePeers(({ added, removed }) => {
				if (added.length) return this._activity.increasePartySize(added.length);
				else if (removed.length) return this._activity.decreasePartySize(removed.length);
			});
		});

		this._rpc.transport.once('close', async () => {
			if (!this.config.get<boolean>('enabled')) return;
			await this.dispose();
			this.statusBarIcon.text = '$(plug) Reconnect to Discord';
			this.statusBarIcon.command = 'discord.reconnect';
			this.statusBarIcon.tooltip = '';
		});

		await this._rpc.login({ clientId: this._clientId });
	}

	public async dispose() {
		this._activity.dispose();
		try {
			if (this._rpc) await this._rpc.destroy();
		} catch {}
		this._rpc = null;
		this.statusBarIcon.tooltip = '';

		clearInterval(activityTimer);
	}
}
