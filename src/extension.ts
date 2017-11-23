import { Client } from 'discord-rpc';
import { basename, extname } from 'path';
import { ExtensionContext, commands, window, workspace, Uri, TextDocumentChangeEvent, TextDocument } from 'vscode';
import { setInterval, clearInterval } from 'timers';

let rpc: Client;

export function activate(context: ExtensionContext) {
	const config = workspace.getConfiguration('discord');

	if (config.get('enabled')) {
		initRPC(config.get('clientID'));
	}
	const enabler = commands.registerCommand('discord.enable', () => {
		config.update('enabled', true);
		initRPC(config.get('clientID'));
	});
	const disabler = commands.registerCommand('discord.disable', () => {
		config.update('enabled', false);
		rpc.setActivity({});
	});

	context.subscriptions.push(enabler, disabler);
}

export function deactivate(context: ExtensionContext) {
	if (rpc) rpc.destroy();
}

function setActivity(): void {
	if (!rpc) return;
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
	rpc.setActivity(activity);
}

function initRPC(clientID: string): void {
	rpc = new Client({ transport: 'ipc' });
	rpc.once('ready', () => {
		setActivity();
		workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => setActivity());
	});
	rpc.login(clientID).catch(error =>
		window.showErrorMessage(`No Discord Client detected!`)
	);
}
