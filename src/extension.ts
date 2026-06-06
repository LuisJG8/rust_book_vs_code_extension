import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { extractRunnableCommands } from './shared/commandNormalizer';

type BookPage = {
  href: string;
  title: string;
  label: string;
  chapterNumber: number;
  sectionNumber?: number;
  html: string;
  searchText: string;
};

type BookChapter = {
  id: string;
  number: number;
  title: string;
  href: string;
  pages: BookPage[];
  searchText: string;
};

type BookData = {
  generatedAt: string;
  source: {
    kind: string;
    path: string;
    versionNote: string;
  };
  license: {
    content: string;
    extension: string;
  };
  chapters: BookChapter[];
};

type Exercise = {
  id: string;
  chapterNumber: number;
  title: string;
  conceptFocus: string;
  prompt: string;
  workspaceSetup: string;
  starterCode: string;
  expectedBehavior: string;
  hints: string[];
};

type ExerciseData = {
  generatedAt: string;
  chapters: Record<string, Exercise[]>;
};

type WebviewMessage =
  | { type: 'copy'; text: string }
  | { type: 'runCommand'; text: string }
  | { type: 'runRust'; code: string; label?: string }
  | { type: 'openExercise'; exercise: Exercise }
  | { type: 'ready' };

let activePanel: RustBookCoursePanel | undefined;
let sharedTerminal: vscode.Terminal | undefined;

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('rustBookCourse.open', () => {
      RustBookCoursePanel.open(context);
    }),
    vscode.commands.registerCommand('rustBookCourse.openChapter', async (chapterNumber?: number) => {
      await openChapterCommand(context, chapterNumber);
    }),
    vscode.commands.registerCommand('rustBookCourse.runCommand', async (rawCommand?: string) => {
      await runTerminalCommand(rawCommand ?? '');
    }),
    vscode.commands.registerCommand('rustBookCourse.runRustSnippet', async (code?: string) => {
      await runRustSnippet(context, code ?? '', 'Command Palette Snippet');
    })
  );
}

export function deactivate(): void {
  sharedTerminal?.dispose();
  sharedTerminal = undefined;
}

class RustBookCoursePanel {
  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  static open(context: vscode.ExtensionContext, initialChapter?: number): RustBookCoursePanel {
    if (activePanel) {
      activePanel.panel.reveal(vscode.ViewColumn.One);
      activePanel.postSelectChapter(initialChapter);
      return activePanel;
    }

    activePanel = new RustBookCoursePanel(context, initialChapter);
    return activePanel;
  }

