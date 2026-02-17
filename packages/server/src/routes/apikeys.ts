import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { ApiKey } from '../models/ApiKey.js';
import { Environment } from '../models/Environment.js';
import { authenticateDashboard } from '../middleware/auth.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createAuditEntry } from '../services/auditService.js';
import { generateApiKey } from '../utils/keys.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const router: IRouter = Router({ mergeParams: true });

router.use(authenticateDashboard);

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const listApiKeysQuerySchema = z.object({
  status: z.enum(['active', 'revoked']).optional(),
  environmentId: z.string().optional(),
  keyType: z.enum(['server', 'client', 'mobile']).optional(),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  keyType: z.enum(['server', 'client', 'mobile']),
  environmentId: z.string().min(1),
  description: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// GET / — List API keys
// ---------------------------------------------------------------------------

router.get(
  '/',
  requireProjectRole('admin'),
  validateQuery(listApiKeysQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, environmentId, keyType } = req.query as unknown as z.infer<
        typeof listApiKeysQuerySchema
      >;
      const projectId = req.params.projectId;

      const filter: Record<string, unknown> = { projectId };

      if (status) filter.status = status;
      if (environmentId) filter.environmentId = environmentId;
      if (keyType) filter.keyType = keyType;

      const apiKeys = await ApiKey.find(filter).sort({ createdAt: -1 }).lean();

      const active = apiKeys.filter((k) => k.status === 'active').length;
      const revoked = apiKeys.filter((k) => k.status === 'revoked').length;

      res.json({
        apiKeys,
        total: apiKeys.length,
        active,
        revoked,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST / — Create API key
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireProjectRole('admin'),
  validateBody(createApiKeySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, keyType, environmentId, description, expiresAt } = req.body;
      const projectId = req.params.projectId;

      // Verify environment exists in this project
      const environment = await Environment.findOne({
        _id: environmentId,
        projectId,
      }).lean();

      if (!environment) {
        throw new ValidationError('Environment not found in this project');
      }

      const { fullKey, keyPrefix, keyHash } = generateApiKey(keyType);

      const apiKey = await ApiKey.create({
        projectId,
        environmentId,
        name,
        keyType,
        keyPrefix,
        keyHash,
        description,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: req.user!._id,
      });

      createAuditEntry({
        action: 'apikey.created',
        resourceType: 'apikey',
        resourceKey: name,
        projectId: new Types.ObjectId(projectId),
        author: { userId: req.user!._id, email: req.user!.email },
        currentValue: { ...apiKey.toObject(), keyPrefix },
      });

      // Return the full key ONCE — it will never be available again
      res.status(201).json({
        apiKey: apiKey.toObject(),
        fullKey,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /:keyId — Update API key name/description
// ---------------------------------------------------------------------------

router.patch(
  '/:keyId',
  requireProjectRole('admin'),
  validateBody(updateApiKeySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = await ApiKey.findOne({
        _id: req.params.keyId,
        projectId: req.params.projectId,
      });

      if (!apiKey) {
        throw new NotFoundError('API Key', req.params.keyId);
      }

      const previousValue = apiKey.toObject();

      if (req.body.name) apiKey.name = req.body.name;
      if (req.body.description !== undefined) apiKey.description = req.body.description;
      await apiKey.save();

      createAuditEntry({
        action: 'apikey.updated',
        resourceType: 'apikey',
        resourceKey: apiKey.name,
        projectId: new Types.ObjectId(req.params.projectId),
        author: { userId: req.user!._id, email: req.user!.email },
        previousValue: previousValue as Record<string, unknown>,
        currentValue: apiKey.toObject(),
      });

      res.json(apiKey);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /:keyId/revoke — Revoke an API key
// ---------------------------------------------------------------------------

router.post(
  '/:keyId/revoke',
  requireProjectRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = await ApiKey.findOne({
        _id: req.params.keyId,
        projectId: req.params.projectId,
        status: 'active',
      });

      if (!apiKey) {
        throw new NotFoundError('API Key', req.params.keyId);
      }

      apiKey.status = 'revoked';
      apiKey.revokedAt = new Date();
      apiKey.revokedBy = req.user!._id;
      await apiKey.save();

      createAuditEntry({
        action: 'apikey.revoked',
        resourceType: 'apikey',
        resourceKey: apiKey.name,
        projectId: new Types.ObjectId(req.params.projectId),
        author: { userId: req.user!._id, email: req.user!.email },
        currentValue: apiKey.toObject(),
      });

      res.json(apiKey);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:keyId — Hard delete a revoked key
// ---------------------------------------------------------------------------

router.delete(
  '/:keyId',
  requireProjectRole('owner'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = await ApiKey.findOne({
        _id: req.params.keyId,
        projectId: req.params.projectId,
      }).lean();

      if (!apiKey) {
        throw new NotFoundError('API Key', req.params.keyId);
      }

      if (apiKey.status !== 'revoked') {
        throw new ValidationError('Can only delete revoked keys. Revoke the key first.');
      }

      await ApiKey.deleteOne({ _id: apiKey._id });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
