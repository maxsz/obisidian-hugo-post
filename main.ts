import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  SuggestModal,
  Setting,
} from "obsidian";

interface PluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
  mySetting: "test",
};

export default class MyPlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    await this.loadSettings();

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon(
      "dice",
      "Sample Plugin",
      (_evt: MouseEvent) => {
        // Called when the user clicks the icon.
        new Notice("This is a notice!");
      },
    );
    // Perform additional things with the ribbon
    ribbonIconEl.addClass("my-plugin-ribbon-class");

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText("Status Bar Text");

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: "create-new-post",
      name: "Create new post",
      callback: async () => {
        const postKind = await new Promise(
          (resolve: (postKind: string) => void) => {
            new PostKindChooserModal(this.app, (postKind) =>
              resolve(postKind),
            ).open();
          },
        );
        new Notice(postKind);

        const postTitle = await new Promise(
          (resolve: (postTitle: string) => void) => {
            new PostTitleModal(this.app, (title: string) => {
              resolve(title);
            }).open();
          },
        );
        new Notice(postTitle);

        try {
          const kindPrefix = postKind == PostKind.Note ? "note-" : "";
          const datePrefix = formatDatePrefix(new Date());
          const folderName = `content/posts/${kindPrefix}${datePrefix}-${postTitle}`;
          const folder = await this.app.vault.createFolder(folderName);
          new Notice(folder.path);
          const file = await this.app.vault.create(
            `${folder.path}/index.md`,
            "",
          );
          const leaf = this.app.workspace.getLeaf(false);
          await leaf.openFile(file);
        } catch (e) {
          new Notice(e);
        }
      },
    });
    // This adds an editor command that can perform some operation on the current editor instance
    this.addCommand({
      id: "sample-editor-command",
      name: "Sample editor command",
      editorCallback: (editor: Editor, _view: MarkdownView) => {
        console.log(editor.getSelection());
        editor.replaceSelection("Sample Editor Command");
      },
    });
    // This adds a complex command that can check whether the current state of the app allows execution of the command
    this.addCommand({
      id: "open-sample-modal-complex",
      name: "Open sample modal (complex)",
      checkCallback: (checking: boolean) => {
        // Conditions to check
        const markdownView =
          this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.
          if (!checking) {
            new SampleModal(this.app).open();
          }

          // This command will only show up in Command Palette when the check function returns true
          return true;
        }
      },
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SampleSettingTab(this.app, this));

    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this function will automatically remove the event listener when this plugin is disabled.
    this.registerDomEvent(document, "click", (evt: MouseEvent) => {
      console.log("click", evt);
    });

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    this.registerInterval(
      window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000),
    );
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.setText("Woah!");
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Setting #1")
      .setDesc("It's a secret")
      .addText((text) =>
        text
          .setPlaceholder("Enter your secret")
          .setValue(this.plugin.settings.mySetting)
          .onChange(async (value) => {
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}

interface Post {
  kind: PostKind;
  title: string;
}

enum PostKind {
  BlogPost = "blogpost",
  Note = "note",
  Photos = "photos",
}

function formatDatePrefix(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}-${hours}-${minutes}`;
}

export class PostKindChooserModal extends SuggestModal<PostKind> {
  onSubmit: (result: string) => void;

  constructor(app: App, onSubmit: (result: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }
  getSuggestions(query: string): PostKind[] {
    return Object.values(PostKind).filter((postKind) =>
      postKind.toLowerCase().includes(query.toLowerCase()),
    );
  }

  renderSuggestion(postKind: PostKind, el: HTMLElement) {
    el.createEl("div", { text: postKind });
    el.createEl("small", { text: postKind });
  }

  onChooseSuggestion(postKind: PostKind, evt: MouseEvent | KeyboardEvent) {
    this.onSubmit(postKind);
  }
}

export class PostTitleModal extends Modal {
  constructor(app: App, onSubmit: (result: string) => void) {
    super(app);
    this.setTitle("Post title");

    let name = "";
    new Setting(this.contentEl).setName("Title").addText((text) =>
      text.onChange((value) => {
        name = value;
      }),
    );

    new Setting(this.contentEl).addButton((btn) =>
      btn
        .setButtonText("Submit")
        .setCta()
        .onClick(() => {
          this.close();
          onSubmit(name);
        }),
    );
  }
}
