import dayjs from 'dayjs';
import { window } from 'vscode';

const outputChannel = window.createOutputChannel('Discord Presence');

export const enum LogLevel {
	Trace = 'TRACE',
	Debug = 'DEBUG',
	Info = 'INFO',
	Warn = 'WARN',
	Error = 'ERROR',
}

function send(level: string, message: string) {
	outputChannel.appendLine(`[${dayjs().format('DD/MM/YYYY HH:mm:ss')} - ${level}] ${message}`);
}

export function log(level: LogLevel, message: string | Error) {
	if (typeof message === 'string') {
		send(level, message);
	} else if (message instanceof Error) {
		send(level, message.message);

		if (message.stack) {
			send(level, message.stack);
		}
	} else if (typeof message === 'object') {
		try {
			const json = JSON.stringify(message, null, 2);
			send(level, json);
		} catch {}
	}
}
