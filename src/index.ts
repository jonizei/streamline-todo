import { createApp } from './app.js';
import { userRepository } from './repositories/userRepository.js';
import { queueRepository } from './repositories/queueRepository.js';
import { taskRepository } from './repositories/taskRepository.js';
import { scheduledJobs } from './services/scheduledJobs.js';

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Initialize repositories
    console.log('Initializing repositories...');
    await userRepository.init();
    await queueRepository.init();
    await taskRepository.init();
    console.log('Repositories initialized');

    // Start scheduled jobs
    scheduledJobs.start();

    // Create and start server
    const app = createApp();
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('\nShutting down gracefully...');
      scheduledJobs.stop();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
