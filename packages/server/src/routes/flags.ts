import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Flag } from '../models/Flag.js';
import { FlagConfig } from '../models/FlagConfig.js';
import { Segment } from '../models/Segment.js';
import { SegmentConfig } from '../models/SegmentConfig.js';
import { Environment } from '../models/Environment.js';
import { authenticateDashboard } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { invalidateFlagCache } from '../services/cacheService.js';
import { publishFlagUpdate } from '../sse/publisher.js';
import { createAuditEntry } from '../services/auditService.js';
import { toEvalFlag, toEvalSegment, buildSegmentIdToKeyMap } from '../utils/transformers.js';
import { evaluate } from '@featuregate/evaluator';
import type { Segment as EvalSegment } from '@featuregate/evaluator';
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
  bucketBy: z.string().optional(),
  seed: z.number().int().optional(),
});

const ruleSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),
  clauses: z.array(clauseSchema),
  rollout: rolloutSchema.optional(),
});

// Create flag — project-level, no environmentKey
const createFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(128)
    .regex(flagKeyRegex, 'Key must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  projectId: z.string().min(1),
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
          bucketBy: z.string().optional(),
          seed: z.number().int().optional(),
        })
        .optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
});

// Update flag definition — project-level fields only
const updateFlagSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  variations: z.array(variationSchema).min(2).optional(),
  tags: z.array(z.string()).optional(),
});

