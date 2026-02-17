import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      environment?: {
        _id: Types.ObjectId;
        key: string;
        projectId: Types.ObjectId;
        sdkKey: string;
      };
      user?: {
        _id: Types.ObjectId;
        email: string;
        role: 'admin' | 'editor' | 'viewer';
        projectRole?: 'owner' | 'admin' | 'developer' | 'viewer';
      };
    }
  }
}

export {};
