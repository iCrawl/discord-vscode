import { sep } from 'path';
import { readdirSync } from 'fs';
import { execSync } from 'child_process';
import { WorkspaceFolder } from 'vscode'; // tslint:disable-line

export default class GitUtils extends null {
	public static branchName(path?: WorkspaceFolder): string {
		if (!path) return 'Unknown';
		const rootFolder = path.uri.fsPath;

		if (this.isGitRepository(rootFolder)) {
			try {
				return execSync('git rev-parse --abbrev-ref HEAD', {
					cwd: rootFolder,
					encoding: 'utf8',
					windowsHide: true,
				});
			} catch {} // tslint:disable-line
		}

		return 'Unknown';
	}

	public static repoName(path?: WorkspaceFolder): string {
		if (!path) return 'Unknown';
		const rootFolder = path.uri.fsPath;

		if (this.isGitRepository(rootFolder)) {
			try {
				const remoteURL = execSync('git config --get remote.origin.url', {
					cwd: rootFolder,
					encoding: 'utf8',
					windowsHide: true,
				});
				return remoteURL.split('/')[1].replace('.git', '');
			} catch {} // tslint:disable-line
		}

		return 'Unknown';
	}

	private static isGitRepository(root: string): boolean {
		try {
			return Boolean(readdirSync(`${root}${sep}.git`).length);
		} catch (error) {
			console.log(error);
			return false;
		}
	}
}
