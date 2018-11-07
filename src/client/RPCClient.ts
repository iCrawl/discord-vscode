const { Client } = require('discord-rpc');
import {
	Disposable,
	workspace
} from 'vscode';
import Acivity from '../structures/Activity';
import Logger from '../structures/Logger';

export default class RPCClient implements Disposable {
	private _rpc: any = new Client({ transport: 'ipc' });

	private _activity = new Acivity();

	private _config = workspace.getConfiguration('discord');

	private _clientId: string;

	public constructor(clientId: string) {
		this._clientId = clientId;
	}

	public get client() {
		return this._rpc;
	}

	public setActivity(workspaceElapsedTime: boolean = false) {
		if (!this._rpc) return;
		const activity = this._activity.generate(workspaceElapsedTime);
		Logger.log('Sending activity to Discord.');
		this._rpc.setActivity(activity);
	}

	public async login() {
		Logger.log('Logging into RPC.');
		return this._rpc.login({ clientId: this._clientId });
	}

	public async dispose() {
		this._activity.dispose();
		await this._rpc.destroy();
	}
}
