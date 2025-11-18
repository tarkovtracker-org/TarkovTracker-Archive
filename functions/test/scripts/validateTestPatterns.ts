#!/usr/bin/env node

/**
 * Test Pattern Validation Script
 * Enforces consistent helper usage, descriptive naming, and Firestore safety.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.join(__dirname, '..');

type FirestoreValidation = {
  hasManualResetDb: boolean;
  hasFirestoreInUnit: boolean;
};

type ValidationReport = {
  totalFiles: number;
  firestoreUsageCompliance: Record<string, FirestoreValidation>;
  summary: {
    needsImprovement: number;
    compliant: number;
  };
  failingFiles: string[];
};

class TestPatternValidator {
  static validateFirestoreUsage(filePath: string): FirestoreValidation {
    const content = readFileSync(filePath, 'utf8');
    const isUnitTest = filePath.includes(`${path.sep}unit${path.sep}`);

    const hasManualResetDb = /resetDb\s*\(/.test(content) || /seedDb\s*\(/.test(content);
    const hasFirestoreInUnit =
      isUnitTest &&
      (content.includes("from '../../helpers") ||
        content.includes('firebase-admin') ||
        content.includes('admin.firestore'));

    return { hasManualResetDb, hasFirestoreInUnit };
  }

  static getAllTestFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.git'].includes(entry.name)) {
          files.push(...this.getAllTestFiles(fullPath));
        }
      } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  static generateReport(): ValidationReport {
    const report: ValidationReport = {
      totalFiles: 0,
      firestoreUsageCompliance: {},
      summary: { needsImprovement: 0, compliant: 0 },
      failingFiles: [],
    };

    const testFiles = this.getAllTestFiles(TEST_DIR);
    report.totalFiles = testFiles.length;

    for (const filePath of testFiles) {
      const relativePath = path.relative(TEST_DIR, filePath);
      const firestoreValidation = this.validateFirestoreUsage(filePath);
      report.firestoreUsageCompliance[relativePath] = firestoreValidation;

      if (firestoreValidation.hasManualResetDb || firestoreValidation.hasFirestoreInUnit) {
        report.summary.needsImprovement += 1;
        report.failingFiles.push(relativePath);
      } else {
        report.summary.compliant += 1;
      }
    }

    return report;
  }

  static printReport(report: ValidationReport): void {
    console.log('\n🧪 Firestore Pattern Validation Report\n');
    console.log('=====================================\n');
    console.log(`📊 Summary:`);
    console.log(`   Total test files: ${report.totalFiles}`);
    console.log(`   Compliant: ${report.summary.compliant}`);
    console.log(`   Needs improvement: ${report.summary.needsImprovement}`);
    console.log(
      `   Compliance rate: ${
        report.totalFiles
          ? ((report.summary.compliant / report.totalFiles) * 100).toFixed(1)
          : '100.0'
      }%\n`
    );

    if (report.summary.needsImprovement > 0) {
      console.log('🔍 Files needing improvement:');
      Object.entries(report.firestoreUsageCompliance)
        .filter(([, validation]) => validation.hasManualResetDb)
        .forEach(([file]) => console.log(`   ❌ ${file} - Manual resetDb/seedDb usage detected`));

      Object.entries(report.firestoreUsageCompliance)
        .filter(([, validation]) => validation.hasFirestoreInUnit)
        .forEach(([file]) =>
          console.log(`   ❌ ${file} - Unit test importing Firestore/emulator helpers`)
        );
    }

    console.log('\n✅ Recommendations:');
    console.log('   1. Never call resetDb/seedDb manually; rely on suite helpers');
    console.log('   2. Keep firebase-admin/emulator imports out of unit tests');
  }
}

function isExecutedDirectly(): boolean {
  try {
    if (!process.argv[1]) {
      return false;
    }

    return pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isExecutedDirectly()) {
  const report = TestPatternValidator.generateReport();
  TestPatternValidator.printReport(report);
  process.exit(report.summary.needsImprovement > 0 ? 1 : 0);
}
