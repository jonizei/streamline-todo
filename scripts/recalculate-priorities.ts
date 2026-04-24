#!/usr/bin/env tsx

import { priorityRecalculationService } from '../src/services/priorityRecalculationService.js';

/**
 * Standalone script to recalculate task priorities.
 * Run with: npx tsx scripts/recalculate-priorities.ts
 */
async function main() {
  console.log('🔄 Starting priority recalculation...\n');

  try {
    const result = await priorityRecalculationService.recalculateAllPriorities();

    console.log('✅ Priority recalculation complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Total tasks: ${result.totalTasks}`);
    console.log(`   Updated tasks: ${result.updatedTasks}`);
    console.log(`   Active task changes: ${result.activeTaskChanges}`);

    if (result.updatedTasks === 0) {
      console.log('\n✨ All task priorities are up to date!');
    } else {
      console.log(`\n✨ Successfully updated ${result.updatedTasks} task(s)`);
      if (result.activeTaskChanges > 0) {
        console.log(`   🔄 ${result.activeTaskChanges} queue(s) had active task changes`);
      }
    }
  } catch (error) {
    console.error('❌ Error recalculating priorities:', error);
    process.exit(1);
  }
}

main();
