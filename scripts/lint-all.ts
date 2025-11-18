#!/usr/bin/env node
/* eslint-env node */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

type PackageScripts = Record<string, string>;
type LintTask = {
  label: string;
  command: string[];
  requiresScript?: string;
};

const rootScripts: PackageScripts = (() => {
  try {
    const packageJsonUrl = new URL('../package.json', import.meta.url);
    const contents = readFileSync(packageJsonUrl, 'utf8');
    const parsed = JSON.parse(contents) as { scripts?: PackageScripts };
    return parsed?.scripts ?? {};
  } catch (error) {
    console.warn('⚠ Unable to read root package.json while preparing lint tasks:', error);
    return {};
  }
})();

const tasks: LintTask[] = [
  // Use ESLint cache to dramatically speed up reruns; store cache in a stable path
  {
    label: 'eslint',
    command: ['eslint', '--cache', '--cache-location', '.cache/eslint', '.'],
  },
  {
    label: 'frontend type-check',
    command: ['npm', 'run', 'type-check', '--workspace=frontend'],
  },
  {
    label: 'functions type-check',
    command: ['npm', 'run', 'type-check', '--workspace=functions'],
  },
  {
    label: 'markdownlint',
    command: ['npm', 'run', 'lint:md'],
    requiresScript: 'lint:md',
  },
];

let didFail = false;

for (const { label, command, requiresScript } of tasks) {
  console.log(`\n▶ ${label}`);

  if (requiresScript && !rootScripts[requiresScript]) {
    didFail = true;
    console.error(
      `✖ ${label} skipped: root package.json is missing the ${requiresScript} script.`
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
