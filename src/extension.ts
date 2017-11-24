// Import the required functions & object types from various packages.
import { Client } from 'discord-rpc';
import { basename, extname } from 'path';
import { setInterval, clearInterval } from 'timers';
import {
	ExtensionContext,
	commands,
	window,
	workspace,
	TextDocumentChangeEvent,
	Disposable
} from 'vscode';

// Define the RPC variable and its type.
let rpc: Client;
// Define the eventHandler variable and its type.
let eventHandler: Disposable;
// Define the config variable and its type.
let config;
// Define the reconnect timer and its type.
let reconnect: NodeJS.Timer;
// Define the reconnect counter and its type.
let reconnectCounter = 0;
// Define the last known file name and its type.
let lastKnownFileName: string;

// `Activate` is fired when the extension is enabled. This SHOULD only fire once.
export function activate(context: ExtensionContext) {
	// Get the workspace's configuration for "discord".
	config = workspace.getConfiguration('discord');

	// Obtain whether or not the extension is activated.
	if (config.get('enabled')) {
		initRPC(config.get('clientID'));
	}

	// Register the `discord.enable` command, and set the `enabled` config option to true.
	const enabler = commands.registerCommand('discord.enable', () => {
		if (rpc) destroyRPC();
		config.update('enabled', true);
		initRPC(config.get('clientID'));
		window.showInformationMessage('Enabled Discord Rich Presence for this workspace.');
	});

	// Register the `discord.disable` command, and set the `enabled` config option to false.
	const disabler = commands.registerCommand('discord.disable', () => {
		if (!rpc) return;
		config.update('enabled', false);
		rpc.setActivity({});
		destroyRPC();
		window.showInformationMessage('Disabled Discord Rich Presence for this workspace.');
	});

	// Push the new commands into the subscriptions.
	context.subscriptions.push(enabler, disabler);
}

// `Deactivate` is fired whenever the extension is deactivated.
export function deactivate(context: ExtensionContext) {
	// If there's an RPC Client initalized, destroy it.
	destroyRPC();
}

// Initalize the RPC systems.
function initRPC(clientID: string): void {
	// Update the RPC variable with a new RPC Client.
	rpc = new Client({ transport: 'ipc' });

	// Once the RPC Client is ready, set the activity.
	rpc.once('ready', () => {
		if (reconnect) {
			// Clear the reconnect interval.
			clearInterval(reconnect);
			// Null reconnect variable.
			reconnect = null;
		}
		// Reset the reconnect counter to 0 on a successful reconnect.
		reconnectCounter = 0;
		setActivity();
		eventHandler = workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => setActivity());
		// Make sure to listen to the close event and dispose and destroy everything accordingly.
		rpc.transport.once('close', () => {
			if (!config.get('enabled')) return;
			destroyRPC();
			// Set an interval for reconnecting.
			reconnect = setInterval(() => {
				reconnectCounter++;
				initRPC(config.get('clientID'));
			}, 5000);
		});
	});

	// Log in to the RPC Client, and check whether or not it errors.
	rpc.login(clientID).catch(error => {
		if (reconnect) {
			// Destroy and dispose of everything after a default of 20 reconnect attempts
			if (reconnectCounter >= config.get('reconnectThreshold')) destroyRPC();
			else return;
		}
		if (error.message.includes('ENOENT')) window.showErrorMessage('No Discord Client detected!');
		else window.showErrorMessage(`Couldn't connect to discord via rpc: ${error.message}`);
	});
}

// Cleanly destroy the RPC client (if it isn't already).
function destroyRPC(): void {
	// Do not continue if RPC isn't initalized.
	if (!rpc) return;
	// Clear the reconnect interval.
	if (reconnect) clearInterval(reconnect);
	// Null reconnect variable.
	reconnect = null;
	// Dispose of the event handler.
	eventHandler.dispose();
	// If there's an RPC Client initalized, destroy it.
	rpc.destroy();
	// Null the RPC variable.
	rpc = null;
	// Null the last known file name
	lastKnownFileName = null;
}

// This function updates the activity (The Client's Rich Presence status).
function setActivity(): void {
	// Do not continue if RPC isn't initalized.
	if (!rpc) return;
	if (window.activeTextEditor && window.activeTextEditor.document.fileName === lastKnownFileName) return;
	lastKnownFileName = window.activeTextEditor ? window.activeTextEditor.document.fileName : null;

	const details = window.activeTextEditor
		? config.get('details').replace('{filename}', basename(window.activeTextEditor.document.fileName))
		: config.get('detailsIdle');
	const checkState = window.activeTextEditor
		? Boolean(workspace.getWorkspaceFolder(window.activeTextEditor.document.uri))
		: false;
	const state = window.activeTextEditor
		? checkState
			? config.get('workspace').replace('{workspace}', workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).name)
			: config.get('workspaceNotFound')
		: config.get('workspaceIdle');

	// Create a JSON Object with the user's activity information.
	const activity = {
		details,
		state,
		startTimestamp: new Date().getTime() / 1000,
		largeImageKey: window.activeTextEditor
			? extname(basename(window.activeTextEditor.document.fileName)).substring(1)
				|| basename(window.activeTextEditor.document.fileName).substring(1)
				|| 'file'
			: 'vscode-big',
		largeImageText: window.activeTextEditor
			? config.get('largeImage') || window.activeTextEditor.document.languageId
			: config.get('largeImageIdle'),
		smallImageKey: 'vscode',
		smallImageText: config.get('smallImage'),
		instance: false
	};

	// Update the user's activity to the `activity` variable.
	rpc.setActivity(activity);
}
