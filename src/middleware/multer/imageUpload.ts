import path from 'path';
import multer from 'multer';
import storage from './storage';
import ServerError from '@utils/serverError';
import { Request } from 'express';

const imageFileExtensions = ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp', 'svg', 'ico', 'heif', 'heic'];

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  if (imageFileExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new ServerError('ERROR', 'Please upload a valid image file (jpg, jpeg, png, webp, etc.).'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5242880 }, // 5MB
});

export default upload;
