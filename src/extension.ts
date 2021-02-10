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
let interval: NodeJS.Timeout;
let listeners: { dispose(): any }[] = [];

export function cleanUp() {
	listeners.forEach((listener) => listener.dispose());
	listeners = [];
	clearInterval(interval);
}

async function sendActivity() {
	state = {
		...(await activity(state)),
	};
	rpc.setActivity(state);
}

async function login() {
	rpc.once('ready', () => {
		log(LogLevel.Info, 'Successfully connected to Discord');

		statusBarIcon.text = '$(globe) Connected to Discord';
		statusBarIcon.tooltip = 'Connected to Discord';

		void sendActivity();
		interval = setInterval(() => void sendActivity(), 5000);
		const onChangeActiveTextEditor = window.onDidChangeActiveTextEditor(() => sendActivity());
		const onChangeTextDocument = workspace.onDidChangeTextDocument(throttle(() => sendActivity(), 1000));
		const onStartDebugSession = debug.onDidStartDebugSession(() => sendActivity());
		const onTerminateDebugSession = debug.onDidTerminateDebugSession(() => sendActivity());

		listeners.push(onChangeActiveTextEditor, onChangeTextDocument, onStartDebugSession, onTerminateDebugSession);
	});

	try {
		await rpc.login({ clientId: CLIENT_ID });
	} catch (error) {
		log(LogLevel.Error, `Encountered following error while trying to login:\n${error as string}`);
		cleanUp();
		await rpc.destroy();
		if (!config[CONFIG_KEYS.SuppressNotifications]) {
			if (error?.message?.includes('ENOENT')) void window.showErrorMessage('No Discord client detected');
			else void window.showErrorMessage(`Couldn't connect to Discord via RPC: ${error as string}`);
		}
		statusBarIcon.text = '$(pulse) Reconnect to Discord';
		statusBarIcon.command = 'discord.reconnect';
	}
}

export async function activate(context: ExtensionContext) {
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

	const enable = async (update = true) => {
		if (update) {
			void config.update('enabled', true);
		}
		cleanUp();
		await rpc.destroy();
		statusBarIcon.text = '$(pulse) Connecting to Discord...';
		statusBarIcon.show();
		await login();
	};

	const disable = async (update = true) => {
		if (update) {
			void config.update('enabled', false);
		}
		cleanUp();
		await rpc.destroy();
		statusBarIcon.hide();
	};

	const enabler = commands.registerCommand('discord.enable', async () => {
		await enable();
		void window.showInformationMessage('Enabled Discord Presence for this workspace');
	});

	const disabler = commands.registerCommand('discord.disable', async () => {
		await disable();
		void window.showInformationMessage('Disabled Discord Presence for this workspace');
	});

	const reconnecter = commands.registerCommand('discord.reconnect', async () => {
		await disable(false);
		await enable(false);
	});

	const disconnect = commands.registerCommand('discord.disconnect', async () => {
		await disable(false);
		statusBarIcon.text = '$(pulse) Reconnect to Discord';
		statusBarIcon.command = 'discord.reconnect';
	});

	context.subscriptions.push(enabler, disabler, reconnecter, disconnect);

	if (!isWorkspaceExcluded && config[CONFIG_KEYS.Enabled]) {
		statusBarIcon.show();
		await login();
	}

	const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
	await gitExtension?.activate();
}

export async function deactivate() {
	cleanUp();
	await rpc.destroy();
}
