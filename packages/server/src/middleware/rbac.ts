import { Request, Response, NextFunction } from 'express';
import { TeamMember } from '../models/TeamMember.js';
import { ForbiddenError } from '../utils/errors.js';

export type ProjectRole = 'owner' | 'admin' | 'developer' | 'viewer';

const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  owner: 40,
  admin: 30,
  developer: 20,
  viewer: 10,
};

/**
 * Middleware factory that loads the user's project-scoped role from TeamMember
 * and checks that it meets the minimum required level.
 *
 * Expects `req.params.projectId` and `req.user` to be populated
 * (i.e., authenticateDashboard must run first).
 */
export function requireProjectRole(minimumRole: ProjectRole) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!._id;
      const projectId = req.params.projectId;

      if (!projectId) {
        throw new ForbiddenError('Project ID is required');
      }

      // Global admin users bypass project-level checks
      if (req.user!.role === 'admin') {
        req.user!.projectRole = 'owner';
        return next();
      }

      const membership = await TeamMember.findOne({
        projectId,
        userId,
        status: 'active',
      }).lean();

      if (!membership) {
        throw new ForbiddenError('You are not a member of this project');
      }

      const userRole = membership.role as ProjectRole;
      const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
      const requiredLevel = ROLE_HIERARCHY[minimumRole];

      if (userLevel < requiredLevel) {
        throw new ForbiddenError(`Requires ${minimumRole} role or higher`);
      }

      req.user!.projectRole = userRole;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if a role level is at least as high as another role.
 */
export function roleAtLeast(userRole: ProjectRole, minimumRole: ProjectRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minimumRole] ?? 0);
}
