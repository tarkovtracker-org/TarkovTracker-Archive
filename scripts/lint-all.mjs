#!/usr/bin/env node
/* eslint-env node */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const rootScripts = (() => {
  try {
    const packageJsonUrl = new URL('../package.json', import.meta.url);
    const contents = readFileSync(packageJsonUrl, 'utf8');
    const parsed = JSON.parse(contents);
    return parsed?.scripts ?? {};
  } catch (error) {
    console.warn(
      '⚠ Unable to read root package.json while preparing lint tasks:',
      error
    );
    return {};
  }
})();

const tasks = [
  { label: 'eslint', command: ['eslint', '.'] },
  {
    label: 'frontend type-check',
    command: ['npm', 'run', 'type-check', '--workspace=frontend'],
  },
  {
    label: 'functions type-check',
    command: ['npm', 'run', 'type-check', '--workspace=functions'],
  },
  { label: 'markdownlint', command: ['npm', 'run', 'lint:md'] },
];

let didFail = false;

for (const { label, command } of tasks) {
  console.log(`\n▶ ${label}`);

  if (
    label === 'markdownlint' &&
    command[0] === 'npm' &&
    command[1] === 'run' &&
    command[2] === 'lint:md' &&
    !rootScripts['lint:md']
  ) {
    didFail = true;
    console.error(
      '✖ markdownlint skipped: root package.json is missing the lint:md script.'
    );
    continue;
  }

  const result = spawnSync(command[0], command.slice(1), {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const { status, error } = result;

  if (status === 0) {
    console.log(`✔ ${label} passed`);
  } else {
    didFail = true;
    const exitCode = status ?? 'unknown';
    let message = `✖ ${label} failed (exit code ${exitCode})`;

    if (error) {
      const detail = error.message ?? String(error);

      if (status === null || status === undefined) {
        message += ` - spawn error: ${detail}`;
      } else {
        message += ` - error: ${detail}`;
      }
    }

    console.error(message);
  }
}

if (didFail) {
  console.error('\nLint completed with failures. Review output above for details.');
  process.exit(1);
}

console.log('\nLint completed successfully.');
