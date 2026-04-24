import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware - verifies JWT token and attaches user to request
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'No authorization token provided' });
      return;
    }

    // Expect format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization format. Expected: Bearer <token>' });
      return;
    }

    const token = parts[1];

    // Verify token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      // Token verification failed
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

/**
 * Optional authentication middleware - tries to authenticate but doesn't fail if no token
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, continue without user
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const decoded = verifyToken(token);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
    }

    next();
  } catch (error) {
    // Token invalid, continue without user (don't fail)
    next();
  }
}
