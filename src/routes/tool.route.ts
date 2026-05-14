import express, { RequestHandler } from 'express';
import WithDatabase from '@utils/withDatabase';
import { validate } from '@utils/validationHelper';
import _privateRoute from '@middleware/auth/privateRoute';

import env from '@config/env';

import {
  ValidationSchema as ListToolsValidationSchema,
  Controller as ListToolsController,
} from '../components/tool/listTools';

import {
  ValidationSchema as CreateToolValidationSchema,
  Controller as CreateToolController,
} from '../components/tool/createTool';

import {
  ValidationSchema as UpdateToolValidationSchema,
  Controller as UpdateToolController,
} from '../components/tool/updateTool';

import {
  ValidationSchema as DeleteToolValidationSchema,
  Controller as DeleteToolController,
} from '../components/tool/deleteTool';

import imageUpload from '@middleware/multer/imageUpload';

const devOnlyGuard: RequestHandler = (req, res, next) => {
  const staticToken = req.headers['x-access-token'];
  
  if (!env.server.isDevelopment) {
    res.status(403).json({ success: false, message: 'This feature is only available in development.' });
    return;
  }

  // If static token matches, we bypass privateRoute
  if (staticToken === env.security.privateStaticAccessToken) {
    return next();
  }

  // Otherwise, fallback to standard auth if they want to use that (optional)
  // or just reject if they must use the static token.
  res.status(401).json({ success: false, message: 'Invalid or missing static access token.' });
};

export function createToolRouter(_roleGuard: RequestHandler): express.Router {
  const router = express.Router();

  // Public List Route (No auth required)
  router.get(
    '/',
    validate(ListToolsValidationSchema),
    WithDatabase(ListToolsController)
  );

  // Development only management routes (Use static token guard)
  router.post(
    '/',
    devOnlyGuard,
    imageUpload.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'banners', maxCount: 5 }
    ]),
    validate(CreateToolValidationSchema),
    WithDatabase(CreateToolController)
  );

  router.put(
    '/:id',
    devOnlyGuard,
    imageUpload.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'banners', maxCount: 5 }
    ]),
    validate(UpdateToolValidationSchema),
    WithDatabase(UpdateToolController)
  );

  router.delete(
    '/:id',
    devOnlyGuard,
    validate(DeleteToolValidationSchema),
    WithDatabase(DeleteToolController)
  );

  return router;
}
