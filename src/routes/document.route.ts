import express from 'express';
import WithDatabase from '@utils/withDatabase';
import { validate } from '@utils/validationHelper';
import privateRoute from '@middleware/auth/privateRoute';
import documentUpload from '@middleware/multer/documentUpload';

import {
  ValidationSchema as UploadDocumentValidationSchema,
  Controller as UploadDocumentController,
} from '../components/document/uploadDocument';

import {
  ValidationSchema as ListDocumentsValidationSchema,
  Controller as ListDocumentsController,
} from '../components/document/listDocuments';

import {
  ValidationSchema as GetDocumentValidationSchema,
  Controller as GetDocumentController,
} from '../components/document/getDocument';

import {
  ValidationSchema as DownloadDocumentValidationSchema,
  Controller as DownloadDocumentController,
} from '../components/document/downloadDocument';

import {
  ValidationSchema as UpdateDocumentValidationSchema,
  Controller as UpdateDocumentController,
} from '../components/document/updateDocument';

import {
  ValidationSchema as DeleteDocumentValidationSchema,
  Controller as DeleteDocumentController,
} from '../components/document/deleteDocument';

const router = express.Router();

router.use(privateRoute);

router.post(
  '/',
  documentUpload.single('file'),
  validate(UploadDocumentValidationSchema),
  WithDatabase(UploadDocumentController)
);

router.get(
  '/',
  validate(ListDocumentsValidationSchema),
  WithDatabase(ListDocumentsController)
);

router.get(
  '/:id',
  validate(GetDocumentValidationSchema),
  WithDatabase(GetDocumentController)
);

router.get(
  '/:id/download',
  validate(DownloadDocumentValidationSchema),
  WithDatabase(DownloadDocumentController)
);

router.put(
  '/:id',
  documentUpload.single('file'),
  validate(UpdateDocumentValidationSchema),
  WithDatabase(UpdateDocumentController)
);

router.delete(
  '/:id',
  validate(DeleteDocumentValidationSchema),
  WithDatabase(DeleteDocumentController)
);

export default router;