import { Schema, model } from 'mongoose';

const clauseSchema = new Schema(
  {
    attribute: { type: String, required: true },
    operator: { type: String, required: true },
    values: [{ type: Schema.Types.Mixed }],
    negate: { type: Boolean, default: false },
  },
  { _id: false },
);

const segmentRuleSchema = new Schema(
  {
    id: { type: String, required: true }, // UUID
    clauses: [clauseSchema], // ANDed together
    weight: { type: Number }, // Optional percentage rollout (0-100000)
    bucketBy: { type: String, default: 'key' }, // Attribute used for hashing
  },
  { _id: false },
);

/**
 * SegmentConfig — per-environment targeting configuration for a Segment.
 */
const segmentConfigSchema = new Schema(
  {
    segmentId: { type: Schema.Types.ObjectId, ref: 'Segment', required: true, index: true },
    segmentKey: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, required: true, index: true },
    environmentKey: { type: String, required: true, index: true },
    included: [String],
    excluded: [String],
    rules: [segmentRuleSchema],
  },
  { timestamps: true },
);

// One config per segment per environment
segmentConfigSchema.index({ segmentId: 1, environmentKey: 1 }, { unique: true });
// Fast lookups by project + environment
segmentConfigSchema.index({ projectId: 1, environmentKey: 1 });

export const SegmentConfig = model('SegmentConfig', segmentConfigSchema);
