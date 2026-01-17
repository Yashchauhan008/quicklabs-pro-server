
import path from 'path';

export default {
  serviceName: 'LMS Backend API',
  version: '1.0.0',
  apiPrefix: '/api',
  temporaryFileStoragePath: path.join(process.cwd(), 'uploads', 'temp'),
  fileStoragePath: path.join(process.cwd(), 'uploads', 'documents'),
};
