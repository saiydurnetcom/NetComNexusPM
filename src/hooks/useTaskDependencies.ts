import { useState, useCallback } from 'react';
import { TaskDependency } from '../types';
import { taskDependenciesService } from '../lib/api-data';

export const useTaskDependencies = () => {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDependencies = useCallback(async (taskId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await taskDependenciesService.getDependencies(taskId);
      setDependencies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dependencies');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createDependency = useCallback(async (data: {
    taskId: string;
    dependsOnTaskId: string;
    dependencyType?: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const newDependency = await taskDependenciesService.createDependency(data);
      setDependencies(prev => [...prev, newDependency]);
      return newDependency;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dependency');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDependency = useCallback(async (dependencyId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await taskDependenciesService.deleteDependency(dependencyId);
      setDependencies(prev => prev.filter(d => d.id !== dependencyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete dependency');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    dependencies,
    isLoading,
    error,
    fetchDependencies,
    createDependency,
    deleteDependency,
  };
};

