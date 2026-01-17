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
  'jpg', 'jpeg', 'png', 'webp', 'gif'
];

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  if (documentFileExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new ServerError('ERROR', `Invalid file type. Allowed types: ${documentFileExtensions.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 52428800 }, // 50MB
});

export default upload;








