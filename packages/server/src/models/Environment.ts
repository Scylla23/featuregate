import { Schema, model } from 'mongoose';

const environmentSchema = new Schema(
  {
    key: { type: String, required: true, index: true }, // e.g., 'production'
    name: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    sdkKey: { type: String, required: true, unique: true, index: true }, // Used for SDK Auth
    description: { type: String, default: '' },
    color: { type: String, default: '#6366f1' },
    mobileKey: { type: String, unique: true, sparse: true },
    clientSideId: { type: String, unique: true, sparse: true },
    isCritical: { type: Boolean, default: false },
    requireConfirmation: { type: Boolean, default: false },
    requireComments: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Ensure environment keys are unique within a single project
environmentSchema.index({ projectId: 1, key: 1 }, { unique: true });

export const Environment = model('Environment', environmentSchema);
