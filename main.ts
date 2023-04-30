import { App, Editor, MarkdownView, Modal, ItemView, WorkspaceLeaf, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface DailyInspirationSettings {
	openOnStartup: boolean;
}

const DEFAULT_SETTINGS: DailyInspirationSettings = {
	openOnStartup: true
}

let QUOTE: string | DocumentFragment;
let AUTHOR: string;
let WIKI_ID: any;

export const VIEW_QUOTE = "quote-view";

export class QuoteView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		}
	public getIcon(): string {
		return 'quote';
		}
	getViewType() {
		return VIEW_QUOTE;
		}

	getDisplayText() {
		return "Quote view";
	}
	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("div", {text: QUOTE, cls: "quote_content"});
		container.createEl("small", {text: "by "+AUTHOR, cls: "quote_author"});
		}
	
	async onClose() {
		// Nothing to clean up.
		}
	}

export default class DailyInspirationPlugin extends Plugin {
	settings: DailyInspirationSettings;

	async onload() {
		await this.loadSettings();
		this.registerView(
			VIEW_QUOTE,
			(leaf) => new QuoteView(leaf)
		);
		
		async function updateQuote() {
			// Fetch a random quote from the Quotable API
			let quote;
			let author;
			const response = await fetch("https://api.quotable.io/random");
			const data = await response.json();
			if (response.ok) {
				quote = data.content;
				author = data.author;

			} else {
				console.log('Error trying to get the best qoute...happens');
			}
			return [ quote , author ];
		}
		[ QUOTE , AUTHOR ] = await updateQuote();

		if (this.settings.openOnStartup == true){
			new QuoteModal(this.app).open();
		}

		this.activateView();

		const wiki_url = "https://en.wikipedia.org/w/api.php"; 

		const params = new URLSearchParams({
			action: "query",
			list: "search",
			srsearch: AUTHOR,
			format: "json",
			origin: "*"
		});

		const wiki_resp = await fetch(`${wiki_url}?${params}`)
		const wiki_data = await wiki_resp.json();
		WIKI_ID = wiki_data["query"]["search"][0]["pageid"]
			
		// command to open modal containg today's quote
		this.addCommand({
			id: 'read-daily-quote',
			name: 'Read daily quote',
			callback: () => {
				new QuoteModal(this.app).open();

			}
		});

		//command to open quote view in case user closed it
		this.addCommand({
			id: 'open-daily-quote-view',
			name: 'Open daily quote view',
			checkCallback: (checking: boolean) => {
				const views_opened = this.app.workspace.getLeavesOfType(VIEW_QUOTE)["length"];
				if (views_opened == 0){
					if (!checking){
						this.activateView();
					}
					return true;
				}

			}
		});

		// This adds a command to insert in current file selection the daily quote
		this.addCommand({
			id: 'insert-daily-quote',
			name: 'Insert daily quote',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection(`> [!QUOTE] ${QUOTE}\n> [*${AUTHOR}*](https://en.wikipedia.org/?curid=${WIKI_ID})\n\n`);
			}
		});

		// This adds the settings tab 
		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_QUOTE)
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_QUOTE)
		await this.app.workspace.getRightLeaf(false).setViewState({
			type: VIEW_QUOTE,
			active: true,

		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_QUOTE)[0]
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class QuoteModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	async onOpen() {
		const {contentEl} = this;
		const quote = contentEl.createEl("div", {cls: "quote"});
		quote.createEl("div", {text: QUOTE, cls: "quote_content"});
		quote.createEl("small", {text: "by "+AUTHOR, cls: "quote_author"});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SettingTab extends PluginSettingTab {
	plugin: DailyInspirationPlugin;
	
	constructor(app: App, plugin: DailyInspirationPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'General settings'});

		new Setting(containerEl)
			.setName('Open quote on startup')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openOnStartup);
				toggle.onChange(async (value) => {
				this.plugin.settings.openOnStartup = value;
				this.display();
				this.plugin.saveSettings();
				});
				
			});
			
		}
	}


