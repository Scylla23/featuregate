import { Schema, model } from 'mongoose';

export const variationSchema = new Schema(
  {
    value: { type: Schema.Types.Mixed, required: true }, // Mixed for bool, string, etc.
    name: String,
    description: String,
  },
  { _id: false },
);

/**
 * Flag — project-level definition.
 * Targeting config (enabled, rules, targets, etc.) lives in FlagConfig per environment.
 */
const flagSchema = new Schema(
  {
    key: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    projectId: { type: Schema.Types.ObjectId, required: true, index: true },
    variations: [variationSchema],
    tags: [String],
    archived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// key is unique within a project (not globally)
flagSchema.index({ projectId: 1, key: 1 }, { unique: true });

export const Flag = model('Flag', flagSchema);