  private constructor(context: vscode.ExtensionContext, initialChapter?: number) {
    this.context = context;
    this.panel = vscode.window.createWebviewPanel(
      'rustBookCourse.reader',
      'Rust Book Interactive Course',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media'),
          vscode.Uri.joinPath(context.extensionUri, 'assets')
        ]
      }
    );

    this.panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'rust-book.svg');
    this.panel.webview.html = this.renderHtml(initialChapter);

    this.panel.webview.onDidReceiveMessage(
      (message: unknown) => this.handleMessage(message as WebviewMessage),
      undefined,
      this.disposables
    );

    this.panel.onDidDispose(
      () => {
        activePanel = undefined;
        this.disposables.forEach((disposable) => disposable.dispose());
        this.disposables = [];
      },
      undefined,
      this.disposables
    );
  }

  postSelectChapter(chapterNumber?: number): void {
    if (chapterNumber) {
      void this.panel.webview.postMessage({ type: 'selectChapter', chapterNumber });
    }
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case 'copy':
        await vscode.env.clipboard.writeText(message.text);
        void vscode.window.showInformationMessage('Copied to clipboard.');
        break;
      case 'runCommand':
        await runTerminalCommand(message.text);
        break;
      case 'runRust':
        await runRustSnippet(this.context, message.code, message.label ?? 'Rust Book Snippet');
        break;
      case 'openExercise':
        await openExerciseProject(this.context, message.exercise);
        break;
      case 'ready':
        break;
    }
  }

  private renderHtml(initialChapter?: number): string {
    const webview = this.panel.webview;
    const mediaUri = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    const assetsUri = vscode.Uri.joinPath(this.context.extensionUri, 'assets');
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'webview.css'));
    const bookMediaBaseUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsUri, 'book-media'));
    const ferrisLogoUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsUri, 'rust_normal.png'));
    const nonce = getNonce();
    const book = readJsonAsset<BookData>(this.context, 'book.json');
    const exercises = readJsonAsset<ExerciseData>(this.context, 'exercises.json');
    const runtime = {
      initialChapter: initialChapter ?? 1,
      bookMediaBaseUri: bookMediaBaseUri.toString(),
      ferrisLogoUri: ferrisLogoUri.toString()
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <link nonce="${nonce}" rel="stylesheet" href="${styleUri}">
  <title>Rust Book Interactive Course</title>
</head>
<body>
  <div id="app" class="app-shell">
    <div class="loading-state">Loading Rust Book course...</div>
  </div>
  <script nonce="${nonce}" id="book-data" type="application/json">${escapeJsonForHtml(book)}</script>
  <script nonce="${nonce}" id="exercise-data" type="application/json">${escapeJsonForHtml(exercises)}</script>
  <script nonce="${nonce}" id="runtime-data" type="application/json">${escapeJsonForHtml(runtime)}</script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

async function openChapterCommand(context: vscode.ExtensionContext, chapterNumber?: number): Promise<void> {
  if (chapterNumber) {
    RustBookCoursePanel.open(context, chapterNumber);
    return;
  }

  const book = readJsonAsset<BookData>(context, 'book.json');
  const pick = await vscode.window.showQuickPick(
    book.chapters.map((chapter) => ({
      label: `Chapter ${chapter.number}: ${chapter.title}`,
      description: `${chapter.pages.length} section${chapter.pages.length === 1 ? '' : 's'}`,
      chapterNumber: chapter.number
    })),
    { placeHolder: 'Open a Rust Book chapter' }
  );

  if (pick) {
    RustBookCoursePanel.open(context, pick.chapterNumber);
  }
}

async function runTerminalCommand(rawBlockText: string): Promise<void> {
  const commands = extractRunnableCommands(rawBlockText);

  if (commands.length === 0) {
    void vscode.window.showWarningMessage('No runnable terminal command was detected in that block.');
    return;
  }

  const terminal = getTerminal();
  terminal.show();

  for (const command of commands) {
    terminal.sendText(command, true);
  }
}

async function runRustSnippet(
  context: vscode.ExtensionContext,
  code: string,
  label: string
): Promise<void> {
  if (!code.trim()) {
    void vscode.window.showWarningMessage('No Rust code was provided.');
    return;
  }

  const project = createScratchCargoProject(context, 'snippets', label, code);
  const document = await vscode.workspace.openTextDocument(project.mainPath);
  await vscode.window.showTextDocument(document, { preview: false });

  const terminal = getTerminal();
  terminal.show();
  terminal.sendText(`cd ${quoteForShell(project.projectDir)} && cargo run`, false);
  void vscode.window.showInformationMessage('Opened a scratch Rust project. Review the code before running cargo run.');
}

async function openExerciseProject(
  context: vscode.ExtensionContext,
  exercise: Exercise
): Promise<void> {
  const code = exercise.starterCode?.trim()
    ? exercise.starterCode
    : `fn main() {\n    println!("${escapeRustString(exercise.title)}");\n}\n`;
  const project = createScratchCargoProject(context, 'exercises', exercise.title, code, exercise);
  const document = await vscode.workspace.openTextDocument(project.mainPath);
  await vscode.window.showTextDocument(document, { preview: false });
  void vscode.window.showInformationMessage(`Opened ${exercise.title}. Run it with cargo run when ready.`);
}

function createScratchCargoProject(
  context: vscode.ExtensionContext,
  kind: 'snippets' | 'exercises',
  label: string,
  mainCode: string,
  exercise?: Exercise
): { projectDir: string; mainPath: string } {
  const safeName = makeSafeProjectName(label);
  const baseDir = getScratchBaseDir(context);
  const projectDir = path.join(baseDir, kind, `${Date.now()}-${safeName}`);
  const srcDir = path.join(projectDir, 'src');
  const mainPath = path.join(srcDir, 'main.rs');
  const packageName = safeName.replace(/-/g, '_').slice(0, 48) || 'rust_book_scratch';

  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, 'Cargo.toml'),
    `[package]\nname = "${packageName}"\nversion = "0.1.0"\nedition = "2024"\n\n[dependencies]\n`,
    'utf8'
  );

  const header = exercise
    ? `// ${exercise.title}\n// Focus: ${exercise.conceptFocus}\n// Prompt: ${exercise.prompt}\n// Expected: ${exercise.expectedBehavior}\n\n`
    : '';
  fs.writeFileSync(mainPath, `${header}${mainCode.trimEnd()}\n`, 'utf8');

  return { projectDir, mainPath };
}

function getScratchBaseDir(context: vscode.ExtensionContext): string {
  const baseDir = path.join(context.globalStorageUri.fsPath, 'rust-book-course');

  fs.mkdirSync(baseDir, { recursive: true });
  return baseDir;
}

function getTerminal(): vscode.Terminal {
  if (!sharedTerminal) {
    sharedTerminal = vscode.window.createTerminal('Rust Book Course');
  }

  return sharedTerminal;
}

function readJsonAsset<T>(context: vscode.ExtensionContext, filename: string): T {
  const assetPath = path.join(context.extensionUri.fsPath, 'assets', filename);
  return JSON.parse(fs.readFileSync(assetPath, 'utf8')) as T;
}

function getNonce(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';

  for (let i = 0; i < 32; i += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return value;
}

function escapeJsonForHtml(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function makeSafeProjectName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'rust-book-scratch';
}

function quoteForShell(value: string): string {
  return `"${value.replace(/(["\\$`])/g, '\\$1')}"`;
}

function escapeRustString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
