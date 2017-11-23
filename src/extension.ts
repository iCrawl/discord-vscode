import { Client } from 'discord-rpc';
import { basename, extname } from 'path';
import { ExtensionContext, commands, window, workspace, Uri, TextDocumentChangeEvent, TextDocument } from 'vscode';

let rpc: Client;

export function activate(context: ExtensionContext) {
	rpc = new Client({ transport: 'ipc' });
	const config = workspace.getConfiguration('discord');

	rpc.once('ready', () => {
		setActivity();
		workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => setActivity());
	});
	rpc.login(config.get('clientID')).catch(error =>
		window.showErrorMessage(`Could not connect to discord via rpc: ${error.message}`)
	);
	const enabler = commands.registerCommand('discord.enable', () => config.update('enable', true));
	const disabler = commands.registerCommand('discord.disable', () => config.update('enable', false));

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
