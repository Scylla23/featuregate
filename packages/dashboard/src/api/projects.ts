import { apiFetch } from './client';
import type { ProjectDetail, UpdateProjectInput, ProjectTag } from '@/types/settings';

export interface Project {
  _id: string;
  key: string;
  name: string;
  description?: string;
}

export interface Environment {
  _id: string;
  key: string;
  name: string;
  projectId: string;
  sdkKey: string;
  description?: string;
  color?: string;
  mobileKey?: string;
  clientSideId?: string;
  isCritical?: boolean;
  requireConfirmation?: boolean;
  requireComments?: boolean;
  sortOrder?: number;
}

export async function listProjects(): Promise<{ projects: Project[] }> {
  return apiFetch<{ projects: Project[] }>('/projects');
}

export async function listEnvironments(
  projectId: string,
): Promise<{ environments: Environment[] }> {
  return apiFetch<{ environments: Environment[] }>(`/projects/${projectId}/environments`);
}

export async function getProject(projectId: string): Promise<ProjectDetail> {
  return apiFetch<ProjectDetail>(`/projects/${projectId}`);
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectDetail> {
  return apiFetch<ProjectDetail>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteProject(
  projectId: string,
  confirmName: string,
): Promise<void> {
  await apiFetch<{ success: boolean }>(`/projects/${projectId}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirmName }),
  });
}

export async function getProjectTags(
  projectId: string,
): Promise<{ tags: ProjectTag[] }> {
  return apiFetch<{ tags: ProjectTag[] }>(`/projects/${projectId}/tags`);
}

export async function deleteProjectTag(
  projectId: string,
  tag: string,
): Promise<{ success: boolean; removedFrom: { flags: number; segments: number } }> {
  return apiFetch(`/projects/${projectId}/tags/${encodeURIComponent(tag)}`, {
    method: 'DELETE',
  });
}
