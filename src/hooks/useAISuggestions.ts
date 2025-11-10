import { useState, useCallback } from 'react';
import { AISuggestion, MeetingProcessData } from '../types';
import { apiClient } from '../lib/api';

export const useAISuggestions = () => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getSuggestions();
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processMeeting = useCallback(async (data: MeetingProcessData) => {
    setIsLoading(true);
    setError(null);
    try {
      const newSuggestions = await apiClient.processMeeting(data);
      setSuggestions(prev => [...prev, ...newSuggestions]);
      return newSuggestions;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process meeting');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveSuggestion = useCallback(async (suggestionId: string, modifications?: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);
    try {
      const task = await apiClient.approveSuggestion(suggestionId, modifications);
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      return task;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve suggestion');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rejectSuggestion = useCallback(async (suggestionId: string, reason: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.rejectSuggestion(suggestionId, reason);
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject suggestion');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    processMeeting,
    approveSuggestion,
    rejectSuggestion,
  };
};