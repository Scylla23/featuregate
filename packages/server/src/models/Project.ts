import { Schema, model } from 'mongoose';

const projectSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true }, // e.g., 'my-app'
    name: { type: String, required: true },
    description: { type: String, default: '' },
    defaultEnvironmentId: { type: Schema.Types.ObjectId, ref: 'Environment', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Project = model('Project', projectSchema);
