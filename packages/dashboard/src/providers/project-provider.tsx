import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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

  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    () => localStorage.getItem('fg_project_id'),
  );
  const [activeEnvironmentKey, setActiveEnvironmentKeyState] = useState<string | null>(
    () => localStorage.getItem('fg_env_key'),
  );

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => listProjects(),
    enabled: isAuthenticated,
  });

  const projects = projectsData?.projects ?? [];

  // Auto-select first project if none selected
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      setActiveProjectIdState(projects[0]._id);
      localStorage.setItem('fg_project_id', projects[0]._id);
    }
  }, [projects, activeProjectId]);

  const { data: envsData, isLoading: envsLoading } = useQuery({
    queryKey: ['environments', activeProjectId],
    queryFn: () => listEnvironments(activeProjectId!),
    enabled: !!activeProjectId,
  });

  const environments = envsData?.environments ?? [];

  // Auto-select first environment if none selected
  useEffect(() => {
    if (environments.length > 0 && !activeEnvironmentKey) {
      setActiveEnvironmentKeyState(environments[0].key);
      localStorage.setItem('fg_env_key', environments[0].key);
    }
  }, [environments, activeEnvironmentKey]);

  const setActiveProjectId = useCallback((id: string) => {
    setActiveProjectIdState(id);
    localStorage.setItem('fg_project_id', id);
    // Reset environment when project changes
    setActiveEnvironmentKeyState(null);
    localStorage.removeItem('fg_env_key');
  }, []);

  const setActiveEnvironmentKey = useCallback((key: string) => {
    setActiveEnvironmentKeyState(key);
    localStorage.setItem('fg_env_key', key);
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        environments,
        activeProjectId,
        activeEnvironmentKey,
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
