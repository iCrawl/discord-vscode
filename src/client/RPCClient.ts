const { Client } = require('discord-rpc'); // eslint-disable-line
import { Disposable, StatusBarItem, Uri, window, workspace, env } from 'vscode';
import * as vsls from 'vsls';
import Activity from '../structures/Activity';
import Logger from '../structures/Logger';
import { API } from '../git';

let activityTimer: NodeJS.Timer | undefined;

export default class RPCClient implements Disposable {
	public config = workspace.getConfiguration('discord');

	public git?: API;

	private rpc: any;

	private readonly activity = new Activity(this);

	public constructor(private readonly clientId: string, public statusBarIcon: StatusBarItem) {}

	public get client() {
		return this.rpc;
	}

	public async setActivity(workspaceElapsedTime = false) {
		if (!this.rpc) return;
		const activity = await this.activity.generate(workspaceElapsedTime);
		if (!activity) return;
		Logger.log('Sending activity to Discord.');
		this.rpc.setActivity(activity);
	}

	public allowSpectate() {
		if (!this.rpc) return;
		Logger.log('Allowed spectating.');
		Logger.log('Sending spectate activity to Discord.');
		void this.activity.allowSpectate();
	}

	public disableSpectate() {
		if (!this.rpc) return;
		Logger.log('Disabled spectating.');
		void this.activity.disableSpectate();
	}

	public allowJoinRequests() {
		if (!this.rpc) return;
		Logger.log('Allowed join requests.');
		Logger.log('Sending join activity to Discord.');
		void this.activity.allowJoinRequests();
	}

	public disableJoinRequests() {
		if (!this.rpc) return;
		Logger.log('Disabled join requests.');
		void this.activity.disableJoinRequests();
	}

	public async login() {
		if (this.rpc) {
			this.dispose();
		}
		this.rpc = new Client({ transport: 'ipc' });

		Logger.log('Logging into RPC...');

		this.rpc.transport.once('close', () => {
			if (!this.config.get<boolean>('enabled')) return;
			void this.dispose();
			this.statusBarIcon.text = '$(plug) Reconnect to Discord';
			this.statusBarIcon.command = 'discord.reconnect';
			this.statusBarIcon.tooltip = '';
		});

		this.rpc.once('ready', async () => {
			Logger.log('Successfully connected to Discord.');

			this.statusBarIcon.text = '$(globe) Connected to Discord';
			this.statusBarIcon.tooltip = 'Connected to Discord';

			setTimeout(() => (this.statusBarIcon.text = '$(globe)'), 5000);

			if (activityTimer) clearInterval(activityTimer);
			void this.setActivity(this.config.get<boolean>('workspaceElapsedTime'));

			activityTimer = setInterval(() => {
				this.config = workspace.getConfiguration('discord');
				void this.setActivity(this.config.get<boolean>('workspaceElapsedTime'));
			}, 1000);

			this.rpc.subscribe('ACTIVITY_SPECTATE', async ({ secret }: { secret: string }) => {
				const liveshare = await vsls.getApi();
				if (!liveshare) return;
				try {
					const s = Buffer.from(secret, 'base64').toString();
					// You might be asking yourself: "but why?"
					// VS Liveshare has this annoying bug where you convert a URL string to a URI object to autofill
					// But the autofill will be empty, so to circumvent this I need to add copying the link to the clipboard
					// And immediately pasting it after the window pops up empty
					await env.clipboard.writeText(s);
					const uriString = await env.clipboard.readText();
					const uri = Uri.parse(uriString);
					await liveshare.join(uri);
				} catch (error) {
					Logger.log(error);
				}
			});

			// You might be asking yourself again: "but why?"
			// Same here, this is a real nasty race condition that happens inside the discord-rpc module currently
			// To circumvent this we need to timeout sending the subscribe events to the discord client
			setTimeout(() => {
				this.rpc.subscribe(
					'ACTIVITY_JOIN_REQUEST',
					async ({ user }: { user: { username: string; discriminator: string } }) => {
						const val = await window.showInformationMessage(
							`${user.username}#${user.discriminator} wants to join your session`,
							{ title: 'Accept' },
							{ title: 'Decline' },
						);
						if (val && val.title === 'Accept') await this.rpc.sendJoinInvite(user);
						else await this.rpc.closeJoinRequest(user);
					},
				);
			}, 1000);
			setTimeout(() => {
				this.rpc.subscribe('ACTIVITY_JOIN', async ({ secret }: { secret: string }) => {
					const liveshare = await vsls.getApi();
					if (!liveshare) return;
					try {
						const s = Buffer.from(secret, 'base64').toString();
						// You might be asking yourself again again: "but why?"
						// See first comment above
						await env.clipboard.writeText(s);
						const uriString = await env.clipboard.readText();
						const uri = Uri.parse(uriString);
						await liveshare.join(uri);
					} catch (error) {
						Logger.log(error);
					}
				});
			}, 2000);

			const liveshare = await vsls.getApi();
			if (!liveshare) return;

			liveshare.onDidChangeSession(({ session }) => {
				if (session.id) return this.activity.changePartyId(session.id);
				return this.activity.changePartyId();
			});
			liveshare.onDidChangePeers(({ added, removed }) => {
				if (added.length) return this.activity.increasePartySize(added.length);
				else if (removed.length) return this.activity.decreasePartySize(removed.length);
			});
		});

		try {
			await this.rpc.login({ clientId: this.clientId });
		} catch (error) {
			throw error;
		}
	}

	public dispose() {
		this.activity.dispose();
		if (this.rpc) this.rpc.destroy();
		this.rpc = null;
		this.statusBarIcon.tooltip = '';

		if (activityTimer) clearInterval(activityTimer);
	}
}
