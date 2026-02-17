import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProject,
  updateProject,
  deleteProject,
  getProjectTags,
  deleteProjectTag,
} from '@/api/projects';
import type { UpdateProjectInput } from '@/types/settings';

export function useProjectDetail(projectId: string | null) {
  return useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: UpdateProjectInput }) =>
      updateProject(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-detail'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      confirmName,
    }: {
      projectId: string;
      confirmName: string;
    }) => deleteProject(projectId, confirmName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-detail'] });
    },
  });
}

export function useProjectTags(projectId: string | null) {
  return useQuery({
    queryKey: ['project-tags', projectId],
    queryFn: () => getProjectTags(projectId!),
    enabled: !!projectId,
  });
}

export function useDeleteProjectTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, tag }: { projectId: string; tag: string }) =>
      deleteProjectTag(projectId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tags'] });
    },
  });
}
