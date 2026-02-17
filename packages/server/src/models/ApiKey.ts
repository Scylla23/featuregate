import { Schema, model } from 'mongoose';

const apiKeySchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    environmentId: { type: Schema.Types.ObjectId, ref: 'Environment', required: true, index: true },
    name: { type: String, required: true },
    keyType: {
      type: String,
      enum: ['server', 'client', 'mobile'],
      required: true,
    },
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
    },
    expiresAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

apiKeySchema.index({ keyHash: 1 }, { unique: true });
apiKeySchema.index({ projectId: 1, status: 1 });
apiKeySchema.index({ projectId: 1, environmentId: 1 });

export const ApiKey = model('ApiKey', apiKeySchema);
