import { Router, type Router as IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { TeamMember } from '../models/TeamMember.js';
import { User } from '../models/User.js';
import { authenticateDashboard } from '../middleware/auth.js';
import { requireProjectRole, roleAtLeast, type ProjectRole } from '../middleware/rbac.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createAuditEntry } from '../services/auditService.js';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../utils/errors.js';

const router: IRouter = Router({ mergeParams: true });

router.use(authenticateDashboard);

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const listMembersQuerySchema = z.object({
  status: z.enum(['active', 'invited', 'deactivated']).optional(),
  role: z.enum(['owner', 'admin', 'developer', 'viewer']).optional(),
  search: z.string().optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'developer', 'viewer']),
  name: z.string().max(100).optional(),
});

const changeRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'developer', 'viewer']),
});

// ---------------------------------------------------------------------------
// GET / — List team members
// ---------------------------------------------------------------------------

router.get(
  '/',
  requireProjectRole('viewer'),
  validateQuery(listMembersQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, role, search } = req.query as unknown as z.infer<
        typeof listMembersQuerySchema
      >;
      const projectId = req.params.projectId;

      const filter: Record<string, unknown> = { projectId };

      if (status) filter.status = status;
      if (role) filter.role = role;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const members = await TeamMember.find(filter).sort({ role: 1, name: 1 }).lean();

      const active = members.filter((m) => m.status === 'active').length;
      const invited = members.filter((m) => m.status === 'invited').length;

      res.json({
        members,
        total: members.length,
        active,
        invited,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /invite — Invite a team member
// ---------------------------------------------------------------------------

router.post(
  '/invite',
  requireProjectRole('admin'),
  validateBody(inviteMemberSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, role, name } = req.body;
      const projectId = req.params.projectId;
      const inviterRole = req.user!.projectRole as ProjectRole;

      // Cannot assign a role higher than your own
      if (!roleAtLeast(inviterRole, role)) {
        throw new ForbiddenError(`Cannot assign ${role} role — your role is ${inviterRole}`);
      }

      // Only owners can invite other owners
      if (role === 'owner' && inviterRole !== 'owner') {
        throw new ForbiddenError('Only owners can invite other owners');
      }

      // Check if already a member (active or invited)
      const existing = await TeamMember.findOne({
        projectId,
        email: email.toLowerCase(),
        status: { $in: ['active', 'invited'] },
      }).lean();

      if (existing) {
        throw new ConflictError(
          `This email is already ${existing.status === 'active' ? 'an active member' : 'a pending invitation'}`,
        );
      }

      // Check if user exists in the system
      const existingUser = await User.findOne({ email: email.toLowerCase() }).lean();

      const inviteToken = crypto.randomBytes(32).toString('hex');

      const member = await TeamMember.create({
        projectId,
        userId: existingUser?._id ?? null,
        email: email.toLowerCase(),
        name: name || existingUser?.name || '',
        role,
        status: 'invited',
        inviteToken,
        invitedBy: req.user!._id,
        invitedAt: new Date(),
      });

      // TODO: Send invitation email with inviteToken

      createAuditEntry({
        action: 'member.invited',
        resourceType: 'member',
        resourceKey: email,
        projectId: new Types.ObjectId(projectId),
        author: { userId: req.user!._id, email: req.user!.email },
        currentValue: member.toObject(),
      });

      res.status(201).json(member);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'MongoServerError' &&
        (error as { code?: number }).code === 11000
      ) {
        next(new ConflictError('This email is already a member of this project'));
        return;
      }
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /accept-invite — Accept an invitation
// ---------------------------------------------------------------------------

router.post(
  '/accept-invite',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { inviteToken } = req.body;
      if (!inviteToken) {
        throw new ValidationError('Invite token is required');
      }

      const member = await TeamMember.findOne({
        projectId: req.params.projectId,
        inviteToken,
        status: 'invited',
      });

      if (!member) {
        throw new NotFoundError('Invitation', 'token');
      }

      // Associate with the authenticated user
      member.userId = req.user!._id;
      member.name = member.name || req.user!.email.split('@')[0];
      member.status = 'active';
      member.joinedAt = new Date();
      member.inviteToken = undefined as unknown as string;
      await member.save();

      createAuditEntry({
        action: 'member.joined',
        resourceType: 'member',
        resourceKey: member.email,
        projectId: new Types.ObjectId(req.params.projectId),
        author: { userId: req.user!._id, email: req.user!.email },
        currentValue: member.toObject(),
      });

      res.json(member);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /:memberId/role — Change a member's role
// ---------------------------------------------------------------------------

router.patch(
  '/:memberId/role',
  requireProjectRole('admin'),
  validateBody(changeRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role: newRole } = req.body;
      const projectId = req.params.projectId;
      const memberId = req.params.memberId;
      const requesterRole = req.user!.projectRole as ProjectRole;

      const member = await TeamMember.findOne({
        _id: memberId,
        projectId,
        status: { $ne: 'deactivated' },
      });

      if (!member) {
        throw new NotFoundError('Member', memberId);
      }

      // Cannot change your own role
      if (member.userId?.toString() === req.user!._id.toString()) {
        throw new ValidationError('Cannot change your own role');
      }

      // Only owners can promote/demote to owner
      if ((newRole === 'owner' || member.role === 'owner') && requesterRole !== 'owner') {
        throw new ForbiddenError('Only owners can change owner roles');
      }

      // Cannot demote the last owner
      if (member.role === 'owner' && newRole !== 'owner') {
        const ownerCount = await TeamMember.countDocuments({
          projectId,
          role: 'owner',
          status: 'active',
        });
        if (ownerCount <= 1) {
          throw new ValidationError('Cannot change the last owner\'s role. At least one owner is required.');
        }
      }

      const previousRole = member.role;
      member.role = newRole;
      await member.save();

      createAuditEntry({
        action: 'member.role_changed',
        resourceType: 'member',
        resourceKey: member.email,
        projectId: new Types.ObjectId(projectId),
        author: { userId: req.user!._id, email: req.user!.email },
        previousValue: { role: previousRole },
        currentValue: { role: newRole },
      });

      res.json(member);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:memberId — Remove a member (soft delete)
// ---------------------------------------------------------------------------

router.delete(
  '/:memberId',
  requireProjectRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId;
      const memberId = req.params.memberId;
      const requesterRole = req.user!.projectRole as ProjectRole;

      const member = await TeamMember.findOne({
        _id: memberId,
        projectId,
        status: { $ne: 'deactivated' },
      });

      if (!member) {
        throw new NotFoundError('Member', memberId);
      }

      // Cannot remove yourself
      if (member.userId?.toString() === req.user!._id.toString()) {
        throw new ValidationError('Cannot remove yourself from the project');
      }

      // Admin cannot remove owners
      if (member.role === 'owner' && requesterRole !== 'owner') {
        throw new ForbiddenError('Only owners can remove other owners');
      }

      // Cannot remove the last owner
      if (member.role === 'owner') {
        const ownerCount = await TeamMember.countDocuments({
          projectId,
          role: 'owner',
          status: 'active',
        });
        if (ownerCount <= 1) {
          throw new ValidationError('Cannot remove the last owner');
        }
      }

      member.status = 'deactivated';
      await member.save();

      createAuditEntry({
        action: 'member.removed',
        resourceType: 'member',
        resourceKey: member.email,
        projectId: new Types.ObjectId(projectId),
        author: { userId: req.user!._id, email: req.user!.email },
        previousValue: member.toObject(),
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /:memberId/resend-invite — Resend invitation
// ---------------------------------------------------------------------------

router.post(
  '/:memberId/resend-invite',
  requireProjectRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await TeamMember.findOne({
        _id: req.params.memberId,
        projectId: req.params.projectId,
        status: 'invited',
      });

      if (!member) {
        throw new NotFoundError('Invited member', req.params.memberId);
      }

      // Regenerate invite token
      member.inviteToken = crypto.randomBytes(32).toString('hex');
      member.invitedAt = new Date();
      await member.save();

      // TODO: Resend invitation email

      createAuditEntry({
        action: 'member.invite_resent',
        resourceType: 'member',
        resourceKey: member.email,
        projectId: new Types.ObjectId(req.params.projectId),
        author: { userId: req.user!._id, email: req.user!.email },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
