import { Schema, model } from 'mongoose';

const variationSchema = new Schema(
  {
    value: { type: Schema.Types.Mixed, required: true }, // Mixed for bool, string, etc.
    name: String,
    description: String,
  },
  { _id: false },
);

const clauseSchema = new Schema(
  {
    attribute: { type: String, required: true },
    operator: { type: String, required: true },
    values: [{ type: Schema.Types.Mixed }],
    negate: { type: Boolean, default: false }, // From spec image
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

const flagSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: String,
    projectId: { type: Schema.Types.ObjectId, required: true, index: true },
    environmentKey: { type: String, required: true, index: true },
    enabled: { type: Boolean, default: false },
    variations: [variationSchema],
    offVariation: { type: Number, required: true }, // Served when enabled=false
    fallthrough: {
      variation: Number,
      rollout: { variations: [{ variation: Number, weight: Number }] },
    },
    targets: [
      {
        variation: Number,
        values: [String], // Array of userIds
      },
    ],
    rules: [ruleSchema],
    tags: [String],
    archived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Composite index for fast lookups within a specific environment/project
flagSchema.index({ projectId: 1, environmentKey: 1, key: 1 });

export const Flag = model('Flag', flagSchema);
