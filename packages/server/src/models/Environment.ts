import { Schema, model } from 'mongoose';

const environmentSchema = new Schema(
  {
    key: { type: String, required: true, index: true }, // e.g., 'production'
    name: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    sdkKey: { type: String, required: true, unique: true, index: true }, // Used for SDK Auth
  },
  { timestamps: true },
);

// Ensure environment keys are unique within a single project
environmentSchema.index({ projectId: 1, key: 1 }, { unique: true });

export const Environment = model('Environment', environmentSchema);
