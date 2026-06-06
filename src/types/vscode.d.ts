type Thenable<T> = Promise<T>;

declare module 'vscode' {
  export interface Disposable {
    dispose(): unknown;
  }

  export interface Memento {
    get<T>(key: string, defaultValue?: T): T;
    update(key: string, value: unknown): Thenable<void>;
  }

  export class Uri {
    fsPath: string;
    toString(): string;
    static joinPath(base: Uri, ...pathSegments: string[]): Uri;
    static file(path: string): Uri;
  }

  export enum ViewColumn {
    Active = -1,
    One = 1
  }

  export interface ExtensionContext {
    extensionUri: Uri;
    globalStorageUri: Uri;
    workspaceState: Memento;
    subscriptions: Disposable[];
  }

  export interface Webview {
    html: string;
    cspSource: string;
    asWebviewUri(localResource: Uri): Uri;
    postMessage(message: unknown): Thenable<boolean>;
    onDidReceiveMessage(
      listener: (message: unknown) => unknown,
      thisArgs?: unknown,
      disposables?: Disposable[]
    ): Disposable;
  }

  export interface WebviewPanel extends Disposable {
    title: string;
    iconPath?: Uri;
    webview: Webview;
    reveal(viewColumn?: ViewColumn): void;
    onDidDispose(
      listener: () => unknown,
      thisArgs?: unknown,
      disposables?: Disposable[]
    ): Disposable;
  }

  export interface WebviewPanelOptions {
    enableScripts?: boolean;
    retainContextWhenHidden?: boolean;
    localResourceRoots?: Uri[];
  }

  export interface Terminal extends Disposable {
    show(): void;
    sendText(text: string, shouldExecute?: boolean): void;
  }

  export interface WorkspaceFolder {
    uri: Uri;
    name: string;
  }

  export interface TextDocument {
    uri: Uri;
  }

  export interface TextDocumentShowOptions {
    preview?: boolean;
  }

  export interface QuickPickItem {
    label: string;
    description?: string;
    detail?: string;
  }

  export namespace window {
    export function createWebviewPanel(
      viewType: string,
      title: string,
      showOptions: ViewColumn,
      options?: WebviewPanelOptions
    ): WebviewPanel;

    export function createTerminal(name: string): Terminal;
    export function showInformationMessage(message: string): Thenable<string | undefined>;
    export function showWarningMessage(message: string): Thenable<string | undefined>;
    export function showTextDocument(document: TextDocument, options?: TextDocumentShowOptions): Thenable<unknown>;
    export function showQuickPick<T extends QuickPickItem>(
      items: T[],
      options?: { placeHolder?: string }
    ): Thenable<T | undefined>;
  }

  export namespace commands {
    export function registerCommand(command: string, callback: (...args: never[]) => unknown): Disposable;
  }

  export namespace workspace {
    export const workspaceFolders: WorkspaceFolder[] | undefined;
    export function openTextDocument(path: string): Thenable<TextDocument>;
  }

  export namespace env {
    export const clipboard: {
      writeText(value: string): Thenable<void>;
    };
  }
}
