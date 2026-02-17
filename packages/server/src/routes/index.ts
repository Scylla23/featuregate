import { Router, type Router as IRouter } from 'express';
import authRoutes from './auth.js';
import flagRoutes from './flags.js';
import segmentRoutes from './segments.js';
import sdkRoutes from './sdk.js';
import auditRoutes from './audit.js';
import projectRoutes from './projects.js';
import environmentRoutes from './environments.js';
import memberRoutes from './members.js';
import apiKeyRoutes from './apikeys.js';
import { sseStreamRouter } from '../sse/index.js';

const router: IRouter = Router();

// Public routes
router.use('/auth', authRoutes);

// Dashboard routes (auth applied inside each route file)
router.use('/flags', flagRoutes);
router.use('/segments', segmentRoutes);
router.use('/audit-log', auditRoutes);
router.use('/projects', projectRoutes);

// Settings routes (nested under projects, auth applied inside each route file)
router.use('/projects/:projectId/environments', environmentRoutes);
router.use('/projects/:projectId/members', memberRoutes);
router.use('/projects/:projectId/api-keys', apiKeyRoutes);

// SDK routes (SDK key auth applied inside the route file)
router.use('/sdk', sdkRoutes);
router.use('/sdk', sseStreamRouter);

export default router;
