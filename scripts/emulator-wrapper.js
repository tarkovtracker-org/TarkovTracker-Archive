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

// Setup signal handlers for graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📴 Received SIGINT, shutting down...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📴 Received SIGTERM, shutting down...');
  await cleanup();
  process.exit(0);
});

// Run the Firebase emulator command
const args = process.argv.slice(2);
const emulatorProcess = spawn('firebase', ['emulators:start', ...args], {
  stdio: 'inherit',
  shell: true
});

// Handle process exit
emulatorProcess.on('close', async (code) => {
  console.log(`\n🔚 Emulators exited with code ${code}`);
  await cleanup();
  process.exit(code);
});

emulatorProcess.on('error', async (error) => {
  console.error('❌ Failed to start emulators:', error);
  await cleanup();
  process.exit(1);
});
