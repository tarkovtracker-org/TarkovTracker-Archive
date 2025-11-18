#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type VulnerabilityDetails = Record<
  string,
  {
    name?: string;
    severity?: string;
    title?: string;
    url?: string;
    fixAvailable?:
      | boolean
      | {
          name?: string;
          version?: string;
        };
  }
>;

type AuditReport = {
  workspace: string;
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
  details: VulnerabilityDetails;
  error?: boolean;
};

type AuditJson = {
  metadata?: {
    vulnerabilities?: Partial<Record<'total' | 'critical' | 'high' | 'moderate' | 'low' | 'info', number>>;
  };
  vulnerabilities?: VulnerabilityDetails;
};

type ExecError = Error & {
  stdout?: Buffer | string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

const workspaces = ['functions', 'frontend'];

console.log('🔒 Security Audit Report for TarkovTracker');
console.log('=============================================\n');

function parseAuditOutput(raw: string, workspaceLabel: string): AuditReport {
  const report = JSON.parse(raw) as AuditJson;
  const vulns = report.metadata?.vulnerabilities ?? {};

  return {
    workspace: workspaceLabel,
    total: vulns.total ?? 0,
    critical: vulns.critical ?? 0,
    high: vulns.high ?? 0,
    moderate: vulns.moderate ?? 0,
    low: vulns.low ?? 0,
    info: vulns.info ?? 0,
    details: report.vulnerabilities ?? {},
  };
}

function isExecError(error: unknown): error is ExecError {
  return error instanceof Error && 'stdout' in error;
}

function runAudit(workspace: string | null = null): AuditReport {
  const cmd = workspace ? `npm audit --workspace=${workspace} --json` : 'npm audit --json';

  try {
    const output = execSync(cmd, { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' });
    return parseAuditOutput(output, workspace ?? 'root');
  } catch (error) {
    if (isExecError(error) && error.stdout) {
      const stdout = typeof error.stdout === 'string' ? error.stdout : error.stdout.toString('utf8');
      return parseAuditOutput(stdout, workspace ?? 'root');
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error running audit for ${workspace ?? 'root'}:`, message);
    return {
      workspace: workspace ?? 'root',
      total: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      details: {},
      error: true,
    };
  }
}

console.log('📊 Auditing workspaces...\n');

const reports: AuditReport[] = [];
reports.push(runAudit());

for (const workspace of workspaces) {
  reports.push(runAudit(workspace));
}

console.log('📋 Security Scan Results');
console.log('======================\n');

let totalVulnerabilities = 0;
let hasCriticalOrHigh = false;

for (const report of reports) {
  console.log(`📦 ${report.workspace}:`);

  if (report.error) {
    console.log('  ❌ Audit failed');
    console.log('');
    continue;
  }

  if (report.total === 0) {
    console.log('  ✅ No vulnerabilities found\n');
  } else {
    console.log(`  🚨 ${report.total} vulnerabilities found:`);

    if (report.critical > 0) {
      console.log(`    🔴 ${report.critical} critical`);
      hasCriticalOrHigh = true;
    }
    if (report.high > 0) {
      console.log(`    🟠 ${report.high} high`);
      hasCriticalOrHigh = true;
    }
    if (report.moderate > 0) {
      console.log(`    🟡 ${report.moderate} moderate`);
    }
    if (report.low > 0) {
      console.log(`    🟢 ${report.low} low`);
    }
    if (report.info > 0) {
      console.log(`    🔵 ${report.info} info`);
    }

    for (const [, vuln] of Object.entries(report.details)) {
      if (vuln.severity === 'critical' || vuln.severity === 'high') {
        console.log(`\n    📝 ${vuln.name ?? 'Unknown package'} (${vuln.severity})`);
        console.log(`       ${vuln.title ?? 'No title available'}`);
        if (vuln.url) {
          console.log(`       🔗 More info: ${vuln.url}`);
        }
        if (vuln.fixAvailable && typeof vuln.fixAvailable === 'object' && vuln.fixAvailable.version) {
          console.log(
            `       💡 Fix available: ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}`
          );
        }
      }
    }

    console.log('');
  }

  totalVulnerabilities += report.total;
}

console.log('📈 Summary');
console.log('===========');
console.log(`Total vulnerabilities across all workspaces: ${totalVulnerabilities}`);

if (totalVulnerabilities === 0) {
  console.log('🎉 Security scan passed - no vulnerabilities detected!');
} else {
  console.log(`\n🔧 To fix vulnerabilities, run:`);
  console.log('  npm audit fix                 # Auto-fix where possible');
  console.log('  npm audit fix --force         # Force updates (may break compatibility)');
  console.log('\n💡 Manual updates may be required for some packages.');
}

if (hasCriticalOrHigh) {
  console.log('\n❌ CRITICAL or HIGH vulnerabilities detected!');
  console.log('🚨 Immediate attention required before deploying to production.');
  process.exit(1);
} else if (totalVulnerabilities > 0) {
  console.log('\n⚠️  Vulnerabilities detected. Consider addressing them before production deployment.');
  process.exit(1);
} else {
  console.log('\n✅ Security scan completed successfully.');
  process.exit(0);
}
