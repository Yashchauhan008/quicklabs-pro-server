import express from 'express';
import { requireRole } from '@middleware/auth/requireRole';
import { createSubjectRouter } from './subject.route';
import { createDocumentRouter } from './document.route';

const router = express.Router();

router.use('/subjects', createSubjectRouter(requireRole('admin')));
router.use('/documents', createDocumentRouter(requireRole('admin')));

export default router;
