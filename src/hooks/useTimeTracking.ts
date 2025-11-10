import { useState, useCallback } from 'react';
import { TimeEntry } from '../types';
import { apiClient } from '../lib/api';

export const useTimeTracking = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getTimeEntries();
      setTimeEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch time entries');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startTimer = useCallback(async (taskId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const timeEntry = await apiClient.startTimer(taskId);
      setActiveTimer(timeEntry);
      return timeEntry;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopTimer = useCallback(async (timeEntryId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const timeEntry = await apiClient.stopTimer(timeEntryId);
      setActiveTimer(null);
      setTimeEntries(prev => [...prev, timeEntry]);
      return timeEntry;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getActiveTimer = useCallback(() => {
    return activeTimer;
  }, [activeTimer]);

  return {
    timeEntries,
    activeTimer,
    isLoading,
    error,
    fetchTimeEntries,
    startTimer,
    stopTimer,
    getActiveTimer,
  };
};