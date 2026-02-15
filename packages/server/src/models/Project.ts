import { Schema, model } from 'mongoose';

const projectSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true }, // e.g., 'my-app'
    name: { type: String, required: true },
  },
  { timestamps: true },
);

export const Project = model('Project', projectSchema);
