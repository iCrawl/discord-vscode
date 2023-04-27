import {window} from 'vscode';
import dayjs from 'dayjs';
import type {LogLevel} from "./constants/logLevel.constant";

const outputChannel = window.createOutputChannel('Discord Presence');


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
        } catch {
        }
    }
}
