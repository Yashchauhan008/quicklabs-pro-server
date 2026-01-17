
import multer from 'multer';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import constant from '@config/constant';

const uploadDirectory = constant.temporaryFileStoragePath;

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase().slice(1);
    const UUID = uuidv4();
    cb(null, `${UUID}.${extension}`);
  },
});

export default storage;
