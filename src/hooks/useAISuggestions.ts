import { useState, useCallback } from 'react';
import { AISuggestion, MeetingProcessData, TaskCreateData } from '../types';
import { aiSuggestionsService } from '../lib/api-data';

export const useAISuggestions = () => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await aiSuggestionsService.getSuggestions();
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
      const newSuggestions = await aiSuggestionsService.processMeeting(data);
      // Replace suggestions with new ones (only show suggestions for the current meeting being processed)
      setSuggestions(newSuggestions);
      return newSuggestions;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process meeting');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveSuggestion = useCallback(async (suggestionId: string, modifications?: Partial<TaskCreateData>) => {
    setIsLoading(true);
    setError(null);
    try {
      const task = await aiSuggestionsService.approveSuggestion(suggestionId, modifications);
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
      await aiSuggestionsService.rejectSuggestion(suggestionId, reason);
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject suggestion');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reprocessMeeting = useCallback(async (meetingId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const newSuggestions = await aiSuggestionsService.reprocessMeeting(meetingId);
      setSuggestions(prev => [...prev, ...newSuggestions]);
      return newSuggestions;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reprocess meeting');
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
    reprocessMeeting,
  };
};