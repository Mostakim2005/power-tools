export interface PowerToolsSettings {
	folderNoteName: string;
	calendarStartOfWeek: 'monday' | 'sunday';
	folderIcons: Record<string, string>;
}

export const DEFAULT_POWER_TOOLS_SETTINGS: PowerToolsSettings = {
	folderNoteName: 'index',
	calendarStartOfWeek: 'monday',
	folderIcons: {},
};

export function normalizePowerToolsSettings(value: unknown): PowerToolsSettings {
	if (!value || typeof value !== 'object') return { ...DEFAULT_POWER_TOOLS_SETTINGS };
	const raw = value as Record<string, unknown>;
	const folderIcons = raw.folderIcons;
	const normalizedIcons: Record<string, string> = {};
	if (folderIcons && typeof folderIcons === 'object') {
		for (const [path, icon] of Object.entries(folderIcons)) {
			if (typeof path === 'string' && typeof icon === 'string' && path.length > 0 && icon.length > 0 && path.length <= 1000 && icon.length <= 120) {
				normalizedIcons[path] = icon.slice(0, 120);
			}
		}
	}
	return {
		folderNoteName: typeof raw.folderNoteName === 'string' && raw.folderNoteName.trim() ? raw.folderNoteName.trim().replace(/[\\/:]/g, '-').replace(/\.md$/i, '') || 'index' : 'index',
		calendarStartOfWeek: raw.calendarStartOfWeek === 'sunday' ? 'sunday' : 'monday',
		folderIcons: normalizedIcons,
	};
}
