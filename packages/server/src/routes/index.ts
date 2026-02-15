import { Router, type Router as IRouter } from 'express';
import authRoutes from './auth.js';
import flagRoutes from './flags.js';
import segmentRoutes from './segments.js';
import sdkRoutes from './sdk.js';
import auditRoutes from './audit.js';
import { sseStreamRouter } from '../sse/index.js';

const router: IRouter = Router();

// Public routes
router.use('/auth', authRoutes);

// Dashboard routes (auth applied inside each route file)
router.use('/flags', flagRoutes);
router.use('/segments', segmentRoutes);
router.use('/audit-log', auditRoutes);

// SDK routes (SDK key auth applied inside the route file)
router.use('/sdk', sdkRoutes);
router.use('/sdk', sseStreamRouter);

export default router;
