import { Schema, model } from 'mongoose';

/**
 * Segment — project-level definition.
 * Per-environment config (included, excluded, rules) lives in SegmentConfig.
 */
const segmentSchema = new Schema(
  {
    key: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    projectId: { type: Schema.Types.ObjectId, required: true, index: true },
    tags: [String],
    archived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// key is unique within a project (not globally)
segmentSchema.index({ projectId: 1, key: 1 }, { unique: true });

export const Segment = model('Segment', segmentSchema);
