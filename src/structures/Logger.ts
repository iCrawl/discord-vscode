import { OutputChannel, window } from 'vscode'; // tslint:disable-line

// tslint:disable-next-line
export default class Logger {
	private static _output: OutputChannel; // tslint:disable-line

	private static _setup() {
		this._output = this._output || window.createOutputChannel('Discord Presence');
	}

	public static log(message: string) {
		if (!this._output) this._setup();
		this._output.appendLine(message);
	}
}
