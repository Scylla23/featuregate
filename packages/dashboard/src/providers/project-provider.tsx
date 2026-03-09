import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listProjects, listEnvironments } from '@/api/projects';
import type { Project, Environment } from '@/api/projects';
import { useAuth } from '@/hooks/use-auth';

interface ProjectContextValue {
  projects: Project[];
  environments: Environment[];
  activeProjectId: string | null;
  activeEnvironmentKey: string | null;
  setActiveProjectId: (id: string) => void;
  setActiveEnvironmentKey: (key: string) => void;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [userProjectId, setUserProjectId] = useState<string | null>(
    () => localStorage.getItem('fg_project_id'),
  );
  const [userEnvironmentKey, setUserEnvironmentKey] = useState<string | null>(
    () => localStorage.getItem('fg_env_key'),
  );

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => listProjects(),
    enabled: isAuthenticated,
  });

  const projects = useMemo(() => projectsData?.projects ?? [], [projectsData]);

  // Derive resolved project — auto-select first if user hasn't chosen
  const resolvedProjectId = userProjectId ?? (projects.length > 0 ? projects[0]._id : null);

  // Persist auto-selected project to localStorage (no setState — just side-effect)
  useEffect(() => {
    if (resolvedProjectId && !userProjectId) {
      localStorage.setItem('fg_project_id', resolvedProjectId);
    }
  }, [resolvedProjectId, userProjectId]);

  const { data: envsData, isLoading: envsLoading } = useQuery({
    queryKey: ['environments', resolvedProjectId],
    queryFn: () => listEnvironments(resolvedProjectId!),
    enabled: !!resolvedProjectId,
  });

  const environments = useMemo(() => envsData?.environments ?? [], [envsData]);

  // Derive resolved environment — auto-select first if user hasn't chosen
  const resolvedEnvironmentKey =
    userEnvironmentKey ?? (environments.length > 0 ? environments[0].key : null);

  // Persist auto-selected environment to localStorage (no setState — just side-effect)
  useEffect(() => {
    if (resolvedEnvironmentKey && !userEnvironmentKey) {
      localStorage.setItem('fg_env_key', resolvedEnvironmentKey);
    }
  }, [resolvedEnvironmentKey, userEnvironmentKey]);

  const setActiveProjectId = useCallback((id: string) => {
    setUserProjectId(id);
    localStorage.setItem('fg_project_id', id);
    // Reset environment when project changes
    setUserEnvironmentKey(null);
    localStorage.removeItem('fg_env_key');
  }, []);

  const setActiveEnvironmentKey = useCallback((key: string) => {
    setUserEnvironmentKey(key);
    localStorage.setItem('fg_env_key', key);
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        environments,
        activeProjectId: resolvedProjectId,
        activeEnvironmentKey: resolvedEnvironmentKey,
        setActiveProjectId,
        setActiveEnvironmentKey,
        isLoading: projectsLoading || envsLoading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
