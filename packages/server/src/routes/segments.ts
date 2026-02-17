import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Segment } from '../models/Segment.js';
import { SegmentConfig } from '../models/SegmentConfig.js';
import { FlagConfig } from '../models/FlagConfig.js';
import { Environment } from '../models/Environment.js';
import { authenticateDashboard } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { invalidateSegmentCache } from '../services/cacheService.js';
import { publishSegmentUpdate } from '../sse/publisher.js';
import { createAuditEntry } from '../services/auditService.js';
import { isUserInSegment } from '@featuregate/evaluator';
import { toEvalSegment } from '../utils/transformers.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

const router: IRouter = Router();

// All segment routes require dashboard auth
router.use(authenticateDashboard);

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const segmentKeyRegex = /^[a-z0-9][a-z0-9-]*$/;

const clauseSchema = z.object({
  attribute: z.string().min(1),
  operator: z.string().min(1),
  values: z.array(z.unknown()),
  negate: z.boolean().optional(),
});

const segmentRuleSchema = z.object({
  id: z.string().min(1),
  clauses: z.array(clauseSchema),
  weight: z.number().int().min(0).max(100000).optional(),
  bucketBy: z.string().optional(),
});

// Create segment — project-level, no environmentKey
const createSegmentSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(128)
    .regex(segmentKeyRegex, 'Key must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  projectId: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

// Update segment definition — project-level fields only
const updateSegmentSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Update per-environment segment config
const updateSegmentConfigSchema = z.object({
  included: z.array(z.string()).optional(),
  excluded: z.array(z.string()).optional(),
  rules: z.array(segmentRuleSchema).optional(),
});

const listSegmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tags: z.string().optional(),
  environmentKey: z.string().optional(),
  projectId: z.string().optional(),
});

