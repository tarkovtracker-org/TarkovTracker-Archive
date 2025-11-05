#!/usr/bin/env node
/* eslint-env node */

import { spawnSync } from 'node:child_process';

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

    if ((status === null || status === undefined) && error) {
      const detail = error.message ?? String(error);
      message += ` - spawn error: ${detail}`;
    } else if (error) {
      const detail = error.message ?? String(error);
      message += ` - error: ${detail}`;
    }

    console.error(message);
  }
}

if (didFail) {
  console.error('\nLint completed with failures. Review output above for details.');
  process.exit(1);
}

console.log('\nLint completed successfully.');
