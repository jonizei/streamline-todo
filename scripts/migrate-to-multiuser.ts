#!/usr/bin/env tsx

/**
 * Migration script to add user_id to existing queues
 *
 * This script migrates existing queue data from the single-user format
 * to the multi-user format by adding a user_id field to all queues.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-multiuser.ts <default-user-id>
 *
 * Example:
 *   npx tsx scripts/migrate-to-multiuser.ts 550e8400-e29b-41d4-a716-446655440000
 */

import { promises as fs } from 'fs';
import path from 'path';
import { QueueSchema } from '../src/models/queue.js';

const QUEUES_DIR = process.env.QUEUES_DIR || 'data/queues';

async function migrateQueues(defaultUserId: string) {
  console.log(`Starting migration...`);
  console.log(`Queues directory: ${QUEUES_DIR}`);
  console.log(`Default user ID: ${defaultUserId}`);
  console.log('');

  try {
    // Check if queues directory exists
    try {
      await fs.access(QUEUES_DIR);
    } catch (error) {
      console.error(`Error: Queues directory does not exist: ${QUEUES_DIR}`);
      process.exit(1);
    }

    // Get all queue directories
    const queueDirs = await fs.readdir(QUEUES_DIR);
    console.log(`Found ${queueDirs.length} queue directories`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const queueDir of queueDirs) {
      const queueFilePath = path.join(QUEUES_DIR, queueDir, 'queue.json');

      try {
        // Check if queue.json exists
        try {
          await fs.access(queueFilePath);
        } catch (error) {
          console.log(`  Skipping ${queueDir} - no queue.json file`);
          skippedCount++;
          continue;
        }

        // Read queue data
        const content = await fs.readFile(queueFilePath, 'utf-8');
        const queue = JSON.parse(content);

        // Check if queue already has user_id
        if (queue.user_id) {
          console.log(`  Skipping ${queue.name} (${queue.id}) - already has user_id`);
          skippedCount++;
          continue;
        }

        // Add user_id
        queue.user_id = defaultUserId;

        // Validate with schema
        try {
          QueueSchema.parse(queue);
        } catch (validationError) {
          console.error(`  Error validating queue ${queue.id}:`, validationError);
          errorCount++;
          continue;
        }

        // Write back to file
        await fs.writeFile(queueFilePath, JSON.stringify(queue, null, 2), 'utf-8');
        console.log(`  ✓ Migrated ${queue.name} (${queue.id})`);
        migratedCount++;

      } catch (error) {
        console.error(`  Error processing ${queueDir}:`, error);
        errorCount++;
      }
    }

    console.log('');
    console.log('Migration Summary:');
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log('');

    if (errorCount > 0) {
      console.log('⚠️  Migration completed with errors');
      process.exit(1);
    } else {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    }

  } catch (error) {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Error: Missing default user ID argument');
  console.error('');
  console.error('Usage: npx tsx scripts/migrate-to-multiuser.ts <default-user-id>');
  console.error('');
  console.error('Example:');
  console.error('  npx tsx scripts/migrate-to-multiuser.ts 550e8400-e29b-41d4-a716-446655440000');
  process.exit(1);
}

const defaultUserId = args[0];

// Validate UUID format
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidPattern.test(defaultUserId)) {
  console.error(`Error: Invalid UUID format: ${defaultUserId}`);
  process.exit(1);
}

migrateQueues(defaultUserId);
