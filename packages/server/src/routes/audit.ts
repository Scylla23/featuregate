import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuditLog } from '../models/AuditLog.js';
import { authenticateDashboard } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';

const router: IRouter = Router();

// All audit routes require dashboard auth
router.use(authenticateDashboard);

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  resourceType: z.enum(['flag', 'segment']).optional(),
  resourceKey: z.string().optional(),
  action: z.string().optional(),
  author: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// ---------------------------------------------------------------------------
// GET / — List audit events
// ---------------------------------------------------------------------------

router.get(
  '/',
  validateQuery(auditQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, resourceType, resourceKey, action, author, from, to } =
        req.query as unknown as z.infer<typeof auditQuerySchema>;

      const filter: Record<string, unknown> = {};

      if (resourceType) filter.resourceType = resourceType;
      if (resourceKey) filter.resourceKey = resourceKey;
      if (action) filter.action = action;
      if (author) filter['author.email'] = author;
      if (from || to) {
        const timestampFilter: Record<string, Date> = {};
        if (from) timestampFilter.$gte = from;
        if (to) timestampFilter.$lte = to;
        filter.timestamp = timestampFilter;
      }

      const [entries, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ timestamp: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      res.json({
        entries,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
