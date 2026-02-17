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

const ruleSchema = new Schema(
  {
    id: { type: String, required: true }, // UUID for audit refs
    description: String,
    clauses: [clauseSchema],
    rollout: {
      variation: Number, // Fixed index
      variations: [{ variation: Number, weight: Number }], // Percentage split
    },
  },
  { _id: false },
);

/**
 * FlagConfig — per-environment targeting configuration for a Flag.
 */
const flagConfigSchema = new Schema(
  {
    flagId: { type: Schema.Types.ObjectId, ref: 'Flag', required: true, index: true },
    flagKey: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, required: true, index: true },
    environmentKey: { type: String, required: true, index: true },
    enabled: { type: Boolean, default: false },
    offVariation: { type: Number, required: true },
    fallthrough: {
      variation: Number,
      rollout: { variations: [{ variation: Number, weight: Number }] },
    },
    targets: [
      {
        variation: Number,
        values: [String],
      },
    ],
    rules: [ruleSchema],
  },
  { timestamps: true },
);

// One config per flag per environment
flagConfigSchema.index({ flagId: 1, environmentKey: 1 }, { unique: true });
// Fast lookups by project + environment (used by SDK endpoint)
flagConfigSchema.index({ projectId: 1, environmentKey: 1 });
// Fast lookup by flagKey + environment (used by dashboard routes)
flagConfigSchema.index({ projectId: 1, environmentKey: 1, flagKey: 1 });

export const FlagConfig = model('FlagConfig', flagConfigSchema);
