import { RequestHandler } from 'express';
import type { UserRole } from '../../types/role.type';

export function requireRole(...allowed: UserRole[]): RequestHandler {
  return (req, res, next): void => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions for this resource',
      });
      return;
    }
    next();
  };
}
