import { Request } from 'express';

// Custom request interface with user property
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

// Also extend global Express namespace (for compatibility)
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