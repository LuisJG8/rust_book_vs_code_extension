import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type TocPage = {
  href: string;
  title: string;
  label: string;
  chapterNumber: number;
  sectionNumber?: number;
};

export type TocChapter = {
  id: string;
  number: number;
  title: string;
  href: string;
  pages: TocPage[];
};

type CustomImageFile = {
  relativePath: string;
  contents: Buffer;
};

export function locateRustBookDir(): string {
  const indexPath = execFileSync('rustup', ['doc', '--path', '--book'], {
    encoding: 'utf8'
  }).trim();

  if (!indexPath.endsWith('index.html')) {
    throw new Error(`rustup returned an unexpected Rust Book path: ${indexPath}`);
  }

  return path.dirname(indexPath);
}

export function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' '
  };

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match: string, entity: string) => {
    if (entity[0] === '#') {
      const radix = entity[1]?.toLowerCase() === 'x' ? 16 : 10;
      const raw = entity[1]?.toLowerCase() === 'x' ? entity.slice(2) : entity.slice(1);
      const codePoint = Number.parseInt(raw, radix);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return named[entity] ?? match;
  });
}

export function stripTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function parseTocFromHtml(tocHtml: string): { chapters: TocChapter[]; allPages: TocPage[] } {
  const anchorPattern = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const chapters: TocChapter[] = [];
  const byNumber = new Map<number, TocChapter>();
  const allPages: TocPage[] = [];
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(tocHtml))) {
    const href = match[1];
    const text = stripTags(match[2]);
    const numberMatch = text.match(/^(\d+)(?:\.(\d+))?\.\s+(.+)$/);

    if (!numberMatch) {
      continue;
    }

    const chapterNumber = Number.parseInt(numberMatch[1], 10);
    const sectionNumber = numberMatch[2] ? Number.parseInt(numberMatch[2], 10) : undefined;

    if (chapterNumber < 1 || chapterNumber > 21) {
      continue;
    }

    const page = {
      href,
      title: numberMatch[3],
      label: `${chapterNumber}${sectionNumber ? `.${sectionNumber}` : ''}`,
      chapterNumber,
      sectionNumber
    };

    if (!byNumber.has(chapterNumber)) {
      const chapter = {
        id: `chapter-${chapterNumber}`,
        number: chapterNumber,
        title: sectionNumber ? `Chapter ${chapterNumber}` : page.title,
        href: sectionNumber ? href : page.href,
        pages: []
      };
      byNumber.set(chapterNumber, chapter);
      chapters.push(chapter);
    }

    const chapter = byNumber.get(chapterNumber);
    if (!chapter) {
      throw new Error(`Could not create chapter ${chapterNumber} while parsing the Rust Book TOC`);
    }

    if (!sectionNumber) {
      chapter.title = page.title;
      chapter.href = page.href;
    }

    chapter.pages.push(page);
    allPages.push(page);
  }

  return { chapters, allPages };
}

export function extractMainContent(html: string): string {
  const match = html.match(/<main>\s*([\s\S]*?)\s*<\/main>/i);
  if (!match) {
    throw new Error('Could not find <main> content in Rust Book page');
  }

  return normalizeRustCodeBlockIndentation(
    match[1]
      .replace(/<!--\s*ignore\s*-->/gi, '')
      .replace(/<span\s+class="boring">[\s\S]*?<\/span>/gi, '')
      .replace(/\s+id="copy-button-[^"]*"/g, '')
  )
    .trim();
}

export function normalizeRustCodeBlockIndentation(html: string): string {
  return html.replace(
    /(<pre\b[^>]*>\s*<code\b[^>]*class="[^"]*\blanguage-rust\b[^"]*"[^>]*>)([\s\S]*?)(<\/code>\s*<\/pre>)/gi,
    (_full: string, opening: string, code: string, closing: string) => {
      return `${opening}${dedentCommonIndent(code)}${closing}`;
    }
  );
}

function dedentCommonIndent(source: string): string {
  const normalizedSource = source.replace(/\r\n?/g, '\n');
  const lines = normalizedSource.split('\n');
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => leadingWhitespaceLength(line));

  if (indents.length === 0) {
    return normalizedSource;
  }

  const commonIndent = Math.min(...indents);
  if (commonIndent === 0) {
    return normalizedSource;
  }

  return lines
    .map((line) => line.slice(Math.min(commonIndent, leadingWhitespaceLength(line))))
    .join('\n');
}

