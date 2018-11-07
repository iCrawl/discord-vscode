import RPCClient from './client/RPCClient';
import Logger from './structures/Logger';
import {
	commands,
	ExtensionContext,
	StatusBarItem,
	StatusBarAlignment,
	window,
	workspace
} from 'vscode';
import { setInterval, clearInterval } from 'timers';

let activityTimer: NodeJS.Timer;
let statusBarIcon: StatusBarItem;

const config = workspace.getConfiguration('discord');
const rpc = new RPCClient(config.get<string>('clientID')!);

export async function activate(context: ExtensionContext) {
	Logger.log('Discord Presence activated!');
	
	rpc.client.once('ready', () => {
		Logger.log('Successfully connected to Discord.');
		if (!config.get<boolean>('silent')) window.showInformationMessage('Successfully reconnected to Discord RPC');

		if (statusBarIcon) statusBarIcon.dispose();
		if (activityTimer) clearInterval(activityTimer);
		rpc.setActivity();

		rpc.client.transport.once('close', async () => {
			if (!config.get<boolean>('enabled')) return;
			await rpc.dispose();
			await rpc.login();
			if (!statusBarIcon) {
				statusBarIcon = window.createStatusBarItem(StatusBarAlignment.Left);
				statusBarIcon.text = '$(plug) Reconnect to Discord';
				statusBarIcon.command = 'discord.reconnect';
				statusBarIcon.show();
			}
		});

		activityTimer = setInterval(() => {
			rpc.setActivity(config.get<boolean>('workspaceElapsedTime'));
		}, 10000);
	})
	
	if (config.get<boolean>('enabled')) {
		try {
			await rpc.login();
		} catch (error) {
			Logger.log(`Encountered following error after trying to login:\n${error}`);
			if (!config.get('silent')) {
				if (error.message.includes('ENOENT')) window.showErrorMessage('No Discord Client detected!');
				else window.showErrorMessage(`Couldn't connect to Discord via RPC: ${error.toString()}`);
			}
			if (!statusBarIcon) {
				statusBarIcon = window.createStatusBarItem(StatusBarAlignment.Left);
				statusBarIcon.text = '$(plug) Reconnect to Discord';
				statusBarIcon.command = 'discord.reconnect';
				statusBarIcon.show();
			}
		}
	}

	const enabler = commands.registerCommand('discord.enable', async () => {
		await rpc.dispose();
		await config.update('enabled', true);
		await rpc.login();
		window.showInformationMessage('Enabled Discord Rich Presence for this workspace.');
	});

	const disabler = commands.registerCommand('discord.disable', async () => {
		await config.update('enabled', false);
		await rpc.dispose();
		window.showInformationMessage('Disabled Discord Rich Presence for this workspace.');
	});

	const reconnecter = commands.registerCommand('discord.reconnect', async () => {
		await rpc.dispose();
		await rpc.login();
		if (!config.get('silent')) window.showInformationMessage('Reconnecting to Discord RPC...');
		if (statusBarIcon) statusBarIcon.text = '$(pulse) reconnecting...';
	});

	context.subscriptions.push(enabler, disabler, reconnecter);
}

export async function deactivate() {
	clearInterval(activityTimer);
	await rpc.dispose();
}

process.on('unhandledRejection', err => Logger.log(err));
