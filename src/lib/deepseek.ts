import { AISuggestion } from '../types';

// Mock implementation for Deepseek API integration
// In a real implementation, this would make actual API calls to Deepseek

export const deepseekService = {
  async processMeetingNotes(notes: string, projectId?: string): Promise<AISuggestion[]> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock response - in a real implementation, this would be the actual API response
    const mockSuggestions: AISuggestion[] = [
      {
        id: '1',
        type: 'task',
        content: 'Create project plan document',
        description: 'Based on the meeting discussion, create a comprehensive project plan document outlining milestones, timelines, and resource allocation.',
        priority: 'high',
        estimatedHours: 4,
        projectId: projectId || null,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'task',
        content: 'Schedule follow-up meeting',
        description: 'Schedule a follow-up meeting to review progress and address any outstanding questions from the current discussion.',
        priority: 'medium',
        estimatedHours: 1,
        projectId: projectId || null,
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        type: 'action',
        content: 'Send meeting summary email',
        description: 'Send a summary email to all participants with key decisions, action items, and next steps.',
        priority: 'high',
        estimatedHours: 0.5,
        projectId: projectId || null,
        createdAt: new Date().toISOString(),
      }
    ];

    return mockSuggestions;
  },

  async refineTaskDescription(description: string): Promise<string> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock refinement - in a real implementation, this would use AI to improve the description
    return description + ' This task requires careful attention to detail and should be completed with high priority.';
  }
};