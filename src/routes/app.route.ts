import express from 'express';
import authRoute from './auth.routes';
import subjectRoute from './subject.route';
import documentRoute from './document.route';

const router = express.Router();

router.use('/auth', authRoute);
router.use('/subjects', subjectRoute);
router.use('/documents', documentRoute);

export default router;








