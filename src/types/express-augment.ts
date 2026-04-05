import type { UserRole } from './role.type';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string;
      email: string;
      role: UserRole;
    };
  }
}

export {};
