import { useState, useCallback } from 'react';
import { TaskComment } from '../types';
import { taskCommentsService } from '../lib/api-data';

export const useTaskComments = () => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async (taskId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await taskCommentsService.getComments(taskId);
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createComment = useCallback(async (data: {
    taskId: string;
    content: string;
    mentionedUserIds?: string[];
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const newComment = await taskCommentsService.createComment(data);
      setComments(prev => [newComment, ...prev]);
      return newComment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create comment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedComment = await taskCommentsService.updateComment(commentId, content);
      setComments(prev => prev.map(c => c.id === commentId ? updatedComment : c));
      return updatedComment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteComment = useCallback(async (commentId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await taskCommentsService.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    comments,
    isLoading,
    error,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
  };
};

