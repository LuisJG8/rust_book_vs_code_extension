const PROMPT_PATTERNS = [
  /^\s*\$\s+(.+)$/,
  /^\s*>\s+(.+)$/,
  /^\s*PS(?:\s+[^>]*)?>\s+(.+)$/i,
  /^\s*[A-Z]:\\[^>]*>\s*(.+)$/i
];

const SHELL_SYNTAX = /[;&|<>`$(){}[\]*?~!#\n\r]/;
const SAFE_TOKEN = /^[A-Za-z0-9._/@:=,+-]+$/;

const ALLOWED_COMMANDS: Record<string, ReadonlySet<string>> = {
  cargo: new Set([
    '--version',
    '-V',
    'build',
    'check',
    'clean',
    'clippy',
    'doc',
    'fmt',
    'new',
    'run',
    'test',
    'update',
    'version'
  ]),
  rustc: new Set(['--version', '-V']),
  rustup: new Set(['--version', '-V', 'show', 'update'])
};

export function extractRunnableCommands(rawBlockText: string): string[] {
  const lines = rawBlockText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''));

  const promptedCommands: string[] = [];

  for (const line of lines) {
    for (const pattern of PROMPT_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]?.trim()) {
        promptedCommands.push(match[1].trim());
        break;
      }
    }
  }

  if (promptedCommands.length > 0) {
    return promptedCommands.filter(isSafeRunnableCommand);
  }

  const nonEmptyLines = lines.map((line) => line.trim()).filter(Boolean);

  if (nonEmptyLines.length === 0) {
    return [];
  }

  if (nonEmptyLines.every(isSafeRunnableCommand)) {
    return nonEmptyLines;
  }

  if (nonEmptyLines.length === 1 && isSafeRunnableCommand(nonEmptyLines[0])) {
    return [nonEmptyLines[0]];
  }

  return [];
}

function isSafeRunnableCommand(command: string): boolean {
  if (!command || SHELL_SYNTAX.test(command)) {
    return false;
  }

  const tokens = command.split(/\s+/).filter(Boolean);
  const [program, subcommand] = tokens;

  if (!program || !subcommand || !tokens.every((token) => SAFE_TOKEN.test(token))) {
    return false;
  }

  return ALLOWED_COMMANDS[program]?.has(subcommand) ?? false;
}