// Update per-environment config
const updateFlagConfigSchema = z.object({
  enabled: z.boolean().optional(),
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
          bucketBy: z.string().optional(),
          seed: z.number().int().optional(),
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
// Helpers
// ---------------------------------------------------------------------------

async function invalidateFlagCacheAllEnvs(
  projectId: unknown,
  flagKey: string,
): Promise<void> {
  const environments = await Environment.find({ projectId }).select('key').lean();
  await Promise.all(
    environments.map((env) => invalidateFlagCache(env.key, flagKey)),
  );
}

async function publishFlagUpdateAllEnvs(
  projectId: unknown,
  flagKey: string,
  payload: unknown,
): Promise<void> {
  const environments = await Environment.find({ projectId }).select('key').lean();
  await Promise.all(
    environments.map((env) => publishFlagUpdate(env.key, flagKey, payload)),
  );
}

// ---------------------------------------------------------------------------
// POST / — Create flag (project-level, configs for all environments)
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

      const defaultFallthrough = body.fallthrough || { variation: 0 };

      // Create project-level flag
      const flag = await Flag.create({
        key: body.key,
        name: body.name,
        description: body.description,
        projectId: body.projectId,
        variations: body.variations,
        tags: body.tags || [],
      });

      // Create a FlagConfig for every environment in the project
      const environments = await Environment.find({ projectId: body.projectId }).lean();
      if (environments.length > 0) {
        const configs = environments.map((env) => ({
          flagId: flag._id,
          flagKey: flag.key,
          projectId: flag.projectId,
          environmentKey: env.key,
          enabled: false,
          offVariation: body.offVariation,
          fallthrough: defaultFallthrough,
          targets: [],
          rules: [],
        }));
        await FlagConfig.insertMany(configs);
      }

      // Audit log
      createAuditEntry({
        action: 'flag.created',
        resourceType: 'flag',
        resourceKey: flag.key,
        projectId: flag.projectId,
        author: { userId: req.user!._id, email: req.user!.email },
        currentValue: flag.toObject(),
      });

      // Invalidate cache + publish for all environments
      for (const env of environments) {
        await invalidateFlagCache(env.key, flag.key);
        await publishFlagUpdate(env.key, flag.key, flag);
      }

      res.status(201).json(flag);
    } catch (error) {
      // Handle duplicate key
      if (
        error instanceof Error &&
        error.name === 'MongoServerError' &&
        (error as { code?: number }).code === 11000
      ) {
        next(new ConflictError('Flag key already exists in this project'));
        return;
      }
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// GET / — List flags (project-level, merged with per-env config)
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

      // Merge per-environment config (enabled status) if environmentKey is provided
      let mergedFlags = flags;
      if (environmentKey && projectId) {
        const flagKeys = flags.map((f) => f.key);
        const configs = await FlagConfig.find({
          projectId,
          environmentKey,
          flagKey: { $in: flagKeys },
        })
          .select('flagKey enabled')
          .lean();

        const configMap = new Map(configs.map((c) => [c.flagKey, c]));
        mergedFlags = flags.map((f) => ({
          ...f,
          enabled: configMap.get(f.key)?.enabled ?? false,
          environmentKey,
        }));
      }

      res.json({
        flags: mergedFlags,
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
// GET /:key — Get single flag (merged with per-env config)
// ---------------------------------------------------------------------------

router.get('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { environmentKey, projectId } = req.query as { environmentKey?: string; projectId?: string };

    const flagFilter: Record<string, unknown> = {
      key: req.params.key,
      archived: { $ne: true },
    };
    if (projectId) flagFilter.projectId = projectId;

    const flag = await Flag.findOne(flagFilter).lean();

    if (!flag) {
      throw new NotFoundError('Flag', req.params.key);
    }

    // Load per-environment config
    let config = null;
    if (environmentKey) {
      config = await FlagConfig.findOne({
        flagId: flag._id,
        environmentKey,
      }).lean();
    }

    res.json({ ...flag, config });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PATCH /:key — Update flag definition (project-level fields only)
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

      const { projectId } = req.query as { projectId?: string };

      const findFilter: Record<string, unknown> = {
        key: req.params.key,
        archived: { $ne: true },
      };
      if (projectId) findFilter.projectId = projectId;

      const previousFlag = await Flag.findOne(findFilter).lean();

      if (!previousFlag) {
        throw new NotFoundError('Flag', req.params.key);
      }

      const updatedFlag = await Flag.findOneAndUpdate(
        findFilter,
        { $set: req.body },
        { new: true, runValidators: true },
      ).lean();

      // Invalidate cache for ALL environments (variations may have changed)
      await invalidateFlagCacheAllEnvs(previousFlag.projectId, previousFlag.key);
      await publishFlagUpdateAllEnvs(previousFlag.projectId, previousFlag.key, updatedFlag);

      // Audit log
      createAuditEntry({
        action: 'flag.updated',
        resourceType: 'flag',
        resourceKey: previousFlag.key,
        projectId: previousFlag.projectId,
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
    const { projectId } = req.query as { projectId?: string };

    const findFilter: Record<string, unknown> = {
      key: req.params.key,
      archived: { $ne: true },
    };
    if (projectId) findFilter.projectId = projectId;

    const flag = await Flag.findOneAndUpdate(
      findFilter,
      { $set: { archived: true, archivedAt: new Date() } },
      { new: true },
    ).lean();

    if (!flag) {
      throw new NotFoundError('Flag', req.params.key);
    }

    // Disable all configs for this flag
    await FlagConfig.updateMany(
      { flagId: flag._id },
      { $set: { enabled: false } },
    );

    await invalidateFlagCacheAllEnvs(flag.projectId, flag.key);
    await publishFlagUpdateAllEnvs(flag.projectId, flag.key, flag);

    // Audit log
    createAuditEntry({
      action: 'flag.archived',
      resourceType: 'flag',
      resourceKey: flag.key,
      projectId: flag.projectId,
      author: { userId: req.user!._id, email: req.user!.email },
      currentValue: flag as Record<string, unknown>,
    });

    res.json({ message: 'Flag archived' });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PATCH /:key/toggle — Quick toggle for an environment
// ---------------------------------------------------------------------------

router.patch('/:key/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { environmentKey, projectId } = req.query as { environmentKey: string; projectId?: string };

    if (!environmentKey) {
      throw new ValidationError('environmentKey query parameter is required');
    }

    const flagFilter: Record<string, unknown> = {
      key: req.params.key,
      archived: { $ne: true },
    };
    if (projectId) flagFilter.projectId = projectId;

    const flag = await Flag.findOne(flagFilter).lean();
    if (!flag) {
      throw new NotFoundError('Flag', req.params.key);
    }

    const previousConfig = await FlagConfig.findOne({
      flagId: flag._id,
      environmentKey,
    }).lean();

    if (!previousConfig) {
      throw new NotFoundError('FlagConfig', `${req.params.key}/${environmentKey}`);
    }

    const updatedConfig = await FlagConfig.findOneAndUpdate(
      { flagId: flag._id, environmentKey },
      { $set: { enabled: !previousConfig.enabled } },
      { new: true },
    ).lean();

    await invalidateFlagCache(environmentKey, flag.key);
    await publishFlagUpdate(environmentKey, flag.key, { ...flag, ...updatedConfig });

    // Audit log
    createAuditEntry({
      action: 'flag.toggled',
      resourceType: 'flag',
      resourceKey: flag.key,
      projectId: flag.projectId,
      environmentKey,
      author: { userId: req.user!._id, email: req.user!.email },
      previousValue: { enabled: previousConfig.enabled },
      currentValue: { enabled: !previousConfig.enabled },
    });

    // Return merged flag+config for the dashboard
    res.json({
      ...flag,
      enabled: updatedConfig!.enabled,
      environmentKey,
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /:key/configs — Get configs for all environments
// ---------------------------------------------------------------------------

router.get('/:key/configs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.query as { projectId?: string };

    const flagFilter: Record<string, unknown> = {
      key: req.params.key,
      archived: { $ne: true },
    };
    if (projectId) flagFilter.projectId = projectId;

    const flag = await Flag.findOne(flagFilter).lean();
    if (!flag) {
      throw new NotFoundError('Flag', req.params.key);
    }

    const configs = await FlagConfig.find({ flagId: flag._id }).lean();
    res.json({ configs });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PATCH /:key/config/:environmentKey — Update targeting for one environment
// ---------------------------------------------------------------------------

router.patch(
  '/:key/config/:environmentKey',
  validateBody(updateFlagConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.query as { projectId?: string };
      const { key, environmentKey } = req.params;

      const flagFilter: Record<string, unknown> = {
        key,
        archived: { $ne: true },
      };
      if (projectId) flagFilter.projectId = projectId;

      const flag = await Flag.findOne(flagFilter).lean();
      if (!flag) {
        throw new NotFoundError('Flag', key);
      }

      const previousConfig = await FlagConfig.findOne({
        flagId: flag._id,
        environmentKey,
      }).lean();

      if (!previousConfig) {
        throw new NotFoundError('FlagConfig', `${key}/${environmentKey}`);
      }

      const updatedConfig = await FlagConfig.findOneAndUpdate(
        { flagId: flag._id, environmentKey },
        { $set: req.body },
        { new: true, runValidators: true },
      ).lean();

      await invalidateFlagCache(environmentKey, flag.key);
      await publishFlagUpdate(environmentKey, flag.key, { ...flag, ...updatedConfig });

      // Audit log
      createAuditEntry({
        action: 'flag.updated',
        resourceType: 'flag',
        resourceKey: flag.key,
        projectId: flag.projectId,
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
// POST /:key/evaluate — Evaluate flag with context (dashboard tester)
// ---------------------------------------------------------------------------

const dashboardEvaluateSchema = z.object({
  context: z
    .object({
      key: z.string().min(1),
    })
    .passthrough(),
  projectId: z.string().min(1),
  environmentKey: z.string().min(1),
});

router.post(
  '/:key/evaluate',
  validateBody(dashboardEvaluateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { context, projectId, environmentKey } = req.body;
      const flagKey = req.params.key;

      // Load flag + config for this environment
      const [flags, flagConfigs, segments, segmentConfigs] = await Promise.all([
        Flag.find({ projectId, archived: { $ne: true } }).lean(),
        FlagConfig.find({ projectId, environmentKey }).lean(),
        Segment.find({ projectId, archived: { $ne: true } }).lean(),
        SegmentConfig.find({ projectId, environmentKey }).lean(),
      ]);

      // Merge flags with configs
      const configMap = new Map(flagConfigs.map((c) => [c.flagKey, c]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flagDoc = flags.find((f: any) => f.key === flagKey);
      if (!flagDoc) {
        throw new NotFoundError('Flag', flagKey);
      }
      const flagConfig = configMap.get(flagKey);
      if (!flagConfig) {
        throw new NotFoundError('FlagConfig', `${flagKey}/${environmentKey}`);
      }

      const mergedDoc = {
        key: flagDoc.key,
        enabled: flagConfig.enabled,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variations: flagDoc.variations as any[],
        offVariation: flagConfig.offVariation,
        fallthrough: flagConfig.fallthrough,
        targets: flagConfig.targets,
        rules: flagConfig.rules,
      };

      // Build segment map
      const segmentIdToKeyMap = buildSegmentIdToKeyMap(
        segments as Array<{ _id: unknown; key: string }>,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evalFlag = toEvalFlag(mergedDoc as any, segmentIdToKeyMap);

      // Merge segments with configs
      const segConfigMap = new Map(segmentConfigs.map((c) => [c.segmentKey, c]));
      const segmentsMap = new Map<string, EvalSegment>();
      for (const seg of segments) {
        const segCfg = segConfigMap.get(seg.key);
        if (segCfg) {
          const mergedSeg = {
            key: seg.key,
            included: segCfg.included,
            excluded: segCfg.excluded,
            rules: segCfg.rules,
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          segmentsMap.set(seg.key, toEvalSegment(mergedSeg as any));
        }
      }

      const result = evaluate(evalFlag, context, segmentsMap);

      const reason: Record<string, unknown> = { kind: result.reason };
      if (result.ruleIndex !== undefined) reason.ruleIndex = result.ruleIndex;
      if (result.ruleId !== undefined) reason.ruleId = result.ruleId;

      res.json({
        flagKey,
        value: result.value,
        variationIndex: result.variationIndex,
        reason,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
