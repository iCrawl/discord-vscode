import { Client } from 'discord-rpc';
import { basename, extname } from 'path';
import { ExtensionContext, commands, window, workspace, Uri, TextDocumentChangeEvent } from 'vscode';

export function activate(context: ExtensionContext) {
	const rpc = new Client({ transport: 'ipc' });

	rpc.once('ready', () => {
		setActivity(rpc);
		workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => {
			setActivity(rpc);
		});
	});
	rpc.login('').catch(error =>
		window.showErrorMessage(`Could not connect to discord via rpc: ${error.message}`)
	);
}

export function deactivate(context: ExtensionContext) {}

function setActivity(rpc: Client): void {
	if (!rpc) return;
	const startTimestamp = Date.now();
	const activity = {
		details: window.activeTextEditor ? `${basename(window.activeTextEditor.document.fileName)}` : 'Idle.',
		state: 'No idea.',
		startTimestamp,
		largeImageKey: 'vscode-big',
		largeImageText: 'No really, nothing yet',
		smallImageKey: 'vscode',
		smallImageText: 'What did you expect?',
		instance: false
	};
	rpc.setActivity(activity).catch(error =>
		window.showErrorMessage(`DiscordRPC: ${error.message}`)
	);
}
