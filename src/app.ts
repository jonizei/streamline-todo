import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import queueRoutes from './routes/queues.js';
import taskRoutes from './routes/tasks.js';
import authRoutes from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());

  // Body parsing middleware
  app.use(express.json());

  // Rate limiting for auth endpoints (disabled in test environment)
  if (process.env.NODE_ENV !== 'test') {
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 10 : 100, // More lenient in development
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api/auth', authLimiter);
  }

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/queues', queueRoutes);
  app.use('/api/queues/:queueId/tasks', taskRoutes);

  // Error handling
  app.use(errorHandler);

  return app;
}
