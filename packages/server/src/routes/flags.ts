import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Flag } from '../models/Flag.js';
import { authenticateDashboard } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { invalidateFlagCache, publishFlagUpdate } from '../services/cacheService.js';
import { createAuditEntry } from '../services/auditService.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

const router: IRouter = Router();

// All flag routes require dashboard auth
router.use(authenticateDashboard);

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const flagKeyRegex = /^[a-z0-9][a-z0-9-]*$/;

const variationSchema = z.object({
  value: z.unknown(),
  name: z.string().optional(),
  description: z.string().optional(),
});

const clauseSchema = z.object({
  attribute: z.string().min(1),
  operator: z.string().min(1),
  values: z.array(z.unknown()),
  negate: z.boolean().optional(),
});

const rolloutSchema = z.object({
  variation: z.number().int().min(0).optional(),
  variations: z
    .array(
      z.object({
        variation: z.number().int().min(0),
        weight: z.number().int().min(0).max(100000),
      }),
    )
    .optional(),
});

const ruleSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),
  clauses: z.array(clauseSchema),
  rollout: rolloutSchema.optional(),
});

const createFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(128)
    .regex(flagKeyRegex, 'Key must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  projectId: z.string().min(1),
  environmentKey: z.string().min(1),
  enabled: z.boolean().default(false),
  variations: z.array(variationSchema).min(2, 'At least 2 variations required'),
  offVariation: z.number().int().min(0),
  fallthrough: z
    .object({
      variation: z.number().int().min(0).optional(),
      rollout: z
        .object({
          variations: z
            .array(
              z.object({
                variation: z.number().int().min(0),
                weight: z.number().int().min(0).max(100000),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
  targets: z
    .array(
      z.object({
        variation: z.number().int().min(0),
        values: z.array(z.string()),
      }),
    )
    .optional(),
  rules: z.array(ruleSchema).optional(),
  tags: z.array(z.string()).optional(),
});

const updateFlagSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  variations: z.array(variationSchema).min(2).optional(),
  offVariation: z.number().int().min(0).optional(),
  fallthrough: z
    .object({
      variation: z.number().int().min(0).optional(),
      rollout: z
        .object({
          variations: z
            .array(
              z.object({
                variation: z.number().int().min(0),
                weight: z.number().int().min(0).max(100000),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
  targets: z
    .array(
      z.object({
        variation: z.number().int().min(0),
        values: z.array(z.string()),
      }),
    )
    .optional(),
  rules: z.array(ruleSchema).optional(),
  tags: z.array(z.string()).optional(),
});

const listFlagsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tags: z.string().optional(),
  environmentKey: z.string().optional(),
  projectId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// POST / — Create flag
// ---------------------------------------------------------------------------

router.post(
  '/',
  validateBody(createFlagSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;

      // Validate offVariation is within bounds
      if (body.offVariation >= body.variations.length) {
        throw new ValidationError('offVariation index exceeds variations array length');
      }

      // Default fallthrough
      if (!body.fallthrough) {
        body.fallthrough = { variation: 0 };
      }

      const flag = await Flag.create(body);

      // Audit log
      createAuditEntry({
        action: 'flag.created',
        resourceType: 'flag',
        resourceKey: flag.key,
        projectId: flag.projectId,
        environmentKey: flag.environmentKey,
        author: { userId: req.user!._id, email: req.user!.email },
        currentValue: flag.toObject(),
      });

      // Invalidate cache
      await invalidateFlagCache(flag.environmentKey, flag.key);

      res.status(201).json(flag);
    } catch (error) {
      // Handle duplicate key
      if (
        error instanceof Error &&
        error.name === 'MongoServerError' &&
        (error as { code?: number }).code === 11000
      ) {
        next(new ConflictError('Flag key already exists'));
        return;
      }
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// GET / — List flags
// ---------------------------------------------------------------------------

router.get(
  '/',
  validateQuery(listFlagsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, search, tags, environmentKey, projectId } =
        req.query as unknown as z.infer<typeof listFlagsQuerySchema>;

      const filter: Record<string, unknown> = { archived: { $ne: true } };

      if (projectId) filter.projectId = projectId;
      if (environmentKey) filter.environmentKey = environmentKey;
      if (tags) {
        const tagList = tags.split(',').map((t) => t.trim());
        filter.tags = { $in: tagList };
      }
      if (search) {
        filter.$or = [
          { key: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
        ];
      }

      const [flags, total] = await Promise.all([
        Flag.find(filter)
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Flag.countDocuments(filter),
      ]);

      res.json({
        flags,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:key — Get single flag
// ---------------------------------------------------------------------------

router.get('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flag = await Flag.findOne({
      key: req.params.key,
      archived: { $ne: true },
    }).lean();

    if (!flag) {
      throw new NotFoundError('Flag', req.params.key);
    }

    res.json(flag);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PATCH /:key — Partial update
// ---------------------------------------------------------------------------

router.patch(
  '/:key',
  validateBody(updateFlagSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Reject attempts to change key
      if ('key' in req.body) {
        throw new ValidationError('Flag key is immutable and cannot be changed');
      }

      const previousFlag = await Flag.findOne({
        key: req.params.key,
        archived: { $ne: true },
      }).lean();

      if (!previousFlag) {
        throw new NotFoundError('Flag', req.params.key);
      }

      const updatedFlag = await Flag.findOneAndUpdate(
        { key: req.params.key, archived: { $ne: true } },
        { $set: req.body },
        { new: true, runValidators: true },
      ).lean();

      // Invalidate cache + publish
      await invalidateFlagCache(previousFlag.environmentKey, previousFlag.key);
      await publishFlagUpdate(previousFlag.environmentKey, previousFlag.key, 'flag.updated');

      // Audit log
      createAuditEntry({
        action: 'flag.updated',
        resourceType: 'flag',
        resourceKey: previousFlag.key,
        projectId: previousFlag.projectId,
        environmentKey: previousFlag.environmentKey,
        author: { userId: req.user!._id, email: req.user!.email },
        previousValue: previousFlag as Record<string, unknown>,
        currentValue: updatedFlag as Record<string, unknown>,
      });

      res.json(updatedFlag);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:key — Soft delete (archive)
// ---------------------------------------------------------------------------

router.delete('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flag = await Flag.findOneAndUpdate(
      { key: req.params.key, archived: { $ne: true } },
      { $set: { archived: true, archivedAt: new Date(), enabled: false } },
      { new: true },
    ).lean();

    if (!flag) {
      throw new NotFoundError('Flag', req.params.key);
    }

    await invalidateFlagCache(flag.environmentKey, flag.key);

    // Audit log
    createAuditEntry({
      action: 'flag.archived',
      resourceType: 'flag',
      resourceKey: flag.key,
      projectId: flag.projectId,
      environmentKey: flag.environmentKey,
      author: { userId: req.user!._id, email: req.user!.email },
      currentValue: flag as Record<string, unknown>,
    });

    res.json({ message: 'Flag archived' });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PATCH /:key/toggle — Quick toggle
// ---------------------------------------------------------------------------

router.patch('/:key/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const previousFlag = await Flag.findOne({
      key: req.params.key,
      archived: { $ne: true },
    }).lean();

    if (!previousFlag) {
      throw new NotFoundError('Flag', req.params.key);
    }

    const updatedFlag = await Flag.findOneAndUpdate(
      { key: req.params.key, archived: { $ne: true } },
      { $set: { enabled: !previousFlag.enabled } },
      { new: true },
    ).lean();

    await invalidateFlagCache(previousFlag.environmentKey, previousFlag.key);
    await publishFlagUpdate(previousFlag.environmentKey, previousFlag.key, 'flag.toggled');

    // Audit log
    createAuditEntry({
      action: 'flag.toggled',
      resourceType: 'flag',
      resourceKey: previousFlag.key,
      projectId: previousFlag.projectId,
      environmentKey: previousFlag.environmentKey,
      author: { userId: req.user!._id, email: req.user!.email },
      previousValue: { enabled: previousFlag.enabled },
      currentValue: { enabled: !previousFlag.enabled },
    });

    res.json(updatedFlag);
  } catch (error) {
    next(error);
  }
});

export default router;
