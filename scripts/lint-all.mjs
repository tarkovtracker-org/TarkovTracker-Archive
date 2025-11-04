#!/usr/bin/env node

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

  const { status } = spawnSync(command[0], command.slice(1), {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (status === 0) {
    console.log(`✔ ${label} passed`);
  } else {
    didFail = true;
    console.error(`✖ ${label} failed (exit code ${status ?? 'unknown'})`);
  }
}

if (didFail) {
  console.error('\nLint completed with failures. Review output above for details.');
  process.exit(1);
}

console.log('\nLint completed successfully.');
