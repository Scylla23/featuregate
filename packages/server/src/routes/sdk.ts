import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Flag } from '../models/Flag.js';
import { Segment } from '../models/Segment.js';
import { authenticateSDK } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { getCachedSdkPayload, setCachedSdkPayload } from '../services/cacheService.js';
import { toEvalFlag, toEvalSegment, buildSegmentIdToKeyMap } from '../utils/transformers.js';
import { evaluate } from '@featuregate/evaluator';
import type { Segment as EvalSegment } from '@featuregate/evaluator';
import { NotFoundError } from '../utils/errors.js';

const router: IRouter = Router();

// All SDK routes require SDK key auth
router.use(authenticateSDK);

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const evaluateSchema = z.object({
  flagKey: z.string().min(1),
  context: z
    .object({
      key: z.string().min(1),
    })
    .passthrough(),
});

const batchEvaluateSchema = z.object({
  context: z
    .object({
      key: z.string().min(1),
    })
    .passthrough(),
  flagKeys: z.array(z.string().min(1)).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadEnvData(projectId: unknown, environmentKey: string) {
  const [flags, segments] = await Promise.all([
    Flag.find({
      projectId,
      environmentKey,
      archived: { $ne: true },
    }).lean(),
    Segment.find({
      projectId,
      environmentKey,
      archived: { $ne: true },
    }).lean(),
  ]);

  const segmentIdToKeyMap = buildSegmentIdToKeyMap(
    segments as Array<{ _id: unknown; key: string }>,
  );

  return { flags, segments, segmentIdToKeyMap };
}

function buildSegmentsMap(
  segments: Array<{ key: string; included?: string[]; excluded?: string[]; rules?: unknown[] }>,
): Map<string, EvalSegment> {
  const map = new Map<string, EvalSegment>();
  for (const seg of segments) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.set(seg.key, toEvalSegment(seg as any));
  }
  return map;
}

function formatReason(result: { reason: string; ruleIndex?: number; ruleId?: string }) {
  const reason: Record<string, unknown> = { kind: result.reason };
  if (result.ruleIndex !== undefined) reason.ruleIndex = result.ruleIndex;
  if (result.ruleId !== undefined) reason.ruleId = result.ruleId;
  return reason;
}

// ---------------------------------------------------------------------------
// GET /flags — All flags + segments for SDK init
// ---------------------------------------------------------------------------

router.get('/flags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, key: envKey } = req.environment!;

    // Check cache
    const cached = await getCachedSdkPayload(envKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Load from DB
    const { flags, segments, segmentIdToKeyMap } = await loadEnvData(projectId, envKey);

    // Build response as keyed objects
    const flagsMap: Record<string, unknown> = {};
    for (const f of flags) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flagsMap[f.key] = toEvalFlag(f as any, segmentIdToKeyMap);
    }

    const segmentsMap: Record<string, unknown> = {};
    for (const s of segments) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      segmentsMap[s.key] = toEvalSegment(s as any);
    }

    const payload = { flags: flagsMap, segments: segmentsMap };

    // Cache for 60s
    await setCachedSdkPayload(envKey, payload);

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /evaluate — Evaluate single flag
// ---------------------------------------------------------------------------

router.post(
  '/evaluate',
  validateBody(evaluateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, key: envKey } = req.environment!;
      const { flagKey, context } = req.body;

      const { flags, segments, segmentIdToKeyMap } = await loadEnvData(projectId, envKey);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flagDoc = flags.find((f: any) => f.key === flagKey);
      if (!flagDoc) {
        throw new NotFoundError('Flag', flagKey);
      }

      // Check if archived
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((flagDoc as any).archived) {
        res.status(404).json({ error: 'Flag is archived' });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evalFlag = toEvalFlag(flagDoc as any, segmentIdToKeyMap);
      const segmentsMap = buildSegmentsMap(segments as Array<{ key: string }>);

      const result = evaluate(evalFlag, context, segmentsMap);

      res.json({
        flagKey,
        value: result.value,
        variationIndex: result.variationIndex,
        reason: formatReason(result),
      });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /evaluate/batch — Evaluate multiple flags
// ---------------------------------------------------------------------------

router.post(
  '/evaluate/batch',
  validateBody(batchEvaluateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, key: envKey } = req.environment!;
      const { context, flagKeys } = req.body;

      const { flags, segments, segmentIdToKeyMap } = await loadEnvData(projectId, envKey);
      const segmentsMap = buildSegmentsMap(segments as Array<{ key: string }>);

      // If flagKeys provided, filter; otherwise evaluate all
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const targetFlags = flagKeys
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          flags.filter((f: any) => flagKeys.includes(f.key))
        : flags;

      const results: Record<string, unknown> = {};

      for (const flagDoc of targetFlags) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const evalFlag = toEvalFlag(flagDoc as any, segmentIdToKeyMap);
        const result = evaluate(evalFlag, context, segmentsMap);
        results[flagDoc.key] = {
          value: result.value,
          variationIndex: result.variationIndex,
          reason: formatReason(result),
        };
      }

      res.json({ results });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
