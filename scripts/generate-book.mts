#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSearchText,
  copyBookImages,
  extractMainContent,
  locateRustBookDir,
  parseTocFromHtml,
  resolveInsideRoot,
  rewriteLocalLinks,
  type TocChapter,
  type TocPage
} from './bookTools.mjs';

type BookPage = TocPage & {
  html: string;
  searchText: string;
};

type BookChapter = Omit<TocChapter, 'pages'> & {
  pages: BookPage[];
  searchText: string;
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(repoRoot, 'assets');
const exercisesPath = path.join(assetsDir, 'exercises.json');

if (!fs.existsSync(exercisesPath)) {
  throw new Error('Missing assets/exercises.json. Run pnpm run generate:exercises first.');
}

const bookDir = locateRustBookDir();
const tocPath = path.join(bookDir, 'toc.html');
const tocHtml = fs.readFileSync(tocPath, 'utf8');
const { chapters, allPages } = parseTocFromHtml(tocHtml);
const knownHrefs = new Set(allPages.map((page) => page.href));

const transformedChapters: BookChapter[] = chapters.map((chapter) => {
  const pages: BookPage[] = chapter.pages.map((page) => {
    const sourcePath = resolveInsideRoot(bookDir, page.href);
    const rawHtml = fs.readFileSync(sourcePath, 'utf8');
    const mainHtml = rewriteLocalLinks(extractMainContent(rawHtml), knownHrefs);

    return {
      ...page,
      html: mainHtml,
      searchText: buildSearchText(mainHtml)
    };
  });

  return {
    ...chapter,
    pages,
    searchText: pages.map((page) => `${page.label} ${page.title} ${page.searchText}`).join('\n')
  };
});

fs.mkdirSync(assetsDir, { recursive: true });
copyBookImages(bookDir, assetsDir);

const book = {
  generatedAt: new Date().toISOString(),
  source: {
    kind: 'rustup-doc-book',
    path: bookDir,
    versionNote: 'Generated from the local Rust Book HTML returned by rustup doc --path --book.'
  },
  license: {
    content: 'The Rust Book content is copyright The Rust Project Developers and licensed under Apache-2.0 or MIT at your option.',
    extension: 'Extension code is MIT licensed.'
  },
  chapters: transformedChapters
};

fs.writeFileSync(path.join(assetsDir, 'book.json'), `${JSON.stringify(book, null, 2)}\n`);
console.log(`Generated ${transformedChapters.length} chapters from ${bookDir}`);
