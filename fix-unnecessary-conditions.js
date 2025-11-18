#!/usr/bin/env node

import fs from 'node:fs';
/* global console */

// Read the lint output
const lintOutput = fs.readFileSync('lint-full-output.txt', 'utf8');
const lines = lintOutput.split('\n');

// Track file fixes
const fixes = new Map();

// Parse errors
lines.forEach((line) => {
  if (line.includes('error') && line.includes('@typescript-eslint/no-unnecessary-condition')) {
    // Extract file path and line number
    const match = line.match(/^([^:]+):(\d+):\d+\s+error\s+(.*)$/);
    if (match) {
      const filePath = match[1];
      const lineNumber = parseInt(match[2]) - 1; // 0-based
      const message = match[3];
      
      if (!fixes.has(filePath)) {
        fixes.set(filePath, []);
      }
      fixes.get(filePath).push({ line: lineNumber, message });
    }
  }
});

// Apply fixes
for (const [filePath, errorList] of fixes) {
  if (!fs.existsSync(filePath)) continue;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const contentLines = content.split('\n');
  
  // Sort by line number in reverse order to avoid offset issues
  errorList.sort((a, b) => b.line - a.line);
  
  for (const error of errorList) {
    if (error.line < contentLines.length) {
      const originalLine = contentLines[error.line];
      
      if (error.message.includes('Unnecessary optional chain')) {
        // Remove optional chaining operator
        contentLines[error.line] = originalLine.replace(/\?\./g, '.');
      } else if (error.message.includes('Unnecessary conditional, value is always truthy')) {
        // Replace `if (value)` with just the value when it's always truthy
        const match = originalLine.match(/^\s*if\s*\(([^)]+)\)\s*{\s*return\s+([^;]+);\s*}$/);
        if (match) {
          contentLines[error.line] = originalLine.replace(/if\s*\([^)]+\)\s*{\s*return\s+([^;]+);\s*}/, 'return $1');
        } else {
          // More generic approach - just remove the if part
          contentLines[error.line] = originalLine.replace(/if\s*\([^)]+\)\s*\{/, '{');
        }
      } else if (error.message.includes('Unnecessary conditional, value is always falsy')) {
        // Remove if statement that's always falsy
        contentLines[error.line] = originalLine.replace(/if\s*\([^)]+\)\s*{[^}]*}/, '');
      } else if (error.message.includes('expected left-hand side of `??` operator to be possibly null')) {
        // Remove unnecessary nullish coalescing
        contentLines[error.line] = originalLine.replace(/\s*\?\?\s*[^,;\n]+/, '');
      }
    }
  }
  
  fs.writeFileSync(filePath, contentLines.join('\n'), 'utf8');
  console.log(`Fixed ${errorList.length} errors in ${filePath}`);
}

console.log('Done fixing no-unnecessary-condition errors!');
