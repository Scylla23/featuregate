import { apiFetch } from './client';

export interface Project {
  _id: string;
  key: string;
  name: string;
}

export interface Environment {
  _id: string;
  key: string;
  name: string;
  projectId: string;
  sdkKey: string;
}

export async function listProjects(): Promise<{ projects: Project[] }> {
  return apiFetch<{ projects: Project[] }>('/projects');
}

export async function listEnvironments(
  projectId: string,
): Promise<{ environments: Environment[] }> {
  return apiFetch<{ environments: Environment[] }>(`/projects/${projectId}/environments`);
}
