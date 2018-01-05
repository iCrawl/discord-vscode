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
	StatusBarItem,
	StatusBarAlignment,
	window,
	workspace,
	WorkspaceFolder
} from 'vscode';
const lang = require('./data/languages.json');

const knownExtentions: { [x: string]: {image: string}} = lang.knownExtentions;
const knownLanguages: string[] = lang.knownLanguages;

// Define the RPC variable and its type.
let rpc: Client;
// Define the eventHandler variable and its type.
const eventHandlers: Set<Disposable> = new Set();
// Define the config variable and its type.
let config;
// Define the reconnecting var and its type.
let reconnecting: boolean;
// Define the reconnect counter and its type.
let reconnectCounter = 0;
// Define the last known file name and its type.
let lastKnownFileName: string;
// Define the activity object.
let activity: object;
// Define the activity timer to not spam the API with requests.
let activityTimer: NodeJS.Timer;
// Define the status bar icon
let statusBarIcon: StatusBarItem;

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

	// Register the `discord.reconnect` command
	const reconnecter = commands.registerCommand('discord.reconnect', async () => {
		if (rpc) try { await destroyRPC(); } catch {}
		initRPC(config.get('clientID'), true);

		if (!config.get('silent')) window.showInformationMessage('Reconnecting to Discord RPC');

		if (statusBarIcon) statusBarIcon.text = '$(pulse) Reconnecting';
	});

	// Push the new commands into the subscriptions.
	context.subscriptions.push(enabler, disabler, reconnecter);
}

// `Deactivate` is fired whenever the extension is deactivated.
export async function deactivate() {
	// If there's an RPC Client initalized, destroy it.
	await destroyRPC();
}

// Initalize the RPC systems.
function initRPC(clientID: string, loud?: boolean): void {
	// Update the RPC variable with a new RPC Client.
	rpc = new Client({ transport: 'ipc' });

	// Once the RPC Client is ready, set the activity.
	rpc.once('ready', () => {
		// Announce the reconnection
		if (loud && !config.get('silent')) window.showInformationMessage('Successfully reconnected to Discord RPC');

		// Remove icon if connected
		if (statusBarIcon) {
			statusBarIcon.dispose();
			statusBarIcon = null;
		}

		// Stop from reconnecing.
		reconnecting = false;
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
		// Make sure to listen to the close event and dispose and destroy everything accordingly.
		rpc.transport.once('close', async () => {
			if (!config.get('enabled')) return;
			await destroyRPC();

			// Set the client to begin reconnecting
			reconnecting = true;
			initRPC(config.get('clientID'));
			// Create reconnecting button
			createButon(true);
		});

		// Update the user's activity to the `activity` variable.
		activityTimer = setInterval(() => {
			setActivity(workspaceElapsedTime);
			rpc.setActivity(activity);
		}, 15000);
	});

	// Log in to the RPC Client, and check whether or not it errors.
	rpc.login(clientID).catch(async error => {
		// Check if the client is reconnecting
		if (reconnecting) {
			// Destroy and dispose of everything after the set reconnect attempts
			if (reconnectCounter >= config.get('reconnectThreshold')) {
				// Create reconnect button
				createButon();
				await destroyRPC();
			} else {
				// Increment the counter
				reconnectCounter++;
				// Create reconnecting button
				createButon(true);
				// Retry connection
				initRPC(config.get('clientID'));
				return;
			}
		}
		// Announce failure
		if (!config.get('silent')) {
			if (error.message.includes('ENOENT')) window.showErrorMessage('No Discord Client detected!');
			else window.showErrorMessage(`Couldn't connect to Discord via RPC: ${error.message}`);
			createButon();
		}
	});
}

// Create reconnect button
function createButon(isReconnecting?: boolean): void {
	// Check if the button already
	if (!statusBarIcon) {
		// Create the icon
		statusBarIcon = window.createStatusBarItem(StatusBarAlignment.Left);
		// Check if the client is reconnecting
		if (isReconnecting) {
			// Show attempts left
			const attempts = config.get('reconnectThreshold') - reconnectCounter;
			statusBarIcon.text = `$(issue-reopened) Reconnecting: ${attempts} attempt${attempts === 1 ? '' : 's'} left`;
			statusBarIcon.command = '';
		} else {
			// Show button to reconnect
			statusBarIcon.text = '$(plug) Reconnect to Discord';
			statusBarIcon.command = 'discord.reconnect';
		}
		// Show the button
		statusBarIcon.show();
	} else  {
		// Check if the client is reconnecting
		if (isReconnecting) {
			// Show attempts left
			const attempts = config.get('reconnectThreshold') - reconnectCounter;
			statusBarIcon.text = `$(issue-reopened) Reconnecting: ${attempts} attempt${attempts === 1 ? '' : 's'} left`;
			statusBarIcon.command = '';
		} else {
			// Show button to reconnect
			statusBarIcon.text = '$(plug) Reconnect to Discord';
			statusBarIcon.command = 'discord.reconnect';
		}
	}
}

// Cleanly destroy the RPC client (if it isn't already). && add icon to reconnect
async function destroyRPC(): Promise<void> {
	// Do not continue if RPC isn't initalized.
	if (!rpc) return;
	// Stop reconnecting.
	reconnecting = false;
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

	const fileName: string = window.activeTextEditor ? basename(window.activeTextEditor.document.fileName) : null;
	const largeImageKey: any = window.activeTextEditor
		? knownExtentions[Object.keys(knownExtentions).find(key => {
			if (key.startsWith('.') && fileName.endsWith(key)) return true;
			const match = key.match(/^\/(.*)\/([mgiy]+)$/);
			if (!match) return false;
			const regex = new RegExp(match[1], match[2]);
			return regex.test(fileName);
		})] || (knownLanguages.includes(window.activeTextEditor.document.languageId) ? window.activeTextEditor.document.languageId : null)
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
			? largeImageKey.image
					|| largeImageKey
			: 'txt',
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
