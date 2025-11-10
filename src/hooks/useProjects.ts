import { useState, useCallback } from 'react';
import { Project, ProjectCreateData } from '../types';
import { apiClient } from '../lib/api';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (data: ProjectCreateData) => {
    setIsLoading(true);
    setError(null);
    try {
      const newProject = await apiClient.createProject(data);
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getProject = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiClient.getProject(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    createProject,
    getProject,
  };
};