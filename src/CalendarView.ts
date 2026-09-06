import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import type { App } from 'obsidian';
import type { PowerToolsSettings } from './types';

export const CALENDAR_VIEW_TYPE = 'navigation-suite-calendar';

type DayCell = {
	date: Date;
	files: TFile[];
};

export class CalendarView extends ItemView {
	private currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
	private readonly getSettings: () => PowerToolsSettings;
	private readonly appRef: App;
	private refreshTimer: number | null = null;

	constructor(leaf: WorkspaceLeaf, app: App, getSettings: () => PowerToolsSettings) {
		super(leaf);
		this.appRef = app;
		this.getSettings = getSettings;
	}

	getViewType(): string {
		return CALENDAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Calendar';
	}

	getIcon(): string {
		return 'calendar-days';
	}

	onOpen(): Promise<void> {
		this.render();
		const refresh = () => this.scheduleRefresh();
		this.registerEvent(this.appRef.vault.on('create', refresh));
		this.registerEvent(this.appRef.vault.on('delete', refresh));
		this.registerEvent(this.appRef.vault.on('rename', refresh));
		this.registerEvent(this.appRef.vault.on('modify', refresh));
		return Promise.resolve();
	}

	onClose(): Promise<void> {
		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
		this.refreshTimer = null;
		this.contentEl.empty();
		return Promise.resolve();
	}

	private scheduleRefresh(): void {
		if (this.refreshTimer !== null) return;
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			this.render();
		}, 120);
	}

	private render(): void {
		const root = this.contentEl;
		root.empty();
		root.addClass('ns-calendar');

		const header = root.createDiv({ cls: 'ns-calendar-header' });
		const previous = header.createEl('button', { text: '‹', attr: { 'aria-label': 'Previous month', type: 'button' } });
		const title = header.createEl('strong', { text: this.currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) });
		const next = header.createEl('button', { text: '›', attr: { 'aria-label': 'Next month', type: 'button' } });

		previous.addEventListener('click', () => {
			this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
			this.render();
		});
		next.addEventListener('click', () => {
			this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
			this.render();
		});

		const weekdays = root.createDiv({ cls: 'ns-calendar-weekdays' });
		const first = this.getSettings().calendarStartOfWeek === 'sunday' ? 0 : 1;
		for (let i = 0; i < 7; i++) {
			const date = new Date(2024, 0, 7 + ((first + i) % 7));
			weekdays.createDiv({ text: date.toLocaleDateString(undefined, { weekday: 'short' }) });
		}

		const grid = root.createDiv({ cls: 'ns-calendar-grid' });
		const cells = this.buildCells();
		for (const cell of cells) {
			const day = grid.createDiv({ cls: 'ns-calendar-day' });
			day.createDiv({ cls: 'ns-calendar-day-number', text: String(cell.date.getDate()) });
			if (cell.files.length > 0) {
				day.addClass('has-notes');
				day.createDiv({ cls: 'ns-calendar-count', text: String(cell.files.length) });
			}
			day.addEventListener('click', () => {
				if (cell.files[0]) void this.appRef.workspace.getLeaf('tab').openFile(cell.files[0]);
			});
		}
	}

	private buildCells(): DayCell[] {
		const year = this.currentMonth.getFullYear();
		const month = this.currentMonth.getMonth();
		const first = new Date(year, month, 1);
		const startOffsetBase = this.getSettings().calendarStartOfWeek === 'sunday' ? 0 : 1;
		const startOffset = (first.getDay() - startOffsetBase + 7) % 7;
		const last = new Date(year, month + 1, 0);
		const total = Math.ceil((startOffset + last.getDate()) / 7) * 7;

		const files = this.appRef.vault.getMarkdownFiles();
		const byDay = new Map<string, TFile[]>();
		for (const file of files) {
			const date = new Date(file.stat.mtime);
			if (date.getFullYear() !== year || date.getMonth() !== month) continue;
			const key = this.dayKey(date);
			const bucket = byDay.get(key);
			if (bucket) bucket.push(file); else byDay.set(key, [file]);
		}

		return Array.from({ length: total }, (_, index) => {
			const date = new Date(year, month, index - startOffset + 1);
			return { date, files: byDay.get(this.dayKey(date)) ?? [] };
		});
	}

	private dayKey(date: Date): string {
		return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
	}
}
