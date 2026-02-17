import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Project } from '../models/Project.js';
import { Environment } from '../models/Environment.js';
import { Flag } from '../models/Flag.js';
import { Segment } from '../models/Segment.js';
import { TeamMember } from '../models/TeamMember.js';
import { ApiKey } from '../models/ApiKey.js';
import { AuditLog } from '../models/AuditLog.js';
import { authenticateDashboard } from '../middleware/auth.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { createAuditEntry } from '../services/auditService.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const router: IRouter = Router();

router.use(authenticateDashboard);

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  defaultEnvironmentId: z.string().optional().nullable(),
});

const deleteProjectSchema = z.object({
  confirmName: z.string().min(1),
});

// ---------------------------------------------------------------------------
// GET / — List all projects
// ---------------------------------------------------------------------------

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await Project.find().sort({ name: 1 }).lean();
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /:id — Get single project with stats
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) {
      throw new NotFoundError('Project', req.params.id);
    }

    const [flagCount, segmentCount, environmentCount, memberCount] = await Promise.all([
      Flag.countDocuments({ projectId: project._id, archived: { $ne: true } }),
      Segment.countDocuments({ projectId: project._id, archived: { $ne: true } }),
      Environment.countDocuments({ projectId: project._id }),
      TeamMember.countDocuments({ projectId: project._id, status: 'active' }),
    ]);

    res.json({
      ...project,
      stats: { flagCount, segmentCount, environmentCount, memberCount },
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/environments — List environments for a project
// ---------------------------------------------------------------------------

router.get('/:id/environments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const environments = await Environment.find({ projectId: req.params.id })
      .sort({ sortOrder: 1 })
      .lean();
    res.json({ environments });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id — Update project
// ---------------------------------------------------------------------------

router.patch(
  '/:id',
  requireProjectRole('admin'),
  validateBody(updateProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ('key' in req.body) {
        throw new ValidationError('Project key is immutable and cannot be changed');
      }

      const previousProject = await Project.findById(req.params.id).lean();
      if (!previousProject) {
        throw new NotFoundError('Project', req.params.id);
      }

      const updatedProject = await Project.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true },
      ).lean();

      createAuditEntry({
        action: 'project.updated',
        resourceType: 'project',
        resourceKey: previousProject.key,
        projectId: previousProject._id as Types.ObjectId,
        author: { userId: req.user!._id, email: req.user!.email },
        previousValue: previousProject as Record<string, unknown>,
        currentValue: updatedProject as Record<string, unknown>,
      });

      res.json(updatedProject);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id — Delete project (cascade)
// ---------------------------------------------------------------------------

router.delete(
  '/:id',
  requireProjectRole('owner'),
  validateBody(deleteProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await Project.findById(req.params.id).lean();
      if (!project) {
        throw new NotFoundError('Project', req.params.id);
      }

      const { confirmName } = req.body;
      if (confirmName !== project.name) {
        throw new ValidationError('Confirmation text does not match the project name');
      }

      // Cascade delete all associated data
      await Promise.all([
        Environment.deleteMany({ projectId: project._id }),
        Flag.deleteMany({ projectId: project._id }),
        Segment.deleteMany({ projectId: project._id }),
        TeamMember.deleteMany({ projectId: project._id }),
        ApiKey.deleteMany({ projectId: project._id }),
        AuditLog.deleteMany({ projectId: project._id }),
      ]);

      await Project.deleteOne({ _id: project._id });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id/tags — List all tags with usage counts
// ---------------------------------------------------------------------------

router.get('/:id/tags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;

    const [flagTags, segmentTags] = await Promise.all([
      Flag.aggregate([
        { $match: { projectId: new Types.ObjectId(projectId), archived: { $ne: true } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', flagCount: { $sum: 1 } } },
      ]),
      Segment.aggregate([
        { $match: { projectId: new Types.ObjectId(projectId), archived: { $ne: true } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', segmentCount: { $sum: 1 } } },
      ]),
    ]);

    // Merge flag and segment tag counts
    const tagMap = new Map<string, { name: string; flagCount: number; segmentCount: number }>();

    for (const t of flagTags) {
      tagMap.set(t._id, { name: t._id, flagCount: t.flagCount, segmentCount: 0 });
    }
    for (const t of segmentTags) {
      const existing = tagMap.get(t._id);
      if (existing) {
        existing.segmentCount = t.segmentCount;
      } else {
        tagMap.set(t._id, { name: t._id, flagCount: 0, segmentCount: t.segmentCount });
      }
    }

    const tags = Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id/tags/:tag — Remove a tag from all flags and segments
// ---------------------------------------------------------------------------

router.delete(
  '/:id/tags/:tag',
  requireProjectRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id;
      const tag = decodeURIComponent(req.params.tag);

      const [flagResult, segmentResult] = await Promise.all([
        Flag.updateMany({ projectId, tags: tag }, { $pull: { tags: tag } }),
        Segment.updateMany({ projectId, tags: tag }, { $pull: { tags: tag } }),
      ]);

      createAuditEntry({
        action: 'project.tag_removed',
        resourceType: 'project',
        resourceKey: tag,
        projectId: new Types.ObjectId(projectId),
        author: { userId: req.user!._id, email: req.user!.email },
        currentValue: {
          tag,
          removedFrom: {
            flags: flagResult.modifiedCount,
            segments: segmentResult.modifiedCount,
          },
        },
      });

      res.json({
        success: true,
        removedFrom: {
          flags: flagResult.modifiedCount,
          segments: segmentResult.modifiedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
