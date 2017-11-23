import { Client } from 'discord-rpc';
import { basename, extname } from 'path';
import { ExtensionContext, commands, window, workspace, Uri, TextDocumentChangeEvent, TextDocument } from 'vscode';

export function activate(context: ExtensionContext) {
	const rpc = new Client({ transport: 'ipc' });
	const config = workspace.getConfiguration('discord');

	rpc.once('ready', () => {
		setActivity(rpc);
		workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => setActivity(rpc));
	});
	rpc.login(config.get('clientID')).catch(error =>
		window.showErrorMessage(`Could not connect to discord via rpc: ${error.message}`)
	);
}

export function deactivate(context: ExtensionContext) {}

function setActivity(rpc: Client): void {
	if (!rpc) return;
	const activity = {
		details: window.activeTextEditor ? `Editing ${basename(window.activeTextEditor.document.fileName)}` : 'Idle.',
		state: window.activeTextEditor ? `Workspace: ${workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).name}` : 'Idling.',
		startTimestamp: new Date().getTime() / 1000,
		largeImageKey: window.activeTextEditor ? extname(basename(window.activeTextEditor.document.fileName)).substring(1) || basename(window.activeTextEditor.document.fileName).substring(1) || 'file' : 'vscode-big',
		largeImageText: window.activeTextEditor ? window.activeTextEditor.document.languageId : 'Idling.',
		smallImageKey: 'vscode',
		smallImageText: 'Visual Studio Code',
		instance: false
	};
	rpc.setActivity(activity);
}
