import { Schema, model } from 'mongoose';

const auditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      enum: ['flag', 'segment', 'environment', 'member', 'apikey', 'project'],
      index: true,
    },
    resourceKey: { type: String, required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, required: true, index: true },
    environmentKey: { type: String, required: true },
    author: {
      userId: { type: Schema.Types.ObjectId, required: true },
      email: { type: String, required: true },
    },
    previousValue: { type: Schema.Types.Mixed, default: null },
    currentValue: { type: Schema.Types.Mixed, default: null },
    diff: { type: Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

auditLogSchema.index({ resourceType: 1, resourceKey: 1, timestamp: -1 });
auditLogSchema.index({ projectId: 1, timestamp: -1 });

export const AuditLog = model('AuditLog', auditLogSchema);
