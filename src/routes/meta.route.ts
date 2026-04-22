import express from 'express';
import WithDatabase from '@utils/withDatabase';
import { validate } from '@utils/validationHelper';
import privateStaticToken from '@middleware/auth/privateStaticToken';
import imageUpload from '@middleware/multer/imageUpload';

import {
  ValidationSchema as ListUniversitiesValidationSchema,
  Controller as ListUniversitiesController,
} from '../components/university/listUniversities';
import {
  ValidationSchema as CreateUniversityValidationSchema,
  Controller as CreateUniversityController,
} from '../components/university/createUniversity';
import {
  ValidationSchema as UpdateUniversityValidationSchema,
  Controller as UpdateUniversityController,
} from '../components/university/updateUniversity';
import {
  ValidationSchema as DeleteUniversityValidationSchema,
  Controller as DeleteUniversityController,
} from '../components/university/deleteUniversity';

import {
  ValidationSchema as ListBranchesValidationSchema,
  Controller as ListBranchesController,
} from '../components/branch/listBranches';
import {
  ValidationSchema as CreateBranchValidationSchema,
  Controller as CreateBranchController,
} from '../components/branch/createBranch';
import {
  ValidationSchema as UpdateBranchValidationSchema,
  Controller as UpdateBranchController,
} from '../components/branch/updateBranch';
import {
  ValidationSchema as DeleteBranchValidationSchema,
  Controller as DeleteBranchController,
} from '../components/branch/deleteBranch';

const router = express.Router();

router.use(privateStaticToken);

router.get(
  '/universities',
  validate(ListUniversitiesValidationSchema),
  WithDatabase(ListUniversitiesController)
);
router.post(
  '/universities',
  imageUpload.single('logo'),
  validate(CreateUniversityValidationSchema),
  WithDatabase(CreateUniversityController)
);
router.put(
  '/universities/:id',
  imageUpload.single('logo'),
  validate(UpdateUniversityValidationSchema),
  WithDatabase(UpdateUniversityController)
);
router.delete(
  '/universities/:id',
  validate(DeleteUniversityValidationSchema),
  WithDatabase(DeleteUniversityController)
);

router.get(
  '/branches',
  validate(ListBranchesValidationSchema),
  WithDatabase(ListBranchesController)
);
router.post(
  '/branches',
  validate(CreateBranchValidationSchema),
  WithDatabase(CreateBranchController)
);
router.put(
  '/branches/:id',
  validate(UpdateBranchValidationSchema),
  WithDatabase(UpdateBranchController)
);
router.delete(
  '/branches/:id',
  validate(DeleteBranchValidationSchema),
  WithDatabase(DeleteBranchController)
);

export default router;
