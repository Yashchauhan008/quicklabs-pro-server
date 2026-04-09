import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';
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

export function createDocumentRouter(roleGuard: RequestHandler): express.Router {
  const router = express.Router();
  const uploadSingleDocument = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    documentUpload.single('file')(req, res, (err?: unknown) => {
      if (!err) {
        next();
        return;
      }

      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          success: false,
          message: 'File size exceeds 75MB limit',
        });
        return;
      }

      next(err);
    });
  };

  router.use(privateRoute);
  router.use(roleGuard);

  router.post(
    '/',
    uploadSingleDocument,
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
    uploadSingleDocument,
    validate(UpdateDocumentValidationSchema),
    WithDatabase(UpdateDocumentController)
  );

  router.delete(
    '/:id',
    validate(DeleteDocumentValidationSchema),
    WithDatabase(DeleteDocumentController)
  );

  return router;
}
