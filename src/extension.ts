import { commands, ExtensionContext, StatusBarAlignment, StatusBarItem, window, workspace, extensions } from 'vscode';
import RPCClient from './client/RPCClient';
import Logger from './structures/Logger';
import { GitExtension } from './git';
const { register } = require('discord-rpc'); // eslint-disable-line

let loginTimeout: NodeJS.Timer | undefined;

const statusBarIcon: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
statusBarIcon.text = '$(pulse) Connecting to Discord...';

const config = workspace.getConfiguration('discord');
const clientId = config.get<string>('clientID') ?? '383226320970055681';
register(clientId);
const rpc = new RPCClient(clientId, statusBarIcon);

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

	const enabler = commands.registerCommand('discord.enable', () => {
		rpc.dispose();
		void config.update('enabled', true);
		rpc.config = workspace.getConfiguration('discord');
		rpc.statusBarIcon.text = '$(pulse) Connecting to Discord...';
		rpc.statusBarIcon.show();
		void rpc.login();
		void window.showInformationMessage('Enabled Discord Rich Presence for this workspace.');
	});
	const disabler = commands.registerCommand('discord.disable', () => {
		void config.update('enabled', false);
		rpc.config = workspace.getConfiguration('discord');
		rpc.dispose();
		rpc.statusBarIcon.hide();
		void window.showInformationMessage('Disabled Discord Rich Presence for this workspace.');
	});
	const reconnecter = commands.registerCommand('discord.reconnect', () => {
		if (loginTimeout) clearTimeout(loginTimeout);
		rpc.dispose();
		loginTimeout = setTimeout(() => {
			void rpc.login();
			if (!config.get('silent')) void window.showInformationMessage('Reconnecting to Discord RPC...');
			rpc.statusBarIcon.text = '$(pulse) Reconnecting to Discord...';
			rpc.statusBarIcon.command = 'discord.reconnect';
		}, 1000);
	});
	const disconnect = commands.registerCommand('discord.disconnect', () => {
		rpc.dispose();
		rpc.statusBarIcon.text = '$(pulse) Reconnect to Discord';
		rpc.statusBarIcon.command = 'discord.reconnect';
	});
	const allowSpectate = commands.registerCommand('discord.allowSpectate', () => rpc.allowSpectate());
	const disableSpectate = commands.registerCommand('discord.disableSpectate', () => rpc.disableSpectate());
	const allowJoinRequests = commands.registerCommand('discord.allowJoinRequests', () => rpc.allowJoinRequests());
	const disableJoinRequests = commands.registerCommand('discord.disableJoinRequests', () => rpc.disableJoinRequests());

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

	if (!isWorkspaceExcluded && config.get<boolean>('enabled')) {
		statusBarIcon.show();
		try {
			await rpc.login();
		} catch (error) {
			Logger.log(`Encountered following error after trying to login:\n${error as string}`);
			rpc.dispose();
			if (!config.get('silent')) {
				if (error?.message?.includes('ENOENT')) void window.showErrorMessage('No Discord Client detected!');
				else void window.showErrorMessage(`Couldn't connect to Discord via RPC: ${error as string}`);
			}
			rpc.statusBarIcon.text = '$(pulse) Reconnect to Discord';
			rpc.statusBarIcon.command = 'discord.reconnect';
		}
	}

	const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
	if (gitExtension) {
		if (gitExtension.isActive) {
			rpc.git = gitExtension.exports.getAPI(1);
		} else {
			const extension = await gitExtension.activate();
			rpc.git = extension.getAPI(1);
		}
	}
}

export function deactivate() {
	rpc.dispose();
}

process.on('unhandledRejection', (err) => Logger.log(err as string));
