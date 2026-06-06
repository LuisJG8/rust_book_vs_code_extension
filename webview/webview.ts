type VsCodeApi = {
  postMessage(message: WebviewOutboundMessage): void;
};

type WebviewOutboundMessage =
  | { type: 'copy'; text: string }
  | { type: 'runCommand'; text: string }
  | { type: 'runRust'; code: string; label: string }
  | { type: 'openExercise'; exercise: Exercise }
  | { type: 'ready' };

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
  chapters: Record<string, Exercise[]>;
};

type RuntimeData = {
  initialChapter?: number;
  bookMediaBaseUri: string;
  ferrisLogoUri: string;
};

type PersistedState = {
  completedChapters: number[];
  coursePanelHidden: boolean;
  coursePanelWidth: number;
  currentChapterNumber?: number;
};

type PageIndexEntry = {
  chapterNumber: number;
  page: BookPage;
};

type CodeBlockKind = 'console' | 'rust' | 'rust-static' | 'code';

type HighlightToken = {
  text: string;
  className: string;
};

declare function acquireVsCodeApi(): VsCodeApi;

(function () {
  const vscode = acquireVsCodeApi();
  const book = readJson<BookData>('book-data');
  const exercises = readJson<ExerciseData>('exercise-data');
  const runtime = readJson<RuntimeData>('runtime-data');
  const app = document.getElementById('app') as HTMLElement;
  const pageIndex = new Map<string, PageIndexEntry>();
  const storageKey = 'rustBookCourse.state.v1';
  const state = loadState();

  let currentChapterNumber = chooseInitialChapter();
  let searchQuery = '';
  let completionCheckFrame = 0;

  for (const chapter of book.chapters) {
    for (const page of chapter.pages) {
      pageIndex.set(page.href, { chapterNumber: chapter.number, page });
    }
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'selectChapter' && event.data.chapterNumber) {
      selectChapter(event.data.chapterNumber);
    }
  });

  render();
  vscode.postMessage({ type: 'ready' });

  function readJson<T>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing webview JSON payload: ${id}`);
    }

    return JSON.parse(element.textContent || 'null') as T;
  }

  function queryRequired<T extends Element>(root: ParentNode, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing webview element: ${selector}`);
    }

    return element;
  }

  function loadState(): PersistedState {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      return {
        completedChapters: parsed?.completedChapters || [],
        coursePanelHidden: Boolean(parsed?.coursePanelHidden),
        coursePanelWidth: clampCoursePanelWidth(Number(parsed?.coursePanelWidth) || 320),
        currentChapterNumber: parsed?.currentChapterNumber
      };
    } catch {
      return { completedChapters: [], coursePanelHidden: false, coursePanelWidth: 320 };
    }
  }

  function saveState(): void {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function chooseInitialChapter(): number {
    const saved = Number(state.currentChapterNumber);
    const requested = Number(runtime.initialChapter);
    const candidate = requested || saved || 1;
    return book.chapters.some((chapter) => chapter.number === candidate) ? candidate : 1;
  }

  function render(): void {
    app.innerHTML = `
      <div class="course-layout ${state.coursePanelHidden ? 'nav-collapsed' : ''}" style="--course-nav-width: ${state.coursePanelWidth}px">
        <aside class="sidebar" aria-label="Rust Book chapters">
          <div class="sidebar-header">
            <div class="brand-row">
              <div class="brand-lockup">
                <div class="brand-mark">
                  <img class="brand-mascot" src="${escapeAttribute(runtime.ferrisLogoUri)}" alt="Ferris crab mascot">
                </div>
                <div>
                  <p class="brand-title">Rust Book Course</p>
                  <p class="brand-subtitle">Interactive reader and practice</p>
                </div>
              </div>
              <button class="icon-button hide-course" type="button" title="Hide course navigation" aria-label="Hide course navigation">
                <span aria-hidden="true">‹</span>
              </button>
            </div>
            <input class="search-input" type="search" placeholder="Search chapters" value="${escapeAttribute(searchQuery)}" aria-label="Search chapters">
          </div>
          <div class="chapter-list"></div>
          <div class="sidebar-resizer" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize course navigation" title="Drag to resize course navigation"></div>
        </aside>
        <main class="reader">
          <div class="reader-toolbar">
            <h1></h1>
            <div class="toolbar-actions">
              <button class="action-button secondary-button show-course" type="button">Show Chapters</button>
              <button class="action-button secondary-button previous-chapter" type="button">Previous</button>
              <button class="action-button secondary-button next-chapter" type="button">Next</button>
            </div>
          </div>
          <article class="reader-content"></article>
        </main>
      </div>
    `;

    queryRequired<HTMLElement>(app, '.hide-course').addEventListener('click', () => setCoursePanelHidden(true));
    queryRequired<HTMLElement>(app, '.show-course').addEventListener('click', () => setCoursePanelHidden(false));
    installSidebarResizer();
    queryRequired<HTMLInputElement>(app, '.search-input').addEventListener('input', (event) => {
      searchQuery = (event.target as HTMLInputElement).value;
      renderChapterList();
    });

    queryRequired<HTMLElement>(app, '.previous-chapter').addEventListener('click', () => selectRelativeChapter(-1));
    queryRequired<HTMLElement>(app, '.next-chapter').addEventListener('click', () => selectRelativeChapter(1));
    installChapterCompletionWatcher();

    renderChapterList();
    renderCurrentChapter();
  }

  function installChapterCompletionWatcher(): void {
    window.addEventListener('scroll', scheduleChapterCompletionCheck, { passive: true });
    window.addEventListener('resize', scheduleChapterCompletionCheck);
  }

  function scheduleChapterCompletionCheck(): void {
    if (!isReaderAtBottom()) {
      return;
    }

    if (completionCheckFrame) {
      return;
    }

    const completedChapterNumber = currentChapterNumber;

    completionCheckFrame = requestAnimationFrame(() => {
      completionCheckFrame = 0;
      markChapterComplete(completedChapterNumber);
    });
  }

  function isReaderAtBottom(): boolean {
    const documentElement = document.documentElement;
    const body = document.body;
    const scrollTop = window.scrollY || documentElement.scrollTop || body.scrollTop || 0;
    const viewportHeight = window.innerHeight || documentElement.clientHeight;
    const documentHeight = Math.max(
      body.scrollHeight,
      documentElement.scrollHeight,
      body.offsetHeight,
      documentElement.offsetHeight
    );

    return scrollTop + viewportHeight >= documentHeight - 24;
  }

  function setCoursePanelHidden(hidden: boolean): void {
    state.coursePanelHidden = hidden;
    if (!hidden) {
      state.coursePanelWidth = clampCoursePanelWidth(state.coursePanelWidth || 320);
      app.querySelector<HTMLElement>('.course-layout')?.style.setProperty('--course-nav-width', `${state.coursePanelWidth}px`);
    }
    saveState();
    app.querySelector('.course-layout')?.classList.toggle('nav-collapsed', hidden);
  }

  function installSidebarResizer(): void {
    const layout = app.querySelector<HTMLElement>('.course-layout');
    const resizer = app.querySelector<HTMLElement>('.sidebar-resizer');

    if (!layout || !resizer) {
      return;
    }

    let startX = 0;
    let startWidth = 0;
    let latestWidth = state.coursePanelWidth;

    updateResizerValue(resizer, latestWidth);

    resizer.addEventListener('pointerdown', (event: PointerEvent) => {
      startX = event.clientX;
      startWidth = state.coursePanelWidth || 320;
      latestWidth = startWidth;
      document.body.classList.add('resizing-course-nav');
      resizer.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    resizer.addEventListener('pointermove', (event: PointerEvent) => {
      if (!document.body.classList.contains('resizing-course-nav')) {
        return;
      }

      latestWidth = startWidth + event.clientX - startX;

      if (latestWidth <= courseCollapseThreshold()) {
        layout.classList.add('nav-preview-collapse');
        layout.style.setProperty('--course-nav-width', `${Math.max(0, Math.round(latestWidth))}px`);
        updateResizerValue(resizer, latestWidth);
        return;
      }

      layout.classList.remove('nav-preview-collapse');
      state.coursePanelWidth = clampCoursePanelWidth(latestWidth);
      layout.style.setProperty('--course-nav-width', `${state.coursePanelWidth}px`);
      updateResizerValue(resizer, state.coursePanelWidth);
    });

    resizer.addEventListener('pointerup', (event: PointerEvent) => {
      finishResize(event.pointerId, latestWidth, resizer, layout);
    });

    resizer.addEventListener('pointercancel', (event: PointerEvent) => {
      finishResize(event.pointerId, latestWidth, resizer, layout);
    });

    resizer.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        state.coursePanelWidth = clampCoursePanelWidth(state.coursePanelWidth - 24);
      } else if (event.key === 'ArrowRight') {
        state.coursePanelWidth = clampCoursePanelWidth(state.coursePanelWidth + 24);
      } else if (event.key === 'Escape') {
        setCoursePanelHidden(true);
        return;
      } else {
        return;
      }

      layout.style.setProperty('--course-nav-width', `${state.coursePanelWidth}px`);
      updateResizerValue(resizer, state.coursePanelWidth);
      saveState();
      event.preventDefault();
    });
  }

  function finishResize(pointerId: number, latestWidth: number, resizer: HTMLElement, layout: HTMLElement): void {
    if (!document.body.classList.contains('resizing-course-nav')) {
      return;
    }

    document.body.classList.remove('resizing-course-nav');
    layout.classList.remove('nav-preview-collapse');

    try {
      resizer.releasePointerCapture(pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }

    if (latestWidth <= courseCollapseThreshold()) {
      setCoursePanelHidden(true);
      return;
    }

    state.coursePanelWidth = clampCoursePanelWidth(latestWidth);
    layout.style.setProperty('--course-nav-width', `${state.coursePanelWidth}px`);
    updateResizerValue(resizer, state.coursePanelWidth);
    saveState();
  }

  function clampCoursePanelWidth(width: number): number {
    const maximum = Math.max(280, Math.min(760, window.innerWidth - 360));
    return Math.round(Math.min(Math.max(width, 240), maximum));
  }

  function updateResizerValue(resizer: HTMLElement, width: number): void {
    resizer.setAttribute('aria-valuemin', '0');
    resizer.setAttribute('aria-valuemax', String(Math.max(280, Math.min(760, window.innerWidth - 360))));
    resizer.setAttribute('aria-valuenow', String(Math.max(0, Math.round(width))));
  }

  function courseCollapseThreshold(): number {
    return 170;
  }

  function renderChapterList(): void {
    const list = queryRequired<HTMLElement>(app, '.chapter-list');
    const query = searchQuery.trim().toLowerCase();
    const visibleChapters = book.chapters.filter((chapter) => {
      if (!query) {
        return true;
      }

      return `${chapter.number} ${chapter.title} ${chapter.searchText}`.toLowerCase().includes(query);
    });

    if (visibleChapters.length === 0) {
      list.innerHTML = '<div class="empty-state">No chapters match that search.</div>';
      return;
    }

    list.innerHTML = visibleChapters.map((chapter) => {
      const isCurrent = chapter.number === currentChapterNumber;
      const isCompleted = state.completedChapters.includes(chapter.number);
      return `
        <button class="chapter-button ${isCompleted ? 'completed' : ''}" type="button" data-chapter-number="${chapter.number}" aria-current="${isCurrent ? 'true' : 'false'}">
          <span class="chapter-number">${chapter.number}</span>
          <span class="chapter-copy">
            <span class="chapter-heading-line">
              <span class="chapter-title">${escapeHtml(chapter.title)}</span>
              <span class="progress-dot" aria-hidden="true"></span>
            </span>
            <span class="chapter-meta">${chapter.pages.length} section${chapter.pages.length === 1 ? '' : 's'}</span>
          </span>
        </button>
      `;
    }).join('');

    list.querySelectorAll<HTMLElement>('.chapter-button').forEach((button) => {
      button.addEventListener('click', () => selectChapter(Number(button.dataset.chapterNumber)));
    });
  }

  function renderCurrentChapter(): void {
    const chapter = currentChapter();
    const article = queryRequired<HTMLElement>(app, '.reader-content');
    const heading = queryRequired<HTMLElement>(app, '.reader-toolbar h1');

    heading.textContent = `Chapter ${chapter.number}: ${chapter.title}`;

    article.innerHTML = `
      ${chapter.pages.map((page) => `
        <section class="page-section" data-page-href="${escapeAttribute(page.href)}">
          <p class="page-label">${escapeHtml(page.label)} · ${escapeHtml(page.title)}</p>
          ${page.html}
        </section>
      `).join('')}
      ${renderExercises(chapter.number)}
    `;

    hydrateImages(article);
    hydrateLocalLinks(article);
    hydrateCodeBlocks(article);
    hydrateExercises(article);
    state.currentChapterNumber = chapter.number;
    saveState();
    renderChapterList();
    article.scrollIntoView({ block: 'start' });
  }

  function renderExercises(chapterNumber: number): string {
    const chapterExercises = exercises.chapters[String(chapterNumber)] || [];

    if (chapterExercises.length === 0) {
      return '';
    }

    return `
      <section class="exercise-section" id="chapter-${chapterNumber}-exercises">
        <div class="exercise-header">
          <h2>Chapter ${chapterNumber} Exercises</h2>
          <span class="exercise-count">${chapterExercises.length} coding exercises</span>
        </div>
        <div class="exercise-list">
          ${chapterExercises.map((exercise, index) => `
            <article class="exercise-card" data-exercise-id="${escapeAttribute(exercise.id)}">
              <p class="exercise-focus">Exercise ${index + 1} · ${escapeHtml(exercise.conceptFocus)}</p>
              <h3>${escapeHtml(exercise.title)}</h3>
              <p>${escapeHtml(exercise.prompt)}</p>
              <p><strong>Expected:</strong> ${escapeHtml(exercise.expectedBehavior)}</p>
              <details>
                <summary>Hints</summary>
                <ul class="hint-list">
                  ${exercise.hints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join('')}
                </ul>
              </details>
              <div class="exercise-actions">
                <button class="action-button copy-exercise" type="button">Copy Starter</button>
                <button class="action-button open-exercise" type="button">Open Exercise</button>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function hydrateImages(root: ParentNode): void {
    root.querySelectorAll('img').forEach((image) => {
      const src = image.getAttribute('src') || '';
      if (!src || /^(?:https?:|data:|vscode-resource:|file:)/i.test(src)) {
        return;
      }

      image.src = `${runtime.bookMediaBaseUri}/${src.replace(/^\.\//, '')}`;
    });
  }

  function hydrateLocalLinks(root: ParentNode): void {
    root.querySelectorAll('a[data-book-href]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const href = link.getAttribute('data-book-href');
        const anchor = link.getAttribute('data-book-anchor') || '';
        const target = href ? pageIndex.get(href) : undefined;

        if (!target) {
          return;
        }

        selectChapter(target.chapterNumber);

        if (anchor) {
          requestAnimationFrame(() => {
            const element = document.getElementById(anchor.slice(1));
            element?.scrollIntoView({ block: 'start' });
          });
        }
      });
    });
  }

  function hydrateCodeBlocks(root: ParentNode): void {
    root.querySelectorAll<HTMLElement>('pre > code').forEach((codeElement, index) => {
      const pre = codeElement.parentElement;
      if (!pre || pre.parentElement?.classList.contains('code-shell')) {
        return;
      }

      const kind = classifyCodeBlock(codeElement.className);
      const codeText = codeElement.textContent || '';
      const shell = document.createElement('div');
      const toolbar = document.createElement('div');
      const actions = document.createElement('div');
      const label = document.createElement('span');

      if (kind === 'rust' || kind === 'rust-static') {
        codeElement.innerHTML = highlightRust(codeText);
      } else if (kind === 'console') {
        codeElement.innerHTML = highlightConsole(codeText);
      }

      shell.className = 'code-shell';
      toolbar.className = 'code-toolbar';
      actions.className = 'code-actions';
      label.className = 'code-kind';
      label.textContent = kind === 'console' ? 'Terminal' : kind === 'rust' || kind === 'rust-static' ? 'Rust' : 'Code';

      actions.appendChild(makeButton('Copy', 'secondary-button', () => copyText(codeText)));

      if (kind === 'console') {
        actions.appendChild(makeButton('Run in Terminal', '', () => {
          vscode.postMessage({ type: 'runCommand', text: codeText });
        }));
      }

      if (kind === 'rust') {
        actions.appendChild(makeButton('Open Rust Project', '', () => {
          vscode.postMessage({
            type: 'runRust',
            code: codeText,
            label: `Chapter ${currentChapterNumber} Snippet ${index + 1}`
          });
        }));
      }

      toolbar.append(label, actions);
      pre.replaceWith(shell);
      shell.append(toolbar, pre);
    });
  }

  function hydrateExercises(root: ParentNode): void {
    const chapterExercises = exercises.chapters[String(currentChapterNumber)] || [];

    root.querySelectorAll<HTMLElement>('.exercise-card').forEach((card) => {
      const exercise = chapterExercises.find((candidate) => candidate.id === card.dataset.exerciseId);

      if (!exercise) {
        return;
      }

      queryRequired<HTMLElement>(card, '.copy-exercise').addEventListener('click', () => copyText(exercise.starterCode));
      queryRequired<HTMLElement>(card, '.open-exercise').addEventListener('click', () => {
        vscode.postMessage({ type: 'openExercise', exercise });
      });
    });
  }

  function makeButton(label: string, extraClass: string, onClick: () => void) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `action-button ${extraClass}`.trim();
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function classifyCodeBlock(className: string): CodeBlockKind {
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

  function highlightRust(source: string): string {
    const tokenPattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|r#*"(?:[\s\S]*?)"#*|'(?:\\.|[^'\\])'|\b\d[\d_]*(?:\.\d[\d_]*)?\b|'[a-zA-Z_][a-zA-Z0-9_]*\b|\b[a-zA-Z_][a-zA-Z0-9_]*!|\b[a-zA-Z_][a-zA-Z0-9_]*\b|::|->|=>|[{}()[\],.;:+\-*/%=<>!&|^?])/g;
    const keywords = new Set([
      'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else',
      'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop',
      'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self',
      'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use',
      'where', 'while'
    ]);
    const types = new Set([
      'bool', 'char', 'f32', 'f64', 'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
      'str', 'String', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize', 'Vec', 'Option',
      'Result', 'Some', 'None', 'Ok', 'Err', 'Box', 'Rc', 'Arc', 'RefCell'
    ]);
    const tokens: HighlightToken[] = [];
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(source))) {
      const token = match[0];
      if (match.index > cursor) {
        tokens.push({ text: source.slice(cursor, match.index), className: '' });
      }
      tokens.push({ text: token, className: classifyRustToken(token, keywords, types) });
      cursor = match.index + token.length;
    }

    if (cursor < source.length) {
      tokens.push({ text: source.slice(cursor), className: '' });
    }

    applyRustContext(tokens, keywords);

    return tokens.map((token) => wrapToken(token.text, token.className)).join('');
  }

  function classifyRustToken(token: string, keywords: ReadonlySet<string>, types: ReadonlySet<string>): string {
    if (token.startsWith('//') || token.startsWith('/*')) {
      return 'tok-comment';
    }

    if (token.startsWith('"') || /^r#*"/.test(token)) {
      return 'tok-string';
    }

    if (/^'[^']*'$/.test(token)) {
      return 'tok-string';
    }

    if (/^'[a-zA-Z_]/.test(token)) {
      return 'tok-lifetime';
    }

    if (/^\d/.test(token)) {
      return 'tok-number';
    }

    if (token.endsWith('!')) {
      return 'tok-macro';
    }

    if (keywords.has(token)) {
      return 'tok-keyword';
    }

    if (types.has(token) || /^[A-Z][A-Za-z0-9_]*$/.test(token)) {
      return 'tok-type';
    }

    if (/^[{}()[\]]$/.test(token)) {
      return 'tok-bracket';
    }

    if (/^[,.;:+\-*/%=<>!&|^?]$/.test(token) || token === '::' || token === '->' || token === '=>') {
      return 'tok-operator';
    }

    return '';
  }

  function applyRustContext(tokens: HighlightToken[], keywords: ReadonlySet<string>): void {
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];

      if (!isIdentifier(token.text) || keywords.has(token.text) || token.className) {
        continue;
      }

      const next = nextMeaningfulToken(tokens, index);
      const previous = previousMeaningfulToken(tokens, index);

      if (next?.text === '::') {
        token.className = /^[A-Z]/.test(token.text) ? 'tok-type' : 'tok-namespace';
        continue;
      }

      if (previous?.text === '::' && next?.text !== '(') {
        token.className = /^[A-Z]/.test(token.text) ? 'tok-type' : 'tok-namespace';
        continue;
      }

      if (next?.text === '(') {
        token.className = previous?.text === 'fn' ? 'tok-function-declaration' : 'tok-function';
      }
    }
  }

  function isIdentifier(value: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
  }

  function nextMeaningfulToken(tokens: HighlightToken[], startIndex: number): HighlightToken | undefined {
    for (let index = startIndex + 1; index < tokens.length; index += 1) {
      if (tokens[index].text.trim()) {
        return tokens[index];
      }
    }

    return undefined;
  }

  function previousMeaningfulToken(tokens: HighlightToken[], startIndex: number): HighlightToken | undefined {
    for (let index = startIndex - 1; index >= 0; index -= 1) {
      if (tokens[index].text.trim()) {
        return tokens[index];
      }
    }

    return undefined;
  }

  function wrapToken(token: string, className: string): string {
    if (className === 'tok-string') {
      return `<span class="${className}">${highlightRustString(token)}</span>`;
    }

    const escaped = escapeHtml(token);
    return className ? `<span class="${className}">${escaped}</span>` : escaped;
  }

  function highlightRustString(token: string): string {
    return escapeHtml(token).replace(/(\{\{|\}\}|\{[^{}\n]+\})/g, (match) => {
      if (match === '{{' || match === '}}') {
        return match;
      }

      return `<span class="tok-format-placeholder">${match}</span>`;
    });
  }

  function highlightConsole(source: string): string {
    return source
      .split('\n')
      .map((line) => {
        const promptMatch = line.match(/^(\s*(?:\$|>|PS(?:\s+[^>]*)?>)\s+)(.*)$/i);
        if (promptMatch) {
          return `<span class="tok-terminal-prompt">${escapeHtml(promptMatch[1])}</span><span class="tok-terminal-command">${escapeHtml(promptMatch[2])}</span>`;
        }

        return `<span class="tok-terminal-output">${escapeHtml(line)}</span>`;
      })
      .join('\n');
  }

  function copyText(text: string): void {
    vscode.postMessage({ type: 'copy', text });
  }

  function selectChapter(chapterNumber: number): void {
    if (!book.chapters.some((chapter) => chapter.number === chapterNumber)) {
      return;
    }

    currentChapterNumber = chapterNumber;
    renderCurrentChapter();
  }

  function selectRelativeChapter(delta: number): void {
    const index = book.chapters.findIndex((chapter) => chapter.number === currentChapterNumber);
    const next = book.chapters[index + delta];

    if (next) {
      selectChapter(next.number);
    }
  }

  function markChapterComplete(chapterNumber: number): void {
    const completed = new Set(state.completedChapters);

    if (completed.has(chapterNumber)) {
      return;
    }

    completed.add(chapterNumber);
    state.completedChapters = Array.from(completed).sort((a, b) => a - b);
    saveState();
    renderChapterList();
  }

  function currentChapter(): BookChapter {
    return book.chapters.find((chapter) => chapter.number === currentChapterNumber) || book.chapters[0];
  }

  function escapeHtml(value: unknown): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value: unknown): string {
    return escapeHtml(value);
  }
})();
