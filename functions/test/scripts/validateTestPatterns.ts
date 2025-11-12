#!/usr/bin/env node

/**
 * Test Pattern Validation Script
 * Ensures all test files follow maintainable patterns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const TEST_DIR = path.join(path.dirname(__filename), '..');

interface MockPatternValidation {
  usesMockManager: boolean;
  usesOldPatterns: boolean;
  isValid: boolean;
}

interface TestNamingValidation {
  descriptiveTests: number;
  nonDescriptiveTests: number;
  totalTests: number;
  namingScore: number;
}

interface TestHelpersValidation {
  usesServiceTestHelpers: boolean;
  usesDatabaseTestHelpers: boolean;
  hasCustomHelpers: boolean;
  usesProperPatterns: boolean;
}

interface ValidationReport {
  totalFiles: number;
  mockPatternCompliance: Record<string, MockPatternValidation>;
  testNamingCompliance: Record<string, TestNamingValidation>;
  helperUsageCompliance: Record<string, TestHelpersValidation>;
  summary: {
    needsImprovement: number;
    compliant: number;
  };
}

class TestPatternValidator {
  /**
   * Check if test file uses proper mock patterns
   */
  static validateMockPatterns(filePath: string): MockPatternValidation {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for proper MockManager usage
    const hasMockManager = content.includes('MockManager');
    const hasOldScatteredMocks = content.includes('vi.mock(') && content.includes('vi.fn().mockResolvedValue');

    return {
      usesMockManager: hasMockManager,
      usesOldPatterns: hasOldScatteredMocks,
      isValid: hasMockManager || !hasOldScatteredMocks
    };
  }

  /**
   * Check test naming conventions
   */
  static validateTestNaming(filePath: string): TestNamingValidation {
    const content = fs.readFileSync(filePath, 'utf8');

    // Look for descriptive test names
    const descriptiveTests = (content.match(/it\('should [^']*'/g) || []).length;
    const nonDescriptiveTests = (content.match(/it\('^(?!should)/g) || []).length;
    const totalTests = descriptiveTests + nonDescriptiveTests;

    return {
      descriptiveTests,
      nonDescriptiveTests,
      totalTests,
      namingScore: totalTests > 0 ? (descriptiveTests / totalTests) * 100 : 100
    };
  }

  /**
   * Check for TestHelpers usage
   */
  static validateTestHelpers(filePath: string): TestHelpersValidation {
    const content = fs.readFileSync(filePath, 'utf8');

    const usesServiceTestHelpers = content.includes('ServiceTestHelpers');
    const usesDatabaseTestHelpers = content.includes('DatabaseTestHelpers');
    const hasCustomHelpers = content.includes('createMock') || content.includes('expectAsyncError');

    return {
      usesServiceTestHelpers,
      usesDatabaseTestHelpers,
      hasCustomHelpers,
      usesProperPatterns: usesServiceTestHelpers || usesDatabaseTestHelpers || hasCustomHelpers
    };
  }

  /**
   * Get all test files recursively
   */
  static getAllTestFiles(dir: string): string[] {
    const files: string[] = [];

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        if (item.name !== 'node_modules' && item.name !== '.git') {
          files.push(...this.getAllTestFiles(fullPath));
        }
      } else if (item.name.endsWith('.test.ts') || item.name.endsWith('.test.js')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Generate validation report
   */
  static generateReport(): ValidationReport {
    const testFiles = this.getAllTestFiles(TEST_DIR);
    const report: ValidationReport = {
      totalFiles: testFiles.length,
      mockPatternCompliance: {},
      testNamingCompliance: {},
      helperUsageCompliance: {},
      summary: {
        needsImprovement: 0,
        compliant: 0
      }
    };

    testFiles.forEach(filePath => {
      const relativePath = path.relative(TEST_DIR, filePath);
      const mockValidation = this.validateMockPatterns(filePath);
      const namingValidation = this.validateTestNaming(filePath);
      const helperValidation = this.validateTestHelpers(filePath);

      report.mockPatternCompliance[relativePath] = mockValidation;
      report.testNamingCompliance[relativePath] = namingValidation;
      report.helperUsageCompliance[relativePath] = helperValidation;

      if (!mockValidation.isValid || namingValidation.namingScore < 80 || !helperValidation.usesProperPatterns) {
        report.summary.needsImprovement++;
      } else {
        report.summary.compliant++;
      }
    });

    return report;
  }

  /**
   * Print validation results
   */
  static printReport(report: ValidationReport): void {
    console.log('\n🧪 Test Pattern Validation Report\n');
    console.log('=====================================\n');

    console.log(`📊 Summary:`);
    console.log(`   Total test files: ${report.totalFiles}`);
    console.log(`   Compliant: ${report.summary.compliant}`);
    console.log(`   Needs improvement: ${report.summary.needsImprovement}`);
    console.log(`   Compliance rate: ${((report.summary.compliant / report.totalFiles) * 100).toFixed(1)}%\n`);

    if (report.summary.needsImprovement > 0) {
      console.log('🔍 Files needing improvement:');
      Object.entries(report.mockPatternCompliance)
        .filter(([_, validation]) => !validation.isValid)
        .forEach(([file, _]) => {
          console.log(`   ❌ ${file} - Mock pattern issues`);
        });

      Object.entries(report.testNamingCompliance)
        .filter(([_, validation]) => validation.namingScore < 80)
        .forEach(([file, validation]) => {
          console.log(`   ❌ ${file} - Test naming (${validation.namingScore.toFixed(1)}% descriptive)`);
        });

      Object.entries(report.helperUsageCompliance)
        .filter(([_, validation]) => !validation.usesProperPatterns)
        .forEach(([file, _]) => {
          console.log(`   ❌ ${file} - Not using TestHelpers`);
        });
    }

    console.log('\n✅ Recommendations:');
    console.log('   1. Use MockManager for consistent mocking patterns');
    console.log('   2. Follow "should [expectation] when [condition]" test naming');
    console.log('   3. Use ServiceTestHelpers for common test operations');
    console.log('   4. Apply TestSuite base class for structure');
  }
}

// Run validation if this file is executed directly
if (import.meta.url) {
  const report = TestPatternValidator.generateReport();
  TestPatternValidator.printReport(report);

  // Exit with error code if files need improvement
  process.exit(report.summary.needsImprovement > 0 ? 1 : 0);
}