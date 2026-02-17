import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Environment } from '../models/Environment.js';
import { Flag } from '../models/Flag.js';
import { Segment } from '../models/Segment.js';
import { authenticateDashboard } from '../middleware/auth.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createAuditEntry } from '../services/auditService.js';
import { invalidateSdkKeyCache } from '../services/cacheService.js';
import { generateSdkKey, generateMobileKey, generateClientSideId } from '../utils/keys.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

const router: IRouter = Router({ mergeParams: true });

router.use(authenticateDashboard);

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const envKeyRegex = /^[a-z0-9][a-z0-9-]*$/;

const createEnvironmentSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(128)
    .regex(envKeyRegex, 'Key must be lowercase alphanumeric with hyphens')
    .optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .optional(),
  isCritical: z.boolean().optional(),
  requireConfirmation: z.boolean().optional(),
  requireComments: z.boolean().optional(),
});

const updateEnvironmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .optional(),
  isCritical: z.boolean().optional(),
  requireConfirmation: z.boolean().optional(),
  requireComments: z.boolean().optional(),
});

const reorderSchema = z.object({
  orderedKeys: z.array(z.string().min(1)).min(1),
});

// ---------------------------------------------------------------------------
// GET / — List all environments for the project
// ---------------------------------------------------------------------------

