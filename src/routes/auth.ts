import { Router, Request, Response, NextFunction } from 'express';
import { CreateUserSchema, LoginSchema, UpdateUserSchema } from '../models/user.js';
import { userService } from '../services/userService.js';
import { authenticate } from '../middleware/auth.js';
import { ZodError } from 'zod';

const router = Router();

// POST /api/auth/register - Register new user
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const input = CreateUserSchema.parse(req.body);

    // Register user
    const result = await userService.register(input);

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
});

// POST /api/auth/login - Authenticate user
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const input = LoginSchema.parse(req.body);

    // Login user
    const result = await userService.login(input);

    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
});

// GET /api/auth/me - Get current user profile (requires authentication)
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is set by authenticate middleware
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await userService.getUserProfile(req.user.userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/auth/me - Update current user profile (requires authentication)
router.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is set by authenticate middleware
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate input
    const input = UpdateUserSchema.parse(req.body);

    // Update user profile
    const user = await userService.updateProfile(req.user.userId, input);

    res.json(user);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
});

export default router;
