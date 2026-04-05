import express from 'express';
import authRoute from './auth.routes';
import adminRoute from './admin.route';
import studentRoute from './student.route';

const router = express.Router();

router.use('/auth', authRoute);
router.use('/admin', adminRoute);
router.use('/students', studentRoute);

export default router;








