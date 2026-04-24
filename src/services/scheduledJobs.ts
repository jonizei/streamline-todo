import * as cron from 'node-cron';
import { priorityRecalculationService } from './priorityRecalculationService.js';

/**
 * Scheduled jobs for background tasks.
 *
 * This module handles recurring tasks like:
 * - Priority recalculation (daily at 2 AM)
 */
export class ScheduledJobs {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize and start all scheduled jobs
   */
  start(): void {
    // Recalculate priorities daily at 2 AM
    const priorityRecalcJob = cron.schedule('0 2 * * *', async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled priority recalculation...`);

      try {
        const result = await priorityRecalculationService.recalculateAllPriorities();
        console.log(`[${new Date().toISOString()}] Priority recalculation complete:`, {
          totalTasks: result.totalTasks,
          updatedTasks: result.updatedTasks,
          activeTaskChanges: result.activeTaskChanges,
        });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in scheduled priority recalculation:`, error);
      }
    }, {
      timezone: 'UTC'
    });

    this.jobs.set('priorityRecalculation', priorityRecalcJob);

    console.log('✅ Scheduled jobs started:');
    console.log('   - Priority recalculation: Daily at 2:00 AM UTC');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      console.log(`Stopped scheduled job: ${name}`);
    }
    this.jobs.clear();
  }

  /**
   * Get status of all scheduled jobs
   */
  getStatus(): { name: string; running: boolean }[] {
    return Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: job.getStatus() === 'scheduled',
    }));
  }
}

export const scheduledJobs = new ScheduledJobs();
