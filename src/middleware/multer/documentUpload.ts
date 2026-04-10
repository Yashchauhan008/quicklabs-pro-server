import path from 'path';
import multer from 'multer';
import storage from './storage';
import ServerError from '@utils/serverError';
import { Request } from 'express';

const documentFileExtensions = [
  'pdf',
  'doc', 'docx',
  'xls', 'xlsx',
  'ppt', 'pptx',
  'txt',
  'csv',
  'jpg', 'jpeg', 'png', 'webp', 'gif',
];

/** When `originalname` has no/wrong extension, allow by MIME (e.g. `image/png`). */
const allowedDocumentMimes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();

  if (documentFileExtensions.includes(fileExtension)) {
    cb(null, true);
    return;
  }

  if (mime && allowedDocumentMimes.has(mime)) {
    cb(null, true);
    return;
  }

  cb(
    new ServerError(
      'ERROR',
      `Invalid file type. Allowed types: ${documentFileExtensions.join(', ')}`,
    ),
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 78643200 }, // 75MB
});

export default upload;
