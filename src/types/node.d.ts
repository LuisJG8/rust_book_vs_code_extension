declare const __dirname: string;
declare const process: {
  argv: string[];
  execPath: string;
  exit(code?: number): never;
};

declare const console: {
  error(...values: unknown[]): void;
  log(...values: unknown[]): void;
};

interface ImportMeta {
  url: string;
}

type Buffer = Uint8Array;

interface Dirent {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

declare module 'node:child_process' {
  export function execFileSync(command: string, args: string[], options: { encoding: BufferEncoding }): string;
  export function spawnSync(command: string, args: string[], options: { stdio: 'inherit' }): { status: number | null };
}

declare module 'node:assert/strict' {
  const assert: {
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    doesNotMatch(actual: string, expected: RegExp, message?: string): void;
    equal(actual: unknown, expected: unknown, message?: string): void;
    match(actual: string, expected: RegExp, message?: string): void;
    ok(value: unknown, message?: string): void;
    throws(block: () => unknown, expected?: RegExp, message?: string): void;
  };

  export default assert;
}

declare module 'node:fs' {
  export function copyFileSync(source: string, destination: string): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function mkdtempSync(prefix: string): string;
  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  export function readFileSync(path: string): Buffer;
  export function readFileSync(path: string, encoding: BufferEncoding): string;
  export function realpathSync(path: string): string;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  export function symlinkSync(target: string, path: string): void;
  export function writeFileSync(path: string, data: string | Uint8Array, encoding?: BufferEncoding): void;

  const fs: {
    copyFileSync: typeof copyFileSync;
    existsSync: typeof existsSync;
    mkdirSync: typeof mkdirSync;
    mkdtempSync: typeof mkdtempSync;
    readdirSync: typeof readdirSync;
    readFileSync: typeof readFileSync;
    realpathSync: typeof realpathSync;
    rmSync: typeof rmSync;
    symlinkSync: typeof symlinkSync;
    writeFileSync: typeof writeFileSync;
  };

  export default fs;
}

declare module 'node:module' {
  export function createRequire(url: string): {
    resolve(id: string): string;
  };
}

declare module 'node:os' {
  export function tmpdir(): string;
}

declare module 'node:path' {
  export const sep: string;
  export function dirname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;

  const path: {
    dirname: typeof dirname;
    isAbsolute: typeof isAbsolute;
    join: typeof join;
    relative: typeof relative;
    resolve: typeof resolve;
    sep: typeof sep;
  };

  export default path;
}

declare module 'node:url' {
  export function fileURLToPath(url: string): string;
}

type BufferEncoding = 'utf8';

declare module 'fs' {
  export function readFileSync(path: string, encoding: string): string;
  export function writeFileSync(path: string, data: string, encoding?: string): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
}

declare module 'path' {
  export const sep: string;
  export function join(...paths: string[]): string;
}
