import { Client } from '@xhayper/discord-rpc';
import throttle from 'lodash-es/throttle';
import type { ExtensionContext, StatusBarItem } from 'vscode';
import { commands, StatusBarAlignment, window, workspace, debug } from 'vscode';
import { activity } from './activity';
import { CLIENT_ID, CONFIG_KEYS } from './constants';
import { log, LogLevel } from './logger';
import { getConfig, getGit } from './util';

const statusBarIcon: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
statusBarIcon.text = '$(pulse) Connecting to Discord...';

let rpc = new Client({ transport: { type: 'ipc' }, clientId: CLIENT_ID });
const config = getConfig();

let state = {};
let idle: NodeJS.Timeout | undefined;
let listeners: { dispose(): any }[] = [];

export function cleanUp() {
	for (const listener of listeners) listener.dispose();
	listeners = [];
}

async function sendActivity() {
	// eslint-disable-next-line require-atomic-updates
	state = {
		...(await activity(state)),
	};
	void rpc.user?.setActivity(state);
}

async function login() {
	log(LogLevel.Info, 'Creating discord-rpc client');
	rpc = new Client({ transport: { type: 'ipc' }, clientId: CLIENT_ID });

	rpc.on('ready', () => {
		log(LogLevel.Info, 'Successfully connected to Discord');
		cleanUp();

		statusBarIcon.text = '$(globe) Connected to Discord';
		statusBarIcon.tooltip = 'Connected to Discord';

		void sendActivity();
		const onChangeActiveTextEditor = window.onDidChangeActiveTextEditor(async () => sendActivity());
		const onChangeTextDocument = workspace.onDidChangeTextDocument(throttle(async () => sendActivity(), 2_000));
		const onStartDebugSession = debug.onDidStartDebugSession(async () => sendActivity());
		const onTerminateDebugSession = debug.onDidTerminateDebugSession(async () => sendActivity());

		listeners.push(onChangeActiveTextEditor, onChangeTextDocument, onStartDebugSession, onTerminateDebugSession);
	});

	rpc.on('disconnected', () => {
		cleanUp();
		void rpc.destroy();
		statusBarIcon.text = '$(pulse) Reconnect to Discord';
		statusBarIcon.command = 'discord.reconnect';
	});

	try {
		await rpc.login();
	} catch (error) {
		log(LogLevel.Error, `Encountered following error while trying to login:\n${error as string}`);
		cleanUp();
		void rpc.destroy();
		if (!config[CONFIG_KEYS.SuppressNotifications]) {
			// @ts-expect-error: error is not typed
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
			try {
				await config.update('enabled', true);
			} catch {}
		}

		log(LogLevel.Info, 'Enable: Cleaning up old listeners');
		cleanUp();
		statusBarIcon.text = '$(pulse) Connecting to Discord...';
		statusBarIcon.show();
		log(LogLevel.Info, 'Enable: Attempting to recreate login');
		void login();
	};

	const disable = async (update = true) => {
		if (update) {
			try {
				await config.update('enabled', false);
			} catch {}
		}

		log(LogLevel.Info, 'Disable: Cleaning up old listeners');
		cleanUp();
		void rpc?.destroy();
		log(LogLevel.Info, 'Disable: Destroyed the rpc instance');
		statusBarIcon.hide();
	};

	const enabler = commands.registerCommand('discord.enable', async () => {
		await disable();
		await enable();
		await window.showInformationMessage('Enabled Discord Presence for this workspace');
	});

	const disabler = commands.registerCommand('discord.disable', async () => {
		await disable();
		await window.showInformationMessage('Disabled Discord Presence for this workspace');
	});

	const reconnecter = commands.registerCommand('discord.reconnect', async () => {
		await disable(false);
		await enable(false);
	});

	const disconnect = commands.registerCommand('discord.disconnect', async () => {
		await disable(false);
		statusBarIcon.text = '$(pulse) Reconnect to Discord';
		statusBarIcon.command = 'discord.reconnect';
		statusBarIcon.show();
	});

	context.subscriptions.push(enabler, disabler, reconnecter, disconnect);

	if (!isWorkspaceExcluded && config[CONFIG_KEYS.Enabled]) {
		statusBarIcon.show();
		await login();
	}

	window.onDidChangeWindowState(async (windowState) => {
		if (config[CONFIG_KEYS.IdleTimeout] !== 0) {
			if (windowState.focused) {
				if (idle) {
					// eslint-disable-next-line no-restricted-globals
					clearTimeout(idle);
				}

				await sendActivity();
			} else {
				// eslint-disable-next-line no-restricted-globals
				idle = setTimeout(async () => {
					state = {};
					await rpc.user?.clearActivity();
				}, config[CONFIG_KEYS.IdleTimeout] * 1_000);
			}
		}
	});

	await getGit();
}

export function deactivate() {
	cleanUp();
	void rpc.destroy();
}
