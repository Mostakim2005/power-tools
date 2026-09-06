import { Plugin, PluginSettingTab, Setting } from 'obsidian';
import { POWER_TOOLS_API_VERSION, type PowerToolsApi, type PowerToolsCapabilities } from '@navigation-suite/contracts';
import { CalendarView, CALENDAR_VIEW_TYPE } from './views/CalendarView';
import { FolderNoteService } from './services/FolderNoteService';
import { IconService } from './services/IconService';
import { DEFAULT_POWER_TOOLS_SETTINGS, normalizePowerToolsSettings, type PowerToolsSettings } from './settings/types';

export default class PowerToolsPlugin extends Plugin {
	settings: PowerToolsSettings = DEFAULT_POWER_TOOLS_SETTINGS;
	readonly apiVersion = POWER_TOOLS_API_VERSION;
	readonly capabilities: PowerToolsCapabilities = {
		apiVersion: POWER_TOOLS_API_VERSION,
		calendar: true,
		folderNotes: true,
		folderIcons: true,
	};
	private folderNoteService!: FolderNoteService;
	private iconService!: IconService;
	readonly api: PowerToolsApi = {
		capabilities: this.capabilities,
		getFolderIcon: (path) => this.iconService?.getFolderIcon(path) ?? null,
		setFolderIcon: (path, iconName) => this.iconService?.setFolderIcon(path, iconName) ?? Promise.reject(new Error('Power Tools is not ready.')),
		openCalendar: () => this.openCalendar(),
		createFolderNote: (folderPath) => this.folderNoteService?.createOrOpen(folderPath) ?? Promise.reject(new Error('Power Tools is not ready.')),
	};

	async onload(): Promise<void> {
		this.settings = normalizePowerToolsSettings(await this.loadData());

		this.folderNoteService = new FolderNoteService(this.app, () => this.settings);
		this.iconService = new IconService(() => this.settings, () => this.saveSettings());

		this.registerView(CALENDAR_VIEW_TYPE, (leaf) => new CalendarView(leaf, this.app, () => this.settings));

		this.addCommand({
			id: 'open-calendar',
			name: 'Open calendar',
			callback: () => this.openCalendar(),
		});

		this.addCommand({
			id: 'create-folder-note',
			name: 'Create folder note',
			checkCallback: (checking) => {
				const folder = this.app.workspace.getActiveFile()?.parent;
				if (!folder) return false;
				if (!checking) void this.folderNoteService.createOrOpen(folder.path);
				return true;
			},
		});

		this.addSettingTab(new PowerToolsSettingTab(this.app, this));
	}

	async openCalendar(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE)[0];
		const leaf = existing ?? this.app.workspace.getLeaf('tab');
		await leaf.setViewState({ type: CALENDAR_VIEW_TYPE, active: true });
		this.app.workspace.revealLeaf(leaf);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(CALENDAR_VIEW_TYPE);
	}
}

class PowerToolsSettingTab extends PluginSettingTab {
	constructor(app: Parameters<typeof PluginSettingTab>[0], private readonly plugin: PowerToolsPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Power Tools' });

		new Setting(containerEl)
			.setName('Folder note name')
			.setDesc('File created inside a folder when using the folder-note command.')
			.addText((text) => text
				.setPlaceholder('index')
				.setValue(this.plugin.settings.folderNoteName)
				.onChange(async (value) => {
					this.plugin.settings.folderNoteName = value.trim() || 'index';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Calendar start of week')
			.setDesc('Choose Monday or Sunday as the first day in the calendar.')
			.addDropdown((dropdown) => dropdown
				.addOption('monday', 'Monday')
				.addOption('sunday', 'Sunday')
				.setValue(this.plugin.settings.calendarStartOfWeek)
				.onChange(async (value) => {
					this.plugin.settings.calendarStartOfWeek = value as PowerToolsSettings['calendarStartOfWeek'];
					await this.plugin.saveSettings();
				}));
	}
}
