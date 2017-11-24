// Import the required functions & object types from various packages.
import { Client } from 'discord-rpc';
import { basename, extname } from 'path';
import { ExtensionContext, commands, window, workspace, Uri, TextDocumentChangeEvent, TextDocument } from 'vscode';
import { setInterval, clearInterval } from 'timers';

// Define the RPC variable and its type.
let rpc: Client;

// `Activate` is fired when the extension is enabled. This SHOULD only fire once.
export function activate(context: ExtensionContext) {
	
	// Get the workspace's configuration for "discord".
	const config = workspace.getConfiguration('discord');

	// Obtain whether or not the extension is activated.
	if (config.get('enabled')) {
		initRPC(config.get('clientID'));
	}
	
	// Register the `discord.enable` command, and set the `enabled` config option to true.
	const enabler = commands.registerCommand('discord.enable', () => {
		config.update('enabled', true);
		initRPC(config.get('clientID'));
	});
	
	// Register the `discord.disable` command, and set the `enabled` config option to false.
	const disabler = commands.registerCommand('discord.disable', () => {
		config.update('enabled', false);
		rpc.setActivity({});
	});

	// Push the new commands into the subscriptions.
	context.subscriptions.push(enabler, disabler);
}

// `Deactivate` is fired whenever the extension is deactivated.
export function deactivate(context: ExtensionContext) {
	
	// If there's an RPC Client initalized, destroy it.
	if (rpc) rpc.destroy();
}

// This function updates the activity (The Client's Rich Presence status).
function setActivity(): void {
	
	// Do not continue if RPC isn't initalized.
	if (!rpc) return;
	
	// Create a JSON Object with the user's activity information.
	const activity = {
		details: window.activeTextEditor
			? `Editing ${basename(window.activeTextEditor.document.fileName)}`
			: 'Idle.',
		state: window.activeTextEditor
			? `Workspace: ${workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).name}`
			: 'Idling.',
		startTimestamp: new Date().getTime() / 1000,
		largeImageKey: window.activeTextEditor
			? extname(basename(window.activeTextEditor.document.fileName)).substring(1)
				|| basename(window.activeTextEditor.document.fileName).substring(1)
				|| 'file'
			: 'vscode-big',
		largeImageText: window.activeTextEditor
			? window.activeTextEditor.document.languageId
			: 'Idling',
		smallImageKey: 'vscode',
		smallImageText: 'Visual Studio Code',
		instance: false
	};

	// Update the user's activity to the `activity` variable.
	rpc.setActivity(activity);
}

/// Initalize the RPC systems.
function initRPC(clientID: string): void {

	// Update the RPC variable with a new RPC Client.
	rpc = new Client({ transport: 'ipc' });

	// Once the RPC Client is ready, set the activity.
	rpc.once('ready', () => {
		setActivity();
		workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => setActivity());
	});

	// Log in to the RPC Client, and check whether or not it errors.
	rpc.login(clientID).catch(error =>
		error.message.includes('ENOENT')
			? window.showErrorMessage('No Discord Client detected!')
			: window.showErrorMessage(`Could not connect to discord via rpc: ${error.message}`)
	);
}
