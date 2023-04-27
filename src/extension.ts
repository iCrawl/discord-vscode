/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import { Client } from 'discord-rpc';
import { commands, ExtensionContext, StatusBarAlignment, StatusBarItem, window, workspace, debug } from 'vscode';
import throttle from 'lodash-es/throttle';

import { activity } from './activity';
import { log } from './logger';
import { getConfig, getGit } from './util';
import { LogLevel } from './constants/logLevel.constant';
import { CONFIG_KEYS } from './constants/keys.constant';
import { CLIENT_ID } from './constants/client.constant';
import type { ActivityPayload } from './interfaces/activityPayload.interface';
import { CommandsId } from './constants/commands.constant';

const statusBarIcon: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
statusBarIcon.text = '$(pulse) Connecting to Discord...';

// eslint-disable-next-line
let rpc = new Client({ transport: 'ipc' });
const config = getConfig();

let state = {};
let idle: NodeJS.Timeout | undefined;
let listeners: { dispose: () => any }[] = [];

export function cleanUp() {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	listeners.forEach((listener) => listener.dispose());
	listeners = [];
}

async function sendActivity() {
	const activityPayload: ActivityPayload = await activity(state);
	state = {
		...activityPayload,
	};
	await rpc.setActivity(state);
}

async function login() {
	log(LogLevel.Info, 'Creating discord-rpc client');
	rpc = new Client({ transport: 'ipc' });

	rpc.on('ready', () => {
		log(LogLevel.Info, 'Successfully connected to Discord');
		cleanUp();

		statusBarIcon.text = '$(globe) Connected to Discord';
		statusBarIcon.tooltip = 'Connected to Discord';

		void sendActivity();
		const onChangeActiveTextEditor = window.onDidChangeActiveTextEditor(() => sendActivity());
		const onChangeTextDocument = workspace.onDidChangeTextDocument(throttle(() => sendActivity(), 2000));
		const onStartDebugSession = debug.onDidStartDebugSession(() => sendActivity());
		const onTerminateDebugSession = debug.onDidTerminateDebugSession(() => sendActivity());

		listeners.push(onChangeActiveTextEditor, onChangeTextDocument, onStartDebugSession, onTerminateDebugSession);
	});

	rpc.on('disconnected', () => {
		cleanUp();
		rpc.destroy();
		statusBarIcon.text = '$(pulse) Reconnect to Discord';
		statusBarIcon.command = CommandsId.Reconnect;
	});
	try {
		await rpc.login({ clientId: CLIENT_ID });
	} catch (error) {
		log(LogLevel.Error, `Encountered following error while trying to login:\n${error as string}`);
		cleanUp();
		await rpc.destroy();
		if (!config[CONFIG_KEYS.SuppressNotifications]) {
			// @ts-expect-error
			if (error?.message?.includes('ENOENT')) void window.showErrorMessage('No Discord client detected');
			else void window.showErrorMessage(`Couldn't connect to Discord via RPC: ${error as string}`);
		}
		statusBarIcon.text = '$(pulse) Reconnect to Discord';
		statusBarIcon.command = CommandsId.Reconnect;
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

	const enabler = commands.registerCommand(CommandsId.Enable, async () => {
		await disable();
		await enable();
		await window.showInformationMessage('Enabled Discord Presence for this workspace');
	});

	const disabler = commands.registerCommand(CommandsId.Disable, async () => {
		await disable();
		await window.showInformationMessage('Disabled Discord Presence for this workspace');
	});

	const reconnecter = commands.registerCommand(CommandsId.Reconnect, async () => {
		await disable(false);
		await enable(false);
	});

	const disconnect = commands.registerCommand('discord.disconnect', async () => {
		await disable(false);
		statusBarIcon.text = '$(pulse) Reconnect to Discord';
		statusBarIcon.command = CommandsId.Reconnect;
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
					clearTimeout(idle);
				}

				await sendActivity();
			} else {
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				idle = setTimeout(async () => {
					state = {};
					await rpc.clearActivity();
				}, config[CONFIG_KEYS.IdleTimeout] * 1000);
			}
		}
	});

	await getGit();
}

export function deactivate() {
	cleanUp();
	void rpc.destroy();
}
