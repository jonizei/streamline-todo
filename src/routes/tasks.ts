import { Router, Request, Response, NextFunction } from 'express';
import { CreateTaskSchema, UpdateTaskSchema, UpdateStatusSchema } from '../models/task.js';
import { taskService } from '../services/taskService.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// Apply authentication to all task routes
router.use(authenticate);

// GET /api/queues/:queueId/tasks/next - Get active task for queue
router.get('/next', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }
    const task = await taskService.getNextTask(req.user.userId, req.params.queueId);
    if (!task) {
      res.status(204).send();
      return;
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// GET /api/queues/:queueId/tasks - Get all tasks in queue
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }
    const tasks = await taskService.getAllTasks(req.user.userId, req.params.queueId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET /api/queues/:queueId/tasks/:taskId - Get specific task
router.get('/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }
    const task = await taskService.getTask(req.user.userId, req.params.taskId);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }
    if (task.queue_id !== req.params.queueId) {
      throw new AppError(404, 'Task not found in this queue');
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// POST /api/queues/:queueId/tasks - Create task in queue
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }
    const input = CreateTaskSchema.parse(req.body);
    const task = await taskService.createTask(req.user.userId, req.params.queueId, input);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/queues/:queueId/tasks/:taskId - Update task
router.patch('/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }
    const task = await taskService.getTask(req.user.userId, req.params.taskId);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }
    if (task.queue_id !== req.params.queueId) {
      throw new AppError(404, 'Task not found in this queue');
    }

    const input = UpdateTaskSchema.parse(req.body);
    const updatedTask = await taskService.updateTask(req.user.userId, req.params.taskId, input);
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/queues/:queueId/tasks/:taskId/status - Change task status
router.patch('/:taskId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }
    const task = await taskService.getTask(req.user.userId, req.params.taskId);
    if (!task) {
      throw new AppError(404, 'Task not found');
    }
    if (task.queue_id !== req.params.queueId) {
      throw new AppError(404, 'Task not found in this queue');
    }

    const input = UpdateStatusSchema.parse(req.body);
    const updatedTask = await taskService.updateTaskStatus(req.user.userId, req.params.taskId, input);
    res.json(updatedTask);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot change status')) {
      next(new AppError(409, error.message));
    } else {
      next(error);
    }
  }
});

export default router;
