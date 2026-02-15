import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { Environment } from '../models/Environment.js';
import { getCachedSdkKey, setCachedSdkKey } from '../services/cacheService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// ---------------------------------------------------------------------------
// SDK Authentication (X-API-Key header)
// ---------------------------------------------------------------------------

export async function authenticateSDK(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const apiKey = req.header('X-API-Key');
    if (!apiKey) {
      res.status(401).json({ error: 'Missing X-API-Key header' });
      return;
    }

    // Check Redis cache first
    let envData = await getCachedSdkKey<{
      _id: string;
      key: string;
      projectId: string;
      sdkKey: string;
    }>(apiKey);

    if (!envData) {
      // Cache miss — query MongoDB
      const env = await Environment.findOne({ sdkKey: apiKey }).lean();
      if (!env) {
        res.status(401).json({ error: 'Invalid SDK key' });
        return;
      }

      envData = {
        _id: String(env._id),
        key: env.key,
        projectId: String(env.projectId),
        sdkKey: env.sdkKey,
      };

      await setCachedSdkKey(apiKey, envData);
    }

    req.environment = {
      _id: new Types.ObjectId(envData._id),
      key: envData.key,
      projectId: new Types.ObjectId(envData.projectId),
      sdkKey: envData.sdkKey,
    };
    next();
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// Dashboard Authentication (Bearer JWT)
// ---------------------------------------------------------------------------

interface JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

export async function authenticateDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

    req.user = {
      _id: new Types.ObjectId(payload.userId),
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    next(error);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
