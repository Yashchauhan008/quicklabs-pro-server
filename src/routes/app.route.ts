import express from 'express';
import authRoute from './auth.routes';
import adminRoute from './admin.route';
import studentRoute from './student.route';
import metaRoute from './meta.route';

const router = express.Router();

router.use('/auth', authRoute);
router.use('/admin', adminRoute);
router.use('/students', studentRoute);
router.use('/meta', metaRoute);

export default router;








