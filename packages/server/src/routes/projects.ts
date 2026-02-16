import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { Project } from '../models/Project.js';
import { Environment } from '../models/Environment.js';
import { authenticateDashboard } from '../middleware/auth.js';

const router: IRouter = Router();

router.use(authenticateDashboard);

// GET / — List all projects
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await Project.find().sort({ name: 1 }).lean();
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

// GET /:id/environments — List environments for a project
router.get('/:id/environments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const environments = await Environment.find({ projectId: req.params.id })
      .sort({ name: 1 })
      .lean();
    res.json({ environments });
  } catch (error) {
    next(error);
  }
});

export default router;
