import { Schema, model } from 'mongoose';

// Reusing the same clause structure as Flags for consistency
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

const segmentSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: String,
    projectId: { type: Schema.Types.ObjectId, required: true, index: true },
    environmentKey: { type: String, required: true, index: true },
    included: [String], // Explicit user IDs (Highest priority)
    excluded: [String], // Explicit user IDs (Overrides rules)
    rules: [segmentRuleSchema], // ORed together
    tags: [String],
    archived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Composite index for environment-scoped lookups
segmentSchema.index({ projectId: 1, environmentKey: 1, key: 1 });

export const Segment = model('Segment', segmentSchema);
