import {
	commands,
	ExtensionContext,
	StatusBarAlignment,
	StatusBarItem,
	window,
	workspace
} from 'vscode';
import RPCClient from './client/RPCClient';
import Logger from './structures/Logger';

const statusBarIcon: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
statusBarIcon.text = '$(pulse) Connecting...';
statusBarIcon.command = 'discord.reconnect';

const config = workspace.getConfiguration('discord');
const rpc = new RPCClient(config.get<string>('clientID')!, statusBarIcon);

export async function activate(context: ExtensionContext) {
	Logger.log('Discord Presence activated!');

	if (config.get<boolean>('enabled')) {
		statusBarIcon.show();
		try {
			await rpc.login();
		} catch (error) {
			Logger.log(`Encountered following error after trying to login:\n${error}`);
			if (!config.get('silent')) {
				if (error.message.includes('ENOENT')) window.showErrorMessage('No Discord Client detected!');
				else window.showErrorMessage(`Couldn't connect to Discord via RPC: ${error.toString()}`);
			}
			rpc.statusBarIcon.text = '$(pulse) Reconnect';
			rpc.statusBarIcon.command = 'discord.reconnect';
			rpc.statusBarIcon.show();
		}
	}

	const enabler = commands.registerCommand('discord.enable', async () => {
		await rpc.dispose();
		await config.update('enabled', true);
		rpc._config = workspace.getConfiguration('discord');
		rpc.statusBarIcon.text = '$(pulse) Connecting...';
		rpc.statusBarIcon.show();
		await rpc.login();
		window.showInformationMessage('Enabled Discord Rich Presence for this workspace.');
	});

	const disabler = commands.registerCommand('discord.disable', async () => {
		await config.update('enabled', false);
		rpc._config = workspace.getConfiguration('discord');
		await rpc.dispose();
		window.showInformationMessage('Disabled Discord Rich Presence for this workspace.');
	});

	const reconnecter = commands.registerCommand('discord.reconnect', async () => {
		await rpc.dispose();
		await rpc.login();
		if (!config.get('silent')) window.showInformationMessage('Reconnecting to Discord RPC...');
		rpc.statusBarIcon.text = '$(pulse) Reconnecting...';
		rpc.statusBarIcon.command = undefined;
	});

	context.subscriptions.push(enabler, disabler, reconnecter);
}

export async function deactivate() {
	await rpc.dispose();
}

process.on('unhandledRejection', err => Logger.log(err));