const checkMembershipSchema = z.object({
  context: z
    .object({
      key: z.string().min(1),
    })
    .passthrough(),
  environmentKey: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Helper: find flags referencing a segment (via FlagConfig rules)
// ---------------------------------------------------------------------------

async function findFlagsReferencingSegment(segmentKey: string, segmentId: string) {
  return FlagConfig.find({
    $or: [
      { 'rules.clauses.attribute': `segment:${segmentKey}` },
      {
        'rules.clauses.attribute': 'segmentMatch',
        'rules.clauses.values': { $in: [segmentKey, segmentId] },
      },
    ],
  })
    .select('flagKey environmentKey enabled')
    .lean();
}

async function invalidateSegmentCacheAllEnvs(projectId: unknown): Promise<void> {
  const environments = await Environment.find({ projectId }).select('key').lean();
  await Promise.all(
    environments.map((env) => invalidateSegmentCache(env.key)),
  );
}

// ---------------------------------------------------------------------------
// POST / — Create segment (project-level, configs for all environments)
// ---------------------------------------------------------------------------

router.post(
  '/',
  validateBody(createSegmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;

      // Create project-level segment
      const segment = await Segment.create({
        key: body.key,
        name: body.name,
        description: body.description,
        projectId: body.projectId,
        tags: body.tags || [],
      });

      // Create SegmentConfig for every environment in the project
      const environments = await Environment.find({ projectId: body.projectId }).lean();
      if (environments.length > 0) {
        const configs = environments.map((env) => ({
          segmentId: segment._id,
          segmentKey: segment.key,
          projectId: segment.projectId,
          environmentKey: env.key,
          included: [],
          excluded: [],
          rules: [],
        }));
        await SegmentConfig.insertMany(configs);
      }

      createAuditEntry({
        action: 'segment.created',
        resourceType: 'segment',
        resourceKey: segment.key,
        projectId: segment.projectId,
        author: { userId: req.user!._id, email: req.user!.email },
        currentValue: segment.toObject(),
      });

      for (const env of environments) {
        await publishSegmentUpdate(env.key, segment.key, segment);
      }

      res.status(201).json(segment);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'MongoServerError' &&
        (error as { code?: number }).code === 11000
      ) {
        next(new ConflictError('Segment key already exists in this project'));
        return;
      }
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// GET / — List segments (project-level)
// ---------------------------------------------------------------------------

router.get(
  '/',
  validateQuery(listSegmentsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, search, tags, projectId } =
        req.query as unknown as z.infer<typeof listSegmentsQuerySchema>;

      const filter: Record<string, unknown> = { archived: { $ne: true } };

      if (projectId) filter.projectId = projectId;
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

      const [segments, total] = await Promise.all([
        Segment.find(filter)
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Segment.countDocuments(filter),
      ]);

      res.json({
        segments,
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
// GET /:key — Get single segment (merged with per-env config)
// ---------------------------------------------------------------------------

router.get('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { environmentKey, projectId } = req.query as { environmentKey?: string; projectId?: string };

    const segFilter: Record<string, unknown> = {
      key: req.params.key,
      archived: { $ne: true },
    };
    if (projectId) segFilter.projectId = projectId;

    const segment = await Segment.findOne(segFilter).lean();

    if (!segment) {
      throw new NotFoundError('Segment', req.params.key);
    }

    let config = null;
    if (environmentKey) {
      config = await SegmentConfig.findOne({
        segmentId: segment._id,
        environmentKey,
      }).lean();
    }

    res.json({ ...segment, config });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PATCH /:key — Update segment definition (project-level fields only)
// ---------------------------------------------------------------------------

router.patch(
  '/:key',
  validateBody(updateSegmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ('key' in req.body) {
        throw new ValidationError('Segment key is immutable and cannot be changed');
      }

      const { projectId } = req.query as { projectId?: string };

      const findFilter: Record<string, unknown> = {
        key: req.params.key,
        archived: { $ne: true },
      };
      if (projectId) findFilter.projectId = projectId;

      const previous = await Segment.findOne(findFilter).lean();

      if (!previous) {
        throw new NotFoundError('Segment', req.params.key);
      }

      const updated = await Segment.findOneAndUpdate(
        findFilter,
        { $set: req.body },
        { new: true, runValidators: true },
      ).lean();

      await invalidateSegmentCacheAllEnvs(previous.projectId);

      createAuditEntry({
        action: 'segment.updated',
        resourceType: 'segment',
        resourceKey: previous.key,
        projectId: previous.projectId,
        author: { userId: req.user!._id, email: req.user!.email },
        previousValue: previous as Record<string, unknown>,
        currentValue: updated as Record<string, unknown>,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /:key/config/:environmentKey — Update config for one environment
// ---------------------------------------------------------------------------

router.patch(
  '/:key/config/:environmentKey',
  validateBody(updateSegmentConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.query as { projectId?: string };
      const { key, environmentKey } = req.params;

      const segFilter: Record<string, unknown> = {
        key,
        archived: { $ne: true },
      };
      if (projectId) segFilter.projectId = projectId;

      const segment = await Segment.findOne(segFilter).lean();
      if (!segment) {
        throw new NotFoundError('Segment', key);
      }

      const previousConfig = await SegmentConfig.findOne({
        segmentId: segment._id,
        environmentKey,
      }).lean();

      if (!previousConfig) {
        throw new NotFoundError('SegmentConfig', `${key}/${environmentKey}`);
      }

      const updatedConfig = await SegmentConfig.findOneAndUpdate(
        { segmentId: segment._id, environmentKey },
        { $set: req.body },
        { new: true, runValidators: true },
      ).lean();

      await invalidateSegmentCache(environmentKey);
      await publishSegmentUpdate(environmentKey, segment.key, { ...segment, ...updatedConfig });

      createAuditEntry({
        action: 'segment.updated',
        resourceType: 'segment',
        resourceKey: segment.key,
        projectId: segment.projectId,
        environmentKey,
        author: { userId: req.user!._id, email: req.user!.email },
        previousValue: previousConfig as Record<string, unknown>,
        currentValue: updatedConfig as Record<string, unknown>,
      });

      res.json(updatedConfig);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:key — Soft delete (block if referenced by active flags)
// ---------------------------------------------------------------------------

router.delete('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.query as { projectId?: string };

    const segFilter: Record<string, unknown> = {
      key: req.params.key,
      archived: { $ne: true },
    };
    if (projectId) segFilter.projectId = projectId;

    const segment = await Segment.findOne(segFilter).lean();

    if (!segment) {
      throw new NotFoundError('Segment', req.params.key);
    }

    // Check if referenced by active flag configs
    const referencingFlags = await findFlagsReferencingSegment(
      segment.key,
      String(segment._id),
    );

    if (referencingFlags.length > 0) {
      res.status(409).json({
        error: 'Segment is referenced by active flags',
        flags: referencingFlags.map((f) => f.flagKey),
      });
      return;
    }

    await Segment.findOneAndUpdate(
      { _id: segment._id },
      { $set: { archived: true, archivedAt: new Date() } },
    );

    // Delete all configs for this segment
    await SegmentConfig.deleteMany({ segmentId: segment._id });

    await invalidateSegmentCacheAllEnvs(segment.projectId);

    createAuditEntry({
      action: 'segment.archived',
      resourceType: 'segment',
      resourceKey: segment.key,
      projectId: segment.projectId,
      author: { userId: req.user!._id, email: req.user!.email },
      currentValue: segment as Record<string, unknown>,
    });

    res.json({ message: 'Segment archived' });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /:key/check — Check segment membership
// ---------------------------------------------------------------------------

router.post(
  '/:key/check',
  validateBody(checkMembershipSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { context, environmentKey } = req.body;

      const segment = await Segment.findOne({
        key: req.params.key,
        archived: { $ne: true },
      }).lean();

      if (!segment) {
        throw new NotFoundError('Segment', req.params.key);
      }

      const config = await SegmentConfig.findOne({
        segmentId: segment._id,
        environmentKey,
      }).lean();

      if (!config) {
        throw new NotFoundError('SegmentConfig', `${req.params.key}/${environmentKey}`);
      }

      const mergedSeg = {
        key: segment.key,
        included: config.included,
        excluded: config.excluded,
        rules: config.rules,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evalSegment = toEvalSegment(mergedSeg as any);
      const match = isUserInSegment(context, evalSegment);

      res.json({
        match,
        reason: match ? 'User matches segment criteria' : 'User does not match segment criteria',
      });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:key/flags — List flags referencing this segment
// ---------------------------------------------------------------------------

router.get('/:key/flags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segment = await Segment.findOne({
      key: req.params.key,
      archived: { $ne: true },
    }).lean();

    if (!segment) {
      throw new NotFoundError('Segment', req.params.key);
    }

    const flagConfigs = await findFlagsReferencingSegment(segment.key, String(segment._id));

    res.json({
      flags: flagConfigs.map((f) => ({
        key: f.flagKey,
        environmentKey: f.environmentKey,
        enabled: f.enabled,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
