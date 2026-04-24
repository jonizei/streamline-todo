import { Router, Request, Response, NextFunction } from 'express';
import { CreateQueueSchema, UpdateQueueSchema } from '../models/queue.js';
import { queueService } from '../services/queueService.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Apply authentication to all queue routes
router.use(authenticate);

// GET /api/queues - List all queues for the authenticated user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }
    const queues = await queueService.getAllQueues(req.user.userId);
    res.json(queues);
  } catch (error) {
    next(error);
  }
});

// GET /api/queues/:queueId - Get queue by ID
router.get('/:queueId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }
    const queue = await queueService.getQueue(req.user.userId, req.params.queueId);
    if (!queue) {
      throw new AppError(404, 'Queue not found');
    }
    res.json(queue);
  } catch (error) {
    next(error);
  }
});

// POST /api/queues - Create new queue
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }
    const input = CreateQueueSchema.parse(req.body);
    const queue = await queueService.createQueue(req.user.userId, input);
    res.status(201).json(queue);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/queues/:queueId - Update queue
router.patch('/:queueId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }
    const input = UpdateQueueSchema.parse(req.body);
    const queue = await queueService.updateQueue(req.user.userId, req.params.queueId, input);
    if (!queue) {
      throw new AppError(404, 'Queue not found');
    }
    res.json(queue);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/queues/:queueId - Delete queue
router.delete('/:queueId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }
    const deleted = await queueService.deleteQueue(req.user.userId, req.params.queueId);
    if (!deleted) {
      throw new AppError(404, 'Queue not found');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
