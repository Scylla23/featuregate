// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export interface EnvironmentDetail {
  _id: string;
  key: string;
  name: string;
  description: string;
  color: string;
  projectId: string;
  sdkKey: string;
  mobileKey: string | null;
  clientSideId: string | null;
  isCritical: boolean;
  requireConfirmation: boolean;
  requireComments: boolean;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnvironmentInput {
  key?: string;
  name: string;
  description?: string;
  color?: string;
  isCritical?: boolean;
  requireConfirmation?: boolean;
  requireComments?: boolean;
}

export interface UpdateEnvironmentInput {
  name?: string;
  description?: string;
  color?: string;
  isCritical?: boolean;
  requireConfirmation?: boolean;
  requireComments?: boolean;
}

// ---------------------------------------------------------------------------
// Team Member
// ---------------------------------------------------------------------------

export type MemberRole = 'owner' | 'admin' | 'developer' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'deactivated';

export interface TeamMember {
  _id: string;
  projectId: string;
  userId: string | null;
  email: string;
  name: string;
  role: MemberRole;
  status: MemberStatus;
  invitedBy: string | null;
  invitedAt: string | null;
  joinedAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InviteMemberInput {
  email: string;
  role: MemberRole;
  name?: string;
}

// ---------------------------------------------------------------------------
// API Key
// ---------------------------------------------------------------------------

export type ApiKeyType = 'server' | 'client' | 'mobile';
export type ApiKeyStatus = 'active' | 'revoked';

export interface ApiKeyItem {
  _id: string;
  projectId: string;
  environmentId: string;
  name: string;
  keyType: ApiKeyType;
  keyPrefix: string;
  description: string;
  status: ApiKeyStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyInput {
  name: string;
  keyType: ApiKeyType;
  environmentId: string;
  description?: string;
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKeyItem;
  fullKey: string;
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface ProjectDetail {
  _id: string;
  key: string;
  name: string;
  description: string;
  defaultEnvironmentId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: {
    flagCount: number;
    segmentCount: number;
    environmentCount: number;
    memberCount: number;
  };
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  defaultEnvironmentId?: string | null;
}

export interface ProjectTag {
  name: string;
  flagCount: number;
  segmentCount: number;
}
