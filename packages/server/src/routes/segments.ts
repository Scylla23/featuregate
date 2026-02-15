import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Segment } from '../models/Segment.js';
import { Flag } from '../models/Flag.js';
import { authenticateDashboard } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { invalidateSegmentCache, publishSegmentUpdate } from '../services/cacheService.js';
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

const createSegmentSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(128)
    .regex(segmentKeyRegex, 'Key must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  projectId: z.string().min(1),
  environmentKey: z.string().min(1),
  included: z.array(z.string()).optional(),
  excluded: z.array(z.string()).optional(),
  rules: z.array(segmentRuleSchema).optional(),
  tags: z.array(z.string()).optional(),
});

const updateSegmentSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  included: z.array(z.string()).optional(),
  excluded: z.array(z.string()).optional(),
  rules: z.array(segmentRuleSchema).optional(),
  tags: z.array(z.string()).optional(),
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
});

// ---------------------------------------------------------------------------
// Helper: find flags referencing a segment
// ---------------------------------------------------------------------------

async function findFlagsReferencingSegment(segmentKey: string, segmentId: string) {
  return Flag.find({
    archived: { $ne: true },
    $or: [
      { 'rules.clauses.attribute': `segment:${segmentKey}` },
      {
        'rules.clauses.attribute': 'segmentMatch',
        'rules.clauses.values': { $in: [segmentKey, segmentId] },
      },
    ],
  })
    .select('key name enabled')
    .lean();
}

// ---------------------------------------------------------------------------
// POST / — Create segment
// ---------------------------------------------------------------------------

router.post(
  '/',
  validateBody(createSegmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const segment = await Segment.create(req.body);

      createAuditEntry({
        action: 'segment.created',
        resourceType: 'segment',
        resourceKey: segment.key,
        projectId: segment.projectId,
        environmentKey: segment.environmentKey,
        author: { userId: req.user!._id, email: req.user!.email },
        currentValue: segment.toObject(),
      });

      res.status(201).json(segment);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'MongoServerError' &&
        (error as { code?: number }).code === 11000
      ) {
        next(new ConflictError('Segment key already exists'));
        return;
      }
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// GET / — List segments
// ---------------------------------------------------------------------------

router.get(
  '/',
  validateQuery(listSegmentsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, search, tags, environmentKey, projectId } =
        req.query as unknown as z.infer<typeof listSegmentsQuerySchema>;

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
// GET /:key — Get single segment
// ---------------------------------------------------------------------------

router.get('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segment = await Segment.findOne({
      key: req.params.key,
      archived: { $ne: true },
    }).lean();

    if (!segment) {
      throw new NotFoundError('Segment', req.params.key);
    }

    res.json(segment);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PATCH /:key — Update segment
// ---------------------------------------------------------------------------

router.patch(
  '/:key',
  validateBody(updateSegmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ('key' in req.body) {
        throw new ValidationError('Segment key is immutable and cannot be changed');
      }

      const previous = await Segment.findOne({
        key: req.params.key,
        archived: { $ne: true },
      }).lean();

      if (!previous) {
        throw new NotFoundError('Segment', req.params.key);
      }

      const updated = await Segment.findOneAndUpdate(
        { key: req.params.key, archived: { $ne: true } },
        { $set: req.body },
        { new: true, runValidators: true },
      ).lean();

      await invalidateSegmentCache(previous.environmentKey);
      await publishSegmentUpdate(previous.environmentKey, previous.key, 'segment.updated');

      createAuditEntry({
        action: 'segment.updated',
        resourceType: 'segment',
        resourceKey: previous.key,
        projectId: previous.projectId,
        environmentKey: previous.environmentKey,
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
// DELETE /:key — Soft delete (block if referenced by active flags)
// ---------------------------------------------------------------------------

router.delete('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segment = await Segment.findOne({
      key: req.params.key,
      archived: { $ne: true },
    }).lean();

    if (!segment) {
      throw new NotFoundError('Segment', req.params.key);
    }

    // Check if referenced by active flags
    const referencingFlags = await findFlagsReferencingSegment(
      segment.key,
      String(segment._id),
    );

    if (referencingFlags.length > 0) {
      res.status(409).json({
        error: 'Segment is referenced by active flags',
        flags: referencingFlags.map((f) => f.key),
      });
      return;
    }

    await Segment.findOneAndUpdate(
      { key: req.params.key },
      { $set: { archived: true, archivedAt: new Date() } },
    );

    await invalidateSegmentCache(segment.environmentKey);

    createAuditEntry({
      action: 'segment.archived',
      resourceType: 'segment',
      resourceKey: segment.key,
      projectId: segment.projectId,
      environmentKey: segment.environmentKey,
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
      const segment = await Segment.findOne({
        key: req.params.key,
        archived: { $ne: true },
      }).lean();

      if (!segment) {
        throw new NotFoundError('Segment', req.params.key);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evalSegment = toEvalSegment(segment as any);
      const match = isUserInSegment(req.body.context, evalSegment);

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

    const flags = await findFlagsReferencingSegment(segment.key, String(segment._id));

    res.json({
      flags: flags.map((f) => ({
        key: f.key,
        name: f.name,
        enabled: f.enabled,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
