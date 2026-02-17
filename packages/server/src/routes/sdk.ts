import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Flag } from '../models/Flag.js';
import { FlagConfig } from '../models/FlagConfig.js';
import { Segment } from '../models/Segment.js';
import { SegmentConfig } from '../models/SegmentConfig.js';
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

/**
 * Load flags + configs + segments + configs for a given environment,
 * returning merged docs ready for evaluation.
 */
async function loadEnvData(projectId: unknown, environmentKey: string) {
  const [flags, flagConfigs, segments, segmentConfigs] = await Promise.all([
    Flag.find({ projectId, archived: { $ne: true } }).lean(),
    FlagConfig.find({ projectId, environmentKey }).lean(),
    Segment.find({ projectId, archived: { $ne: true } }).lean(),
    SegmentConfig.find({ projectId, environmentKey }).lean(),
  ]);

  const segmentIdToKeyMap = buildSegmentIdToKeyMap(
    segments as Array<{ _id: unknown; key: string }>,
  );

  // Merge flags with their per-environment configs
  const configMap = new Map(flagConfigs.map((c) => [c.flagKey, c]));
  const mergedFlags = flags
    .filter((f) => configMap.has(f.key))
    .map((f) => {
      const cfg = configMap.get(f.key)!;
      return {
        key: f.key,
        enabled: cfg.enabled,
        variations: f.variations,
        offVariation: cfg.offVariation,
        fallthrough: cfg.fallthrough,
        targets: cfg.targets,
        rules: cfg.rules,
      };
    });

  // Merge segments with their per-environment configs
  const segConfigMap = new Map(segmentConfigs.map((c) => [c.segmentKey, c]));
  const mergedSegments = segments
    .filter((s) => segConfigMap.has(s.key))
    .map((s) => {
      const cfg = segConfigMap.get(s.key)!;
      return {
        key: s.key,
        included: cfg.included,
        excluded: cfg.excluded,
        rules: cfg.rules,
      };
    });

  return { flags: mergedFlags, segments: mergedSegments, segmentIdToKeyMap };
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
