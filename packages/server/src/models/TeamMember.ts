import { Schema, model } from 'mongoose';

const teamMemberSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: '' },
    role: {
      type: String,
      enum: ['owner', 'admin', 'developer', 'viewer'],
      default: 'developer',
    },
    status: {
      type: String,
      enum: ['active', 'invited', 'deactivated'],
      default: 'invited',
    },
    inviteToken: { type: String, unique: true, sparse: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    invitedAt: { type: Date },
    joinedAt: { type: Date },
    lastActiveAt: { type: Date },
  },
  { timestamps: true },
);

// One membership per user per project
teamMemberSchema.index({ projectId: 1, email: 1 }, { unique: true });
teamMemberSchema.index({ projectId: 1, userId: 1 });

export const TeamMember = model('TeamMember', teamMemberSchema);
