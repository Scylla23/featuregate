import { apiFetch } from './client';
import type {
  EnvironmentDetail,
  CreateEnvironmentInput,
  UpdateEnvironmentInput,
} from '@/types/settings';

export async function listEnvironments(
  projectId: string,
): Promise<{ environments: EnvironmentDetail[]; total: number }> {
  return apiFetch<{ environments: EnvironmentDetail[]; total: number }>(
    `/projects/${projectId}/environments`,
  );
}

export async function getEnvironment(
  projectId: string,
  envKey: string,
): Promise<EnvironmentDetail> {
  return apiFetch<EnvironmentDetail>(`/projects/${projectId}/environments/${envKey}`);
}

export async function createEnvironment(
  projectId: string,
  input: CreateEnvironmentInput,
): Promise<EnvironmentDetail> {
  return apiFetch<EnvironmentDetail>(`/projects/${projectId}/environments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateEnvironment(
  projectId: string,
  envKey: string,
  input: UpdateEnvironmentInput,
): Promise<EnvironmentDetail> {
  return apiFetch<EnvironmentDetail>(`/projects/${projectId}/environments/${envKey}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteEnvironment(projectId: string, envKey: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/projects/${projectId}/environments/${envKey}`, {
    method: 'DELETE',
  });
}

export async function resetSdkKey(
  projectId: string,
  envKey: string,
): Promise<{ sdkKey: string }> {
  return apiFetch<{ sdkKey: string }>(
    `/projects/${projectId}/environments/${envKey}/reset-sdk-key`,
    { method: 'POST' },
  );
}

export async function resetMobileKey(
  projectId: string,
  envKey: string,
): Promise<{ mobileKey: string }> {
  return apiFetch<{ mobileKey: string }>(
    `/projects/${projectId}/environments/${envKey}/reset-mobile-key`,
    { method: 'POST' },
  );
}

export async function reorderEnvironments(
  projectId: string,
  orderedKeys: string[],
): Promise<{ environments: EnvironmentDetail[] }> {
  return apiFetch<{ environments: EnvironmentDetail[] }>(
    `/projects/${projectId}/environments/reorder`,
    {
      method: 'PATCH',
      body: JSON.stringify({ orderedKeys }),
    },
  );
}