function leadingWhitespaceLength(value: string): number {
  return value.match(/^[ \t]*/)?.[0].length ?? 0;
}

export function rewriteLocalLinks(html: string, knownHrefs: ReadonlySet<string>): string {
  return html.replace(/href="([^"]+?\.html)(#[^"]*)?"/g, (full: string, href: string, anchor = '') => {
    if (!knownHrefs.has(href)) {
      return full;
    }

    return `href="#" data-book-href="${escapeAttribute(href)}" data-book-anchor="${escapeAttribute(anchor)}"`;
  });
}

export function classifyCodeBlockClass(className: string): 'console' | 'rust' | 'rust-static' | 'code' {
  if (/\blanguage-console\b/.test(className)) {
    return 'console';
  }

  if (/\blanguage-rust\b/.test(className)) {
    return hasNonRunnableRustMarker(className) ? 'rust-static' : 'rust';
  }

  return 'code';
}

function hasNonRunnableRustMarker(className: string): boolean {
  const markers = new Set([
    'compile_fail',
    'does_not_compile',
    'ignore',
    'no_run',
    'noplayground',
    'not_desired_behavior',
    'panics',
    'should_panic'
  ]);

  return className.split(/\s+/).some((token) => markers.has(token));
}

export function buildSearchText(html: string): string {
  return stripTags(html).slice(0, 12000);
}

export function copyBookImages(bookDir: string, outputDir: string): void {
  const sourceImageDir = path.join(bookDir, 'img');
  const destinationImageDir = path.join(outputDir, 'book-media', 'img');

  if (!fs.existsSync(sourceImageDir)) {
    return;
  }

  fs.mkdirSync(path.dirname(destinationImageDir), { recursive: true });
  const customImages = collectCustomImageFiles(sourceImageDir, destinationImageDir);

  try {
    fs.rmSync(destinationImageDir, { recursive: true, force: true });
    copyDirectoryWithoutSymlinks(sourceImageDir, destinationImageDir, fs.realpathSync(sourceImageDir));
  } finally {
    restoreCustomImageFiles(destinationImageDir, customImages);
  }
}

export function resolveInsideRoot(rootDir: string, candidatePath: string): string {
  if (path.isAbsolute(candidatePath)) {
    throw new Error(`Refusing absolute path outside Rust Book directory: ${candidatePath}`);
  }

  const rootRealPath = fs.realpathSync(rootDir);
  const resolvedPath = path.resolve(rootDir, candidatePath);
  const realPath = fs.realpathSync(resolvedPath);
  const relative = path.relative(rootRealPath, realPath);

  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return realPath;
  }

  throw new Error(`Refusing path outside Rust Book directory: ${candidatePath}`);
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function copyDirectoryWithoutSymlinks(sourceDir: string, destinationDir: string, rootRealPath: string): void {
  const sourceRealPath = fs.realpathSync(sourceDir);
  const relative = path.relative(rootRealPath, sourceRealPath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to copy path outside Rust Book image directory: ${sourceDir}`);
  }

  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      throw new Error(`Refusing symlink in Rust Book image directory: ${path.join(sourceDir, entry.name)}`);
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryWithoutSymlinks(sourcePath, destinationPath, rootRealPath);
      continue;
    }

    if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function collectCustomImageFiles(
  sourceDir: string,
  destinationDir: string,
  currentDir = destinationDir
): CustomImageFile[] {
  if (!fs.existsSync(currentDir)) {
    return [];
  }

  const files: CustomImageFile[] = [];

  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const destinationPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(destinationDir, destinationPath);
    const sourcePath = path.join(sourceDir, relativePath);

    if (entry.isSymbolicLink()) {
      throw new Error(`Refusing symlink in generated image directory: ${destinationPath}`);
    }

    if (entry.isDirectory()) {
      files.push(...collectCustomImageFiles(sourceDir, destinationDir, destinationPath));
      continue;
    }

    if (entry.isFile() && !fs.existsSync(sourcePath)) {
      files.push({ relativePath, contents: fs.readFileSync(destinationPath) });
    }
  }

  return files;
}

function restoreCustomImageFiles(destinationImageDir: string, customImages: CustomImageFile[]): void {
  for (const image of customImages) {
    const destinationPath = path.join(destinationImageDir, image.relativePath);
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, image.contents);
  }
}
