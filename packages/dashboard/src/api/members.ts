import { apiFetch } from './client';
import type { TeamMember, InviteMemberInput, MemberRole } from '@/types/settings';

interface ListMembersResponse {
  members: TeamMember[];
  total: number;
  active: number;
  invited: number;
}

interface ListMembersParams {
  status?: string;
  role?: string;
  search?: string;
}

export async function listMembers(
  projectId: string,
  params?: ListMembersParams,
): Promise<ListMembersResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.role) query.set('role', params.role);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  return apiFetch<ListMembersResponse>(
    `/projects/${projectId}/members${qs ? `?${qs}` : ''}`,
  );
}

export async function inviteMember(
  projectId: string,
  input: InviteMemberInput,
): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/projects/${projectId}/members/invite`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function acceptInvite(
  projectId: string,
  inviteToken: string,
): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/projects/${projectId}/members/accept-invite`, {
    method: 'POST',
    body: JSON.stringify({ inviteToken }),
  });
}

export async function changeMemberRole(
  projectId: string,
  memberId: string,
  role: MemberRole,
): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/projects/${projectId}/members/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(projectId: string, memberId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/projects/${projectId}/members/${memberId}`, {
    method: 'DELETE',
  });
}

export async function resendInvite(projectId: string, memberId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(
    `/projects/${projectId}/members/${memberId}/resend-invite`,
    { method: 'POST' },
  );
}
