#!/usr/bin/env node
/**
 * Firebase Emulator Wrapper Script
 * 
 * Automatically cleans up Firebase debug logs when emulators shut down
 * Handles SIGINT/SIGTERM signals to ensure cleanup even on forced termination
 */
import { spawn } from 'child_process';
import { rm } from 'fs/promises';
import { glob } from 'glob';
// Track the emulator child process so we can forward termination signals
let emulatorProcess;
let shuttingDown = false;
// Cleanup function
async function cleanup() {
  console.log('🧹 Cleaning up Firebase debug logs...');
  
  const patterns = [
    'firebase-debug.log',
    'firebase-debug.*.log',
    'database-debug.log',
    'firestore-debug.log', 
    'pubsub-debug.log'
  ];
  try {
    // Expand all glob patterns to actual file paths
    const allMatches = await Promise.all(
      patterns.map(pattern => glob(pattern, { nodir: true }))
    );
    const filesToDelete = allMatches.flat();
    
    if (filesToDelete.length > 0) {
      const deletions = filesToDelete.map(file => rm(file, { force: true }));
      await Promise.all(deletions);
      console.log(`✅ Cleaned up ${filesToDelete.length} debug log(s)`);
    } else {
      console.log('✅ No debug logs found to clean');
    }
  } catch (error) {
    console.log('⚠️  Some debug logs could not be cleaned:', error.message);
  }
}
// Run the Firebase emulator command
const args = process.argv.slice(2);
emulatorProcess = spawn('firebase', ['emulators:start', ...args], {
  stdio: 'inherit',
  shell: true
});
async function terminateEmulator(timeoutMs = 5000) {
  const child = emulatorProcess;
  if (!child) {
    return;
  }
  if (child.exitCode !== null || child.killed) {
    if (emulatorProcess === child) {
      emulatorProcess = undefined;
    }
    return;
  }
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null && !child.killed) {
        child.kill('SIGKILL');
      }
    }, timeoutMs);
    const handleExit = () => {
      clearTimeout(timeout);
      if (emulatorProcess === child) {
        emulatorProcess = undefined;
      }
      resolve();
    };
    child.once('exit', handleExit);
    const terminated = child.kill('SIGTERM');
    if (!terminated) {
      clearTimeout(timeout);
      child.off('exit', handleExit);
      if (emulatorProcess === child) {
        emulatorProcess = undefined;
      }
      resolve();
    }
  });
}
async function handleSignal(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`\n📴 Received ${signal}, shutting down...`);
  try {
    await terminateEmulator();
  } catch (error) {
    console.error('⚠️  Failed to terminate emulator process cleanly:', error);
  }
  await cleanup();
  if (signal === 'SIGINT') {
    process.exit(130);
  } else {
    process.exit(143);
  }
}
// Setup signal handlers for graceful shutdown
process.on('SIGINT', () => {
  handleSignal('SIGINT').catch((error) => {
    console.error('❌ SIGINT handler failed:', error);
    process.exit(1);
  });
});
process.on('SIGTERM', () => {
  handleSignal('SIGTERM').catch((error) => {
    console.error('❌ SIGTERM handler failed:', error);
    process.exit(1);
  });
});
// Handle process exit
emulatorProcess.on('close', async (code) => {
  emulatorProcess = undefined;
  const alreadyShuttingDown = shuttingDown;
  shuttingDown = true;
  if (alreadyShuttingDown) {
    return;
  }
  console.log(`\n🔚 Emulators exited with code ${code}`);
  await cleanup();
  process.exit(code);
});
emulatorProcess.on('error', async (error) => {
  emulatorProcess = undefined;
  const alreadyShuttingDown = shuttingDown;
  shuttingDown = true;
  if (alreadyShuttingDown) {
    return;
  }
  console.error('❌ Failed to start emulators:', error);
  await cleanup();
  process.exit(1);
});
