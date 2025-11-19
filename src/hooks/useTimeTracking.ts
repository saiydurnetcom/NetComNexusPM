import { useState, useCallback, useEffect } from 'react';
import { TimeEntry } from '../types';
import { timeTrackingService } from '../lib/api-data';

export const useTimeTracking = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active timer on mount and when timeEntries change
  useEffect(() => {
    const fetchActiveTimer = async () => {
      try {
        const timer = await timeTrackingService.getActiveTimer();
        setActiveTimer(timer);
      } catch (err) {
        // Ignore errors for active timer fetch
      }
    };
    fetchActiveTimer();
  }, [timeEntries]);

  const fetchTimeEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await timeTrackingService.getTimeEntries();
      setTimeEntries(data);
      // Also fetch active timer
      const timer = await timeTrackingService.getActiveTimer();
      setActiveTimer(timer);
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
      const timeEntry = await timeTrackingService.startTimer(taskId);
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
      const timeEntry = await timeTrackingService.stopTimer(timeEntryId);
      setActiveTimer(null);
      setTimeEntries(prev => [timeEntry, ...prev]);
      return timeEntry;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTimeEntry = useCallback(async (data: {
    taskId: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    description: string;
    billable?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const timeEntry = await timeTrackingService.createTimeEntry(data);
      setTimeEntries(prev => [timeEntry, ...prev]);
      return timeEntry;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create time entry');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getActiveTimer = useCallback(() => {
    return activeTimer;
  }, [activeTimer]);

  const updateTimeEntry = useCallback(async (
    timeEntryId: string,
    updates: {
      startTime?: string;
      endTime?: string;
      durationMinutes?: number;
      description?: string;
      billable?: boolean;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await timeTrackingService.updateTimeEntry(timeEntryId, updates);
      setTimeEntries(prev => prev.map(entry => entry.id === timeEntryId ? updated : entry));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update time entry');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTimeEntry = useCallback(async (timeEntryId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await timeTrackingService.deleteTimeEntry(timeEntryId);
      setTimeEntries(prev => prev.filter(entry => entry.id !== timeEntryId));
      // If deleted entry was the active timer, clear it
      if (activeTimer?.id === timeEntryId) {
        setActiveTimer(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete time entry');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeTimer]);

  return {
    timeEntries,
    activeTimer,
    isLoading,
    error,
    fetchTimeEntries,
    startTimer,
    stopTimer,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getActiveTimer,
  };
};