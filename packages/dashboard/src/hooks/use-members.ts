import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMembers,
  inviteMember,
  changeMemberRole,
  removeMember,
  resendInvite,
} from '@/api/members';
import type { InviteMemberInput, MemberRole } from '@/types/settings';

export function useMembers(projectId: string | null, params?: { status?: string; role?: string; search?: string }) {
  return useQuery({
    queryKey: ['members', projectId, params],
    queryFn: () => listMembers(projectId!, params),
    enabled: !!projectId,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: InviteMemberInput }) =>
      inviteMember(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useChangeMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      memberId,
      role,
    }: {
      projectId: string;
      memberId: string;
      role: MemberRole;
    }) => changeMemberRole(projectId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, memberId }: { projectId: string; memberId: string }) =>
      removeMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, memberId }: { projectId: string; memberId: string }) =>
      resendInvite(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
