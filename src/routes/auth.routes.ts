import express from 'express';
import WithDatabase from '@utils/withDatabase';
import { validate } from '@utils/validationHelper';
import privateRoute from '@middleware/auth/privateRoute';

import {
  ValidationSchema as LoginValidationSchema,
  Controller as LoginController,
} from '../components/auth/login';

import {
  Controller as LogoutController,
} from '../components/auth/logout';

import {
  Controller as GetProfileController,
} from '../components/auth/getProfile';

const router = express.Router();

router.post(
  '/login',
  validate(LoginValidationSchema),
  WithDatabase(LoginController)
);

router.delete(
  '/logout',
  privateRoute,
  WithDatabase(LogoutController)
);

router.get(
  '/profile',
  privateRoute,
  WithDatabase(GetProfileController)
);

export default router;