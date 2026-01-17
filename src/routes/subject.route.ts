// File Path: src/routes/subject.route.ts

import express from 'express';
import WithDatabase from '@utils/withDatabase';
import { validate } from '@utils/validationHelper';
import privateRoute from '@middleware/auth/privateRoute';

import {
  ValidationSchema as CreateSubjectValidationSchema,
  Controller as CreateSubjectController,
} from '../components/subject/createSubject';

import {
  ValidationSchema as ListSubjectsValidationSchema,
  Controller as ListSubjectsController,
} from '../components/subject/listSubjects';

import {
  ValidationSchema as GetSubjectValidationSchema,
  Controller as GetSubjectController,
} from '../components/subject/getSubject';

import {
  ValidationSchema as UpdateSubjectValidationSchema,
  Controller as UpdateSubjectController,
} from '../components/subject/updateSubject';

import {
  ValidationSchema as DeleteSubjectValidationSchema,
  Controller as DeleteSubjectController,
} from '../components/subject/deleteSubject';

const router = express.Router();

router.use(privateRoute);

router.post(
  '/',
  validate(CreateSubjectValidationSchema),
  WithDatabase(CreateSubjectController)
);

router.get(
  '/',
  validate(ListSubjectsValidationSchema),
  WithDatabase(ListSubjectsController)
);

router.get(
  '/:id',
  validate(GetSubjectValidationSchema),
  WithDatabase(GetSubjectController)
);

router.put(
  '/:id',
  validate(UpdateSubjectValidationSchema),
  WithDatabase(UpdateSubjectController)
);

router.delete(
  '/:id',
  validate(DeleteSubjectValidationSchema),
  WithDatabase(DeleteSubjectController)
);

export default router;