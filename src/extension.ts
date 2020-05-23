import { commands, ExtensionContext, StatusBarAlignment, StatusBarItem, window, workspace, extensions } from 'vscode';
import RPCClient from './client/RPCClient';
import Logger from './structures/Logger';
import { GitExtension } from './git';
const { register } = require('discord-rpc'); // eslint-disable-line

let loginTimeout: NodeJS.Timer | undefined;

const statusBarIcon: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
statusBarIcon.text = '$(pulse) Connecting to Discord...';

const config = workspace.getConfiguration('discord');
register(config.get<string>('clientID')!);
const rpc = new RPCClient(config.get<string>('clientID')!, statusBarIcon);

export async function activate(context: ExtensionContext) {
	Logger.log('Discord Presence activated!');

	let isWorkspaceExcluded = false;
	const excludePatterns = config.get<string[]>('workspaceExcludePatterns');
	if (excludePatterns?.length) {
		for (const pattern of excludePatterns) {
			const regex = new RegExp(pattern);
			const folders = workspace.workspaceFolders;
			if (!folders) break;
			if (folders.some((folder) => regex.test(folder.uri.fsPath))) {
				isWorkspaceExcluded = true;
				break;
			}
		}
	}

	const enabler = commands.registerCommand('discord.enable', async () => {
		await rpc.dispose();
		void config.update('enabled', true);
		rpc.config = workspace.getConfiguration('discord');
		rpc.statusBarIcon.text = '$(pulse) Connecting to Discord...';
		rpc.statusBarIcon.show();
		await rpc.login();
		void window.showInformationMessage('Enabled Discord Rich Presence for this workspace.');
	});

	const disabler = commands.registerCommand('discord.disable', async () => {
		void config.update('enabled', false);
		rpc.config = workspace.getConfiguration('discord');
		await rpc.dispose();
		rpc.statusBarIcon.hide();
		void window.showInformationMessage('Disabled Discord Rich Presence for this workspace.');
	});

	const reconnecter = commands.registerCommand('discord.reconnect', async () => {
		if (loginTimeout) clearTimeout(loginTimeout);
		await rpc.dispose();
		loginTimeout = setTimeout(() => {
			void rpc.login();
			if (!config.get('silent')) void window.showInformationMessage('Reconnecting to Discord RPC...');
			rpc.statusBarIcon.text = '$(pulse) Reconnecting to Discord...';
			rpc.statusBarIcon.command = 'discord.reconnect';
		}, 1000);
	});

	const disconnect = commands.registerCommand('discord.disconnect', async () => {
		await rpc.dispose();
		rpc.statusBarIcon.text = '$(pulse) Reconnect to Discord';
		rpc.statusBarIcon.command = 'discord.reconnect';
	});

	const allowSpectate = commands.registerCommand('discord.allowSpectate', async () => {
		await rpc.allowSpectate();
	});

	const disableSpectate = commands.registerCommand('discord.disableSpectate', async () => {
		await rpc.disableSpectate();
	});

	const allowJoinRequests = commands.registerCommand('discord.allowJoinRequests', async () => {
		await rpc.allowJoinRequests();
	});

	const disableJoinRequests = commands.registerCommand('discord.disableJoinRequests', async () => {
		await rpc.disableJoinRequests();
	});

	context.subscriptions.push(
		enabler,
		disabler,
		reconnecter,
		disconnect,
		allowSpectate,
		disableSpectate,
		allowJoinRequests,
		disableJoinRequests,
	);

	setTimeout(() => {
		const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
		if (gitExtension) {
			if (gitExtension.isActive) {
				rpc.git = gitExtension.exports.getAPI(1);
			}
		}
	}, 5000);

	if (!isWorkspaceExcluded && config.get<boolean>('enabled')) {
		statusBarIcon.show();
		try {
			await rpc.login();
		} catch (error) {
			Logger.log(`Encountered following error after trying to login:\n${error as string}`);
			await rpc.dispose();
			if (!config.get('silent')) {
				if (error.message.includes('ENOENT')) void window.showErrorMessage('No Discord Client detected!');
				else void window.showErrorMessage(`Couldn't connect to Discord via RPC: ${error as string}`);
			}
			rpc.statusBarIcon.text = '$(pulse) Reconnect to Discord';
			rpc.statusBarIcon.command = 'discord.reconnect';
		}
	}
}

export async function deactivate() {
	await rpc.dispose();
}

process.on('unhandledRejection', (err) => Logger.log(err as string));
