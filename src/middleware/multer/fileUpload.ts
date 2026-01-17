
import multer from 'multer';
import storage from './storage';

const upload = multer({
  storage,
  limits: { fileSize: 10485760 }, // 10MB
});

export default upload;
