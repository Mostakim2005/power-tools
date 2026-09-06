import { App, TFile, TFolder, normalizePath } from 'obsidian';
import type { PowerToolsSettings } from './types';

export class FolderNoteService {
	constructor(
		private readonly app: App,
		private readonly getSettings: () => PowerToolsSettings,
	) {}

	async createOrOpen(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(normalizePath(folderPath));
		if (!(folder instanceof TFolder)) return;

		const configuredName = this.getSettings().folderNoteName.trim() || 'index';
		const name = configuredName.replace(/\.md$/i, '').replace(/[\\/:]/g, '-').trim() || 'index';
		const path = normalizePath(`${folder.path}/${name}.md`);
		const existing = this.app.vault.getAbstractFileByPath(path);

		if (existing instanceof TFile) {
			await this.app.workspace.getLeaf('tab').openFile(existing);
			return;
		}
		if (existing) return;

		const file = await this.app.vault.create(path, `# ${folder.name}\n\n`);
		await this.app.workspace.getLeaf('tab').openFile(file);
	}
}
