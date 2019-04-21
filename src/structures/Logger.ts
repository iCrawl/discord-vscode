import { OutputChannel, window } from 'vscode';

// eslint-disable-next-line
export default class Logger {
	private static _output: OutputChannel;

	private static _setup(): void {
		this._output = this._output || window.createOutputChannel('Discord Presence');
	}

	public static log(message: string): void {
		if (!this._output) this._setup();
		this._output.appendLine(message);
	}
}