router.get(
  '/',
  requireProjectRole('viewer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const environments = await Environment.find({ projectId: req.params.projectId })
        .sort({ sortOrder: 1 })
        .lean();

      res.json({ environments, total: environments.length });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST / — Create environment
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireProjectRole('admin'),
  validateBody(createEnvironmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, color, isCritical, requireConfirmation, requireComments } =
        req.body;
      const projectId = req.params.projectId;

      // Auto-generate key from name if not provided
      const key =
        req.body.key ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

      // Get max sortOrder
      const maxEnv = await Environment.findOne({ projectId })
        .sort({ sortOrder: -1 })
        .select('sortOrder')
        .lean();
      const sortOrder = (maxEnv?.sortOrder ?? -1) + 1;

      const environment = await Environment.create({
        key,
        name,
        description,
        color,
        projectId,
        sdkKey: generateSdkKey(),
        mobileKey: generateMobileKey(),
        clientSideId: generateClientSideId(),
        isCritical,
        requireConfirmation,
        requireComments,
        sortOrder,
        createdBy: req.user!._id,
      });

      createAuditEntry({
        action: 'environment.created',
        resourceType: 'environment',
        resourceKey: environment.key,
        projectId: new Types.ObjectId(projectId),
        environmentKey: environment.key,
        author: { userId: req.user!._id, email: req.user!.email },
        currentValue: environment.toObject(),
      });

      res.status(201).json(environment);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'MongoServerError' &&
        (error as { code?: number }).code === 11000
      ) {
        next(new ConflictError('Environment key already exists in this project'));
        return;
      }
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /reorder — Reorder environments (must be before /:envKey)
// ---------------------------------------------------------------------------

router.patch(
  '/reorder',
  requireProjectRole('admin'),
  validateBody(reorderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderedKeys } = req.body;
      const projectId = req.params.projectId;

      const ops = orderedKeys.map((key: string, index: number) => ({
        updateOne: {
          filter: { projectId, key },
          update: { $set: { sortOrder: index } },
        },
      }));

      await Environment.bulkWrite(ops);

      const environments = await Environment.find({ projectId })
        .sort({ sortOrder: 1 })
        .lean();

      res.json({ environments });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:envKey — Get single environment
// ---------------------------------------------------------------------------

router.get(
  '/:envKey',
  requireProjectRole('viewer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const environment = await Environment.findOne({
        projectId: req.params.projectId,
        key: req.params.envKey,
      }).lean();

      if (!environment) {
        throw new NotFoundError('Environment', req.params.envKey);
      }

      res.json(environment);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /:envKey — Update environment
// ---------------------------------------------------------------------------

router.patch(
  '/:envKey',
  requireProjectRole('admin'),
  validateBody(updateEnvironmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ('key' in req.body) {
        throw new ValidationError('Environment key is immutable and cannot be changed');
      }

      const projectId = req.params.projectId;
      const previousEnv = await Environment.findOne({
        projectId,
        key: req.params.envKey,
      }).lean();

      if (!previousEnv) {
        throw new NotFoundError('Environment', req.params.envKey);
      }

      const updatedEnv = await Environment.findOneAndUpdate(
        { projectId, key: req.params.envKey },
        { $set: req.body },
        { new: true, runValidators: true },
      ).lean();

      createAuditEntry({
        action: 'environment.updated',
        resourceType: 'environment',
        resourceKey: previousEnv.key,
        projectId: new Types.ObjectId(projectId),
        environmentKey: previousEnv.key,
        author: { userId: req.user!._id, email: req.user!.email },
        previousValue: previousEnv as Record<string, unknown>,
        currentValue: updatedEnv as Record<string, unknown>,
      });

      res.json(updatedEnv);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:envKey — Delete environment
// ---------------------------------------------------------------------------

router.delete(
  '/:envKey',
  requireProjectRole('owner'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId;
      const envKey = req.params.envKey;

      const environment = await Environment.findOne({ projectId, key: envKey }).lean();
      if (!environment) {
        throw new NotFoundError('Environment', envKey);
      }

      // Cannot delete the last environment
      const envCount = await Environment.countDocuments({ projectId });
      if (envCount <= 1) {
        throw new ValidationError('Cannot delete the only environment in a project');
      }

      // Cannot delete a critical environment
      if (environment.isCritical) {
        throw new ValidationError(
          'Cannot delete a critical environment. Remove the critical designation first.',
        );
      }

      // Cascade: delete flags and segments in this environment
      await Promise.all([
        Flag.deleteMany({ projectId, environmentKey: envKey }),
        Segment.deleteMany({ projectId, environmentKey: envKey }),
      ]);

      await Environment.deleteOne({ _id: environment._id });

      // Invalidate SDK key cache
      if (environment.sdkKey) {
        await invalidateSdkKeyCache(environment.sdkKey);
      }

      createAuditEntry({
        action: 'environment.deleted',
        resourceType: 'environment',
        resourceKey: envKey,
        projectId: new Types.ObjectId(projectId),
        environmentKey: envKey,
        author: { userId: req.user!._id, email: req.user!.email },
        previousValue: environment as Record<string, unknown>,
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /:envKey/reset-sdk-key — Reset SDK key
// ---------------------------------------------------------------------------

router.post(
  '/:envKey/reset-sdk-key',
  requireProjectRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId;
      const environment = await Environment.findOne({
        projectId,
        key: req.params.envKey,
      });

      if (!environment) {
        throw new NotFoundError('Environment', req.params.envKey);
      }

      const oldSdkKey = environment.sdkKey;
      const newSdkKey = generateSdkKey();

      environment.sdkKey = newSdkKey;
      await environment.save();

      // Invalidate old key from cache
      await invalidateSdkKeyCache(oldSdkKey);

      createAuditEntry({
        action: 'environment.sdk_key_reset',
        resourceType: 'environment',
        resourceKey: environment.key,
        projectId: new Types.ObjectId(projectId),
        environmentKey: environment.key,
        author: { userId: req.user!._id, email: req.user!.email },
        previousValue: { sdkKey: '***' },
        currentValue: { sdkKey: '***' },
      });

      res.json({ sdkKey: newSdkKey });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /:envKey/reset-mobile-key — Reset mobile key
// ---------------------------------------------------------------------------

router.post(
  '/:envKey/reset-mobile-key',
  requireProjectRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId;
      const environment = await Environment.findOne({
        projectId,
        key: req.params.envKey,
      });

      if (!environment) {
        throw new NotFoundError('Environment', req.params.envKey);
      }

      const newMobileKey = generateMobileKey();
      environment.mobileKey = newMobileKey;
      await environment.save();

      createAuditEntry({
        action: 'environment.mobile_key_reset',
        resourceType: 'environment',
        resourceKey: environment.key,
        projectId: new Types.ObjectId(projectId),
        environmentKey: environment.key,
        author: { userId: req.user!._id, email: req.user!.email },
        previousValue: { mobileKey: '***' },
        currentValue: { mobileKey: '***' },
      });

      res.json({ mobileKey: newMobileKey });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
