import { OutputChannel, window } from 'vscode';

export default class Logger {
	static output: OutputChannel;

	static setup() {
		this.output = this.output || window.createOutputChannel('Discord Presence');
	}

	static log(message: string) {
		if (!this.output) this.setup();
		this.output.appendLine(message);
	}
}
