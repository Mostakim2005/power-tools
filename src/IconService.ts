import { normalizePath } from 'obsidian';
import type { PowerToolsSettings } from './types';

const MAX_ICON_NAME_LENGTH = 120;

export class IconService {
	constructor(
		private readonly getSettings: () => PowerToolsSettings,
		private readonly saveSettings: () => Promise<void>,
	) {}

	async setFolderIcon(folderPath: string, iconName: string | null): Promise<void> {
		const path = normalizePath(folderPath);
		if (!path) return;
		const normalizedIcon = iconName?.trim().slice(0, MAX_ICON_NAME_LENGTH) ?? '';
		const settings = this.getSettings();
		if (normalizedIcon) settings.folderIcons[path] = normalizedIcon;
		else delete settings.folderIcons[path];
		await this.saveSettings();
	}

	getFolderIcon(folderPath: string): string | null {
		return this.getSettings().folderIcons[normalizePath(folderPath)] ?? null;
	}
}
