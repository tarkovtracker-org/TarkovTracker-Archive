#!/usr/bin/env node

/**
 * OpenAPI Synchronization Check
 *
 * This script verifies that the committed OpenAPI specification files
 * are in sync with the current backend source code.
 *
 * It checks:
 * 1. functions/openapi/openapi.json - Generated from @openapi annotations
 * 2. frontend/public/api/openapi.json - Copy for frontend Scalar UI
 *
 * If either file has uncommitted changes after generation, the script
 * exits with non-zero status, causing CI to fail.
 *
 * Usage:
 *   npm run docs:check        # Generate and check
 *   npm run docs              # Generate only (for local development)
 *
 * Why this matters:
 * - Ensures API documentation stays accurate
 * - Prevents documentation drift
 * - Forces developers to regenerate docs after API changes
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Files to check for synchronization
const filesToCheck: readonly string[] = [
  'functions/openapi/openapi.json',
  'frontend/public/api/openapi.json',
];

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
} as const;

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${'='.repeat(70)}`, colors.blue);
  log(`  ${title}`, colors.bright + colors.blue);
  log('='.repeat(70), colors.blue);
}

function logSuccess(message: string): void {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string): void {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string): void {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string): void {
  log(`ℹ️  ${message}`, colors.blue);
}

/**
 * Check if files exist
 */
function checkFilesExist(): boolean {
  logSection('Checking OpenAPI Files');

  let allExist = true;

  for (const file of filesToCheck) {
    const fullPath = resolve(projectRoot, file);
    if (existsSync(fullPath)) {
      logSuccess(`Found: ${file}`);
    } else {
      logError(`Missing: ${file}`);
      allExist = false;
    }
  }

  if (!allExist) {
    logError('\nSome OpenAPI files are missing!');
    logInfo('Run: npm run docs:generate');
    process.exit(1);
  }

  log('');
  return true;
}

/**
 * Check git status of OpenAPI files
 */
function checkGitStatus(): boolean {
  logSection('Checking Git Status');

  try {
    // Check if we're in a git repository
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: projectRoot,
      stdio: 'pipe',
    });
  } catch {
    logWarning('Not in a git repository - skipping git checks');
    return true;
  }

  let hasChanges = false;
  const changedFiles: string[] = [];

  for (const file of filesToCheck) {
    try {
      // Check if file has uncommitted changes
      // git diff --exit-code returns 0 if no changes, 1 if changes exist
      execSync(`git diff --exit-code "${file}"`, {
        cwd: projectRoot,
        stdio: 'pipe',
      });

      // Also check staged changes
      execSync(`git diff --cached --exit-code "${file}"`, {
        cwd: projectRoot,
        stdio: 'pipe',
      });

      logSuccess(`In sync: ${file}`);
    } catch {
      // Non-zero exit code means there are changes
      hasChanges = true;
      changedFiles.push(file);
      logError(`Out of sync: ${file}`);
    }
  }

  log('');

  if (hasChanges) {
    logSection('❌ OpenAPI Documentation Out of Sync!');
    log('\nThe following files have uncommitted changes:', colors.red);
    changedFiles.forEach((file) => {
      log(`  • ${file}`, colors.red);
    });

    log('\n' + '─'.repeat(70), colors.red);
    log('What this means:', colors.bright);
    log('  The OpenAPI documentation files do not match the backend source code.', colors.yellow);
    log('  This suggests that API endpoint annotations were changed without', colors.yellow);
    log('  regenerating the OpenAPI specification.', colors.yellow);

    log('\n' + '─'.repeat(70), colors.blue);
    log('How to fix:', colors.bright);
    log('  1. Run: npm run docs:generate', colors.green);
    log('  2. Review the changes: git diff functions/openapi/openapi.json', colors.green);
    log(
      '  3. Commit the updated files: git add functions/openapi/ frontend/public/api/',
      colors.green
    );
    log(
      '  4. Include in your commit: git commit --amend or git commit -m "docs: update OpenAPI spec"',
      colors.green
    );

    log('\n' + '─'.repeat(70), colors.blue);
    log('Why this check exists:', colors.bright);
    log('  • Keeps API documentation accurate and trustworthy', colors.blue);
    log('  • Prevents documentation drift from actual implementation', colors.blue);
    log('  • Ensures frontend clients have up-to-date contract definitions', colors.blue);
    log('  • Maintains Scalar UI documentation consistency', colors.blue);

    log('\n' + '─'.repeat(70), colors.red);
    log(
      'CI Check Failed: Commit the regenerated OpenAPI files to pass.',
      colors.bright + colors.red
    );
    log('─'.repeat(70) + '\n', colors.red);

    process.exit(1);
  }

  return true;
}

/**
 * Show diff summary
 */
function showDiffSummary(): void {
  logSection('Git Diff Summary');

  try {
    for (const file of filesToCheck) {
      try {
        const diff = execSync(`git diff --stat "${file}"`, {
          cwd: projectRoot,
          encoding: 'utf8',
          stdio: 'pipe',
        });

        if (diff.trim()) {
          log(`\n${file}:`, colors.magenta);
          log(diff, colors.reset);
        }
      } catch {
        // File might not have changes
      }
    }
  } catch {
    // Not a git repo or other git error
  }
}

/**
 * Main execution
 */
function main() {
  log('\n' + '═'.repeat(70), colors.blue);
  log('  OpenAPI Synchronization Check', colors.bright + colors.blue);
  log('═'.repeat(70) + '\n', colors.blue);

  logInfo('This check ensures OpenAPI documentation is up-to-date with source code.');
  logInfo('Files being checked:');
  filesToCheck.forEach((file) => {
    log(`  • ${file}`, colors.blue);
  });

  // Step 1: Check files exist
  checkFilesExist();

  // Step 2: Check git status
  const inSync = checkGitStatus();

  // Step 3: Show summary if there are changes
  if (!inSync) {
    showDiffSummary();
  }

  // Success!
  logSection('✅ Success!');
  logSuccess('OpenAPI documentation is in sync with backend source code.');
  log('');
  logInfo('The following files are up-to-date:');
  filesToCheck.forEach((file) => {
    log(`  ✓ ${file}`, colors.green);
  });
  log('');
  logInfo('API documentation is accurate and ready for use.');
  log('');

  process.exit(0);
}

// Run the check
main();
