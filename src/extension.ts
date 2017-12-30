// Import the required functions & object types from various packages.
import { Client } from 'discord-rpc';
import { basename, extname } from 'path';
import { setInterval, clearInterval } from 'timers';
import {
	commands,
	debug,
	Disposable,
	env,
	ExtensionContext,
	window,
	workspace,
	WorkspaceFolder
} from 'vscode';
// const languages = require('./data/languages.json');

// Define the RPC variable and its type.
let rpc: Client;
// Define the eventHandler variable and its type.
const eventHandlers: Set<Disposable> = new Set();
// Define the config variable and its type.
let config;
// Define the reconnect timer and its type.
let reconnectTimer: NodeJS.Timer;
// Define the reconnect counter and its type.
let reconnectCounter = 0;
// Define the last known file name and its type.
let lastKnownFileName: string;
// Define the activity object.
let activity: object;
// Define the activity timer to not spam the API with requests.
let activityTimer: NodeJS.Timer;

// `Activate` is fired when the extension is enabled. This SHOULD only fire once.
export function activate(context: ExtensionContext) {
	// Get the workspace's configuration for "discord".
	config = workspace.getConfiguration('discord');

	// Obtain whether or not the extension is activated.
	if (config.get('enabled')) initRPC(config.get('clientID'));

	// Register the `discord.enable` command, and set the `enabled` config option to true.
	const enabler = commands.registerCommand('discord.enable', async () => {
		if (rpc) await destroyRPC();
		config.update('enabled', true);
		initRPC(config.get('clientID'));
		window.showInformationMessage('Enabled Discord Rich Presence for this workspace.');
	});

	// Register the `discord.disable` command, and set the `enabled` config option to false.
	const disabler = commands.registerCommand('discord.disable', async () => {
		if (!rpc) return;
		config.update('enabled', false);
		await destroyRPC();
		window.showInformationMessage('Disabled Discord Rich Presence for this workspace.');
	});

	// Push the new commands into the subscriptions.
	context.subscriptions.push(enabler, disabler);
}

// `Deactivate` is fired whenever the extension is deactivated.
export async function deactivate() {
	// If there's an RPC Client initalized, destroy it.
	await destroyRPC();
}

// Initalize the RPC systems.
function initRPC(clientID: string): void {
	// Update the RPC variable with a new RPC Client.
	rpc = new Client({ transport: 'ipc' });

	// Once the RPC Client is ready, set the activity.
	rpc.once('ready', () => {
		// This is purely for safety measures.
		if (reconnectTimer) {
			// Clear the reconnect interval.
			clearInterval(reconnectTimer);
			// Null reconnect variable.
			reconnectTimer = null;
		}
		// This is purely for safety measures.
		if (activityTimer) {
			// Clear the activity interval.
			clearInterval(activityTimer);
			// Null activity variable.
			activityTimer = null;
		}
		// Reset the reconnect counter to 0 on a successful reconnect.
		reconnectCounter = 0;
		setActivity();
		// Set the activity once on ready
		setTimeout(() => rpc.setActivity(activity), 500);
		const workspaceElapsedTime = Boolean(config.get('workspaceElapsedTime'));
		// eventHandlers.add(workspace.onDidChangeTextDocument(() => setActivity(workspaceElapsedTime)))
		// 	.add(workspace.onDidSaveTextDocument(() => setActivity(workspaceElapsedTime)))
		// 	.add(workspace.onDidOpenTextDocument(() => setActivity(workspaceElapsedTime)))
		// 	.add(workspace.onDidCloseTextDocument(() => setActivity(workspaceElapsedTime)))
		// 	.add(debug.onDidChangeActiveDebugSession(() => setActivity()))
		// 	.add(debug.onDidStartDebugSession(() => setActivity()))
		// 	.add(debug.onDidTerminateDebugSession(() => setActivity()));
		// Make sure to listen to the close event and dispose and destroy everything accordingly.
		rpc.transport.once('close', async () => {
			if (!config.get('enabled')) return;
			await destroyRPC();
			// Set an interval for reconnecting.
			reconnectTimer = setInterval(() => {
				reconnectCounter++;
				initRPC(config.get('clientID'));
			}, 5000);
		});

		// Update the user's activity to the `activity` variable.
		activityTimer = setInterval(() => {
			setActivity(workspaceElapsedTime);
			rpc.setActivity(activity);
		}, 15000);
	});

	// Log in to the RPC Client, and check whether or not it errors.
	rpc.login(clientID).catch(async error => {
		if (reconnectTimer) {
			// Destroy and dispose of everything after a default of 20 reconnect attempts
			if (reconnectCounter >= config.get('reconnectThreshold')) await destroyRPC();
			else return;
		}
		if (!config.get('silent')) {
			if (error.message.includes('ENOENT')) window.showErrorMessage('No Discord Client detected!');
			else window.showErrorMessage(`Couldn't connect to discord via rpc: ${error.message}`);
		}
	});
}

