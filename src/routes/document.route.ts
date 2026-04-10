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
  ValidationSchema as StreamAttachmentValidationSchema,
  Controller as StreamAttachmentController,
} from '../components/document/streamDocumentAttachment';

import {
  ValidationSchema as UpdateDocumentValidationSchema,
  Controller as UpdateDocumentController,
} from '../components/document/updateDocument';

import {
  ValidationSchema as DeleteDocumentValidationSchema,
  Controller as DeleteDocumentController,
} from '../components/document/deleteDocument';

import {
  ValidationSchema as AddAttachmentsValidationSchema,
  Controller as AddAttachmentsController,
} from '../components/document/addDocumentAttachments';

import {
  ValidationSchema as UpdateAttachmentValidationSchema,
  Controller as UpdateAttachmentController,
} from '../components/document/updateDocumentAttachment';

import {
  ValidationSchema as DeleteAttachmentValidationSchema,
  Controller as DeleteAttachmentController,
} from '../components/document/deleteDocumentAttachment';

function handleMulterArrayError(
  err: unknown,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      message: 'File size exceeds 75MB limit',
    });
    return;
  }
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_COUNT') {
    res.status(400).json({
      success: false,
      message: 'A maximum of 10 files per upload is allowed',
    });
    return;
  }
  next(err);
}

export function createDocumentRouter(roleGuard: RequestHandler): express.Router {
  const router = express.Router();

  const uploadManyDocuments = (req: Request, res: Response, next: NextFunction): void => {
    documentUpload.array('files', 10)(req, res, (err?: unknown) => {
      if (!err) {
        next();
        return;
      }
      handleMulterArrayError(err, res, next);
    });
  };

  router.use(privateRoute);
  router.use(roleGuard);

  router.post(
    '/',
    uploadManyDocuments,
    validate(UploadDocumentValidationSchema),
    WithDatabase(UploadDocumentController)
  );

  router.get(
    '/',
    validate(ListDocumentsValidationSchema),
    WithDatabase(ListDocumentsController)
  );

  router.get(
    '/:id/attachments/:attachmentId/download',
    validate(StreamAttachmentValidationSchema),
    WithDatabase(StreamAttachmentController)
  );

  router.get(
    '/:id/download',
    validate(DownloadDocumentValidationSchema),
    WithDatabase(DownloadDocumentController)
  );

  router.get(
    '/:id',
    validate(GetDocumentValidationSchema),
    WithDatabase(GetDocumentController)
  );

  router.put(
    '/:id',
    validate(UpdateDocumentValidationSchema),
    WithDatabase(UpdateDocumentController)
  );

  router.post(
    '/:id/attachments',
    (req: Request, res: Response, next: NextFunction): void => {
      documentUpload.array('files', 10)(req, res, (err?: unknown) => {
        if (!err) {
          next();
          return;
        }
        handleMulterArrayError(err, res, next);
      });
    },
    validate(AddAttachmentsValidationSchema),
    WithDatabase(AddAttachmentsController)
  );

  router.patch(
    '/:id/attachments/:attachmentId',
    validate(UpdateAttachmentValidationSchema),
    WithDatabase(UpdateAttachmentController)
  );

  router.delete(
    '/:id/attachments/:attachmentId',
    validate(DeleteAttachmentValidationSchema),
    WithDatabase(DeleteAttachmentController)
  );

  router.delete(
    '/:id',
    validate(DeleteDocumentValidationSchema),
    WithDatabase(DeleteDocumentController)
  );

  return router;
}
