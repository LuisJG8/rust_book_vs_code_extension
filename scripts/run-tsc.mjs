#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let tscPath;
try {
  tscPath = require.resolve('typescript/bin/tsc');
} catch {
  console.error('TypeScript is not available. Install dependencies with pnpm install, or make sure a local TypeScript package is resolvable.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [tscPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
