const { Client } = require('discord-rpc'); // eslint-disable-line
import {
	commands,
	ExtensionContext,
	StatusBarAlignment,
	StatusBarItem,
	window,
	workspace,
	extensions,
	debug,
} from 'vscode';
import throttle from 'lodash-es/throttle';

import { activity } from './activity';
import { CLIENT_ID, CONFIG_KEYS } from './constants';
import { GitExtension } from './git';
import { log, LogLevel } from './logger';
import { getConfig } from './util';

const statusBarIcon: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
statusBarIcon.text = '$(pulse) Connecting to Discord...';

const rpc = new Client({ transport: 'ipc' });
const config = getConfig();

let state = {};

async function sendActivity() {
	state = {
		...(await activity(state)),
	};
	rpc.setActivity(state);
}

async function login(context: ExtensionContext) {
	rpc.once('ready', () => {
		log(LogLevel.Info, 'Successfully connected to Discord');

		statusBarIcon.text = '$(globe) Connected to Discord';
		statusBarIcon.tooltip = 'Connected to Discord';

		const onChangeActiveTextEditor = window.onDidChangeActiveTextEditor(() => sendActivity());
		const onChangeTextDocument = workspace.onDidChangeTextDocument(throttle(() => sendActivity(), 1000));
		const onStartDebugSession = debug.onDidStartDebugSession(() => sendActivity());
		const onTerminateDebugSession = debug.onDidTerminateDebugSession(() => sendActivity());

		context.subscriptions.push(
			onChangeActiveTextEditor,
			onChangeTextDocument,
			onStartDebugSession,
			onTerminateDebugSession,
		);
	});

	try {
		await rpc.login({ clientId: CLIENT_ID });
	} catch (error) {
		log(LogLevel.Error, `Encountered following error while trying to login:\n${error as string}`);
		rpc.dispose();
		if (!config[CONFIG_KEYS.SuppressNotifications]) {
			if (error?.message?.includes('ENOENT')) void window.showErrorMessage('No Discord client detected');
			else void window.showErrorMessage(`Couldn't connect to Discord via RPC: ${error as string}`);
		}
		rpc.statusBarIcon.text = '$(pulse) Reconnect to Discord';
		rpc.statusBarIcon.command = 'discord.reconnect';
	}
}

export function activate(context: ExtensionContext) {
	log(LogLevel.Info, 'Discord Presence activated');

	let isWorkspaceExcluded = false;
	for (const pattern of config[CONFIG_KEYS.WorkspaceExcludePatterns]) {
		const regex = new RegExp(pattern);
		const folders = workspace.workspaceFolders;
		if (!folders) break;
		if (folders.some((folder) => regex.test(folder.uri.fsPath))) {
			isWorkspaceExcluded = true;
			break;
		}
	}

	const enabler = commands.registerCommand('discord.enable', () => {
		rpc.destroy();
		void config.update('enabled', true);
		statusBarIcon.text = '$(pulse) Connecting to Discord...';
		statusBarIcon.show();
		void login(context);
		void window.showInformationMessage('Enabled Discord Presence for this workspace');
	});

	const disabler = commands.registerCommand('discord.disable', () => {
		void config.update('enabled', false);
		rpc.destroy();
		rpc.statusBarIcon.hide();
		void window.showInformationMessage('Disabled Discord Presence for this workspace');
	});

	const reconnecter = commands.registerCommand('discord.reconnect', () => {
		deactivate();
		void activate(context);
	});

	const disconnect = commands.registerCommand('discord.disconnect', () => {
		rpc.destroy();
		rpc.statusBarIcon.text = '$(pulse) Reconnect to Discord';
		rpc.statusBarIcon.command = 'discord.reconnect';
	});

	context.subscriptions.push(enabler, disabler, reconnecter, disconnect);

	if (!isWorkspaceExcluded && config[CONFIG_KEYS.Enabled]) {
		statusBarIcon.show();
		void login(context);
	}

	const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
	void gitExtension?.activate();
}

export function deactivate() {
	rpc.destroy();
}