// Cleanly destroy the RPC client (if it isn't already).
async function destroyRPC(): Promise<void> {
	// Do not continue if RPC isn't initalized.
	if (!rpc) return;
	// Clear the reconnect interval.
	if (reconnectTimer) clearInterval(reconnectTimer);
	// Null reconnect variable.
	reconnectTimer = null;
	// Clear the activity interval.
	if (activityTimer) clearInterval(activityTimer);
	// Null the activity timer.
	activityTimer = null;
	// Dispose of the event handlers.
	eventHandlers.forEach(event => event.dispose());
	// If there's an RPC Client initalized, destroy it.
	await rpc.destroy();
	// Null the RPC variable.
	rpc = null;
	// Null the last known file name
	lastKnownFileName = null;
}

// This function updates the activity (The Client's Rich Presence status).
function setActivity(workspaceElapsedTime: boolean = false): void {
	// Do not continue if RPC isn't initalized.
	if (!rpc) return;
	if (window.activeTextEditor && window.activeTextEditor.document.fileName === lastKnownFileName) return;
	lastKnownFileName = window.activeTextEditor ? window.activeTextEditor.document.fileName : null;

	const largeImageKey = window.activeTextEditor
		? window.activeTextEditor.document.languageId
		: 'vscode-big';

	// Get the previous activity start timestamp (if available) to preserve workspace elapsed time
	let previousTimestamp = null;
	if (activity) previousTimestamp = activity['startTimestamp'];

	// Create a JSON Object with the user's activity information.
	activity = {
		details: generateDetails('detailsDebugging', 'detailsEditing', 'detailsIdle'),
		state: generateDetails('lowerDetailsDebugging', 'lowerDetailsEditing', 'lowerDetailsIdle'),
		startTimestamp: previousTimestamp && workspaceElapsedTime ? previousTimestamp : new Date().getTime() / 1000,
		largeImageKey: largeImageKey
			? largeImageKey : 'txt',
		largeImageText: window.activeTextEditor
			? config.get('largeImage')
				|| window.activeTextEditor.document.languageId.padEnd(2, '\u200b')
			: config.get('largeImageIdle'),
		smallImageKey: debug.activeDebugSession
			? 'debug'
			: env.appName.includes('Insiders')
			? 'vscode-insiders'
			: 'vscode',
		smallImageText: config.get('smallImage').replace('{appname}', env.appName),
		instance: false
	};

	console.log(activity);
}

function generateDetails(debugging, editing, idling): string {
	const fileName: string = window.activeTextEditor ? basename(window.activeTextEditor.document.fileName) : null;
	const checkState: boolean = window.activeTextEditor
		? Boolean(workspace.getWorkspaceFolder(window.activeTextEditor.document.uri))
		: false;
	const workspaceFolder: WorkspaceFolder = checkState ? workspace.getWorkspaceFolder(window.activeTextEditor.document.uri) : null;

	return window.activeTextEditor
		? debug.activeDebugSession
		? config.get(debugging)
			.replace('{filename}', fileName)
			.replace('{workspace}', checkState
				? workspaceFolder.name
				: config.get('lowerDetailsNotFound'))
		: config.get(editing)
			.replace('{filename}', fileName)
			.replace('{workspace}', checkState
				? workspaceFolder.name
				: config.get('lowerDetailsNotFound'))
		: config.get(idling);
}
