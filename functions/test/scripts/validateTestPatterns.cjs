#!/usr/bin/env node

/**
 * Test Pattern Validation Script
 * Enforces consistent helper usage, descriptive naming, and Firestore safety.
 */

const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..');

class TestPatternValidator {
  static validateFirestoreUsage(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const isUnitTest = filePath.includes(`${path.sep}unit${path.sep}`);

    const hasManualResetDb = /resetDb\s*\(/.test(content) || /seedDb\s*\(/.test(content);
    const hasFirestoreInUnit =
      isUnitTest &&
      (content.includes("from '../../helpers") ||
        content.includes('firebase-admin') ||
        content.includes('admin.firestore'));

    return { hasManualResetDb, hasFirestoreInUnit };
  }

  static getAllTestFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
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

  static generateReport() {
    const report = {
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
        report.summary.needsImprovement++;
        report.failingFiles.push(relativePath);
      } else {
        report.summary.compliant++;
      }
    }

    return report;
  }

  static printReport(report) {
    console.log('\n🧪 Firestore Pattern Validation Report\n');
    console.log('=====================================\n');
    console.log(`📊 Summary:`);
    console.log(`   Total test files: ${report.totalFiles}`);
    console.log(`   Compliant: ${report.summary.compliant}`);
    console.log(`   Needs improvement: ${report.summary.needsImprovement}`);
    console.log(
      `   Compliance rate: ${report.totalFiles ? ((report.summary.compliant / report.totalFiles) * 100).toFixed(1) : '100.0'}%\n`
    );

    if (report.summary.needsImprovement > 0) {
      console.log('🔍 Files needing improvement:');
      Object.entries(report.firestoreUsageCompliance)
        .filter(([_, validation]) => validation.hasManualResetDb)
        .forEach(([file]) => console.log(`   ❌ ${file} - Manual resetDb/seedDb usage detected`));

      Object.entries(report.firestoreUsageCompliance)
        .filter(([_, validation]) => validation.hasFirestoreInUnit)
        .forEach(([file]) =>
          console.log(`   ❌ ${file} - Unit test importing Firestore/emulator helpers`)
        );
    }

    console.log('\n✅ Recommendations:');
    console.log('   1. Never call resetDb/seedDb manually; rely on suite helpers');
    console.log('   2. Keep firebase-admin/emulator imports out of unit tests');
  }
}

if (require.main === module) {
  const report = TestPatternValidator.generateReport();
  TestPatternValidator.printReport(report);
  process.exit(report.summary.needsImprovement > 0 ? 1 : 0);
}
