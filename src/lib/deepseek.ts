import { AISuggestion } from '../types';

// AI Service Configuration
// ⚠️ SECURITY: NEVER hardcode API keys in this file!
// Always use environment variables: VITE_AI_API_KEY and VITE_AI_API_URL
// 
// For local development: Create a .env file (never commit it!)
// For Vercel: Add environment variables in project settings
//
// Example .env file:
// VITE_AI_API_KEY=sk-your-api-key-here
// VITE_AI_API_URL=https://api.deepseek.com/v1/chat/completions

const AI_API_KEY = import.meta.env.VITE_AI_API_KEY;
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'https://api.deepseek.com/v1/chat/completions';

export const deepseekService = {
  async processMeetingNotes(notes: string, projectId?: string): Promise<AISuggestion[]> {
    // If API key is configured, use real API
    if (AI_API_KEY && AI_API_URL) {
      try {
        const response = await fetch(AI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that extracts actionable tasks from meeting notes. Return a JSON array of task suggestions. Each suggestion should have: originalText (excerpt from notes), suggestedTask (task title), and confidenceScore (0-1).',
              },
              {
                role: 'user',
                content: `Extract actionable tasks from these meeting notes:\n\n${notes}\n\nReturn a JSON array with at least 3 task suggestions.`,
              },
            ],
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '[]';
        
        // Parse the JSON response
        let suggestions: Array<{ originalText: string; suggestedTask: string; confidenceScore: number }>;
        try {
          suggestions = JSON.parse(content);
        } catch {
          // Fallback if response is not valid JSON
          suggestions = [
            {
              originalText: notes.substring(0, 100),
              suggestedTask: 'Review meeting notes and create action items',
              confidenceScore: 0.8,
            },
          ];
        }

        return suggestions.map((s, index) => ({
          id: `ai-${Date.now()}-${index}`,
          meetingId: 'temp-meeting-id',
          originalText: s.originalText,
          suggestedTask: s.suggestedTask,
          confidenceScore: s.confidenceScore,
          status: 'pending' as const,
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
          createdAt: new Date().toISOString(),
        }));
      } catch (error) {
        console.error('AI API error:', error);
        // Fall through to mock implementation
      }
    }

    // Mock implementation (used when no API key is configured)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockSuggestions: AISuggestion[] = [
      {
        id: '1',
        meetingId: 'mock-meeting-1',
        originalText: notes.substring(0, 100),
        suggestedTask: 'Create project plan document based on meeting discussion',
        confidenceScore: 0.85,
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        meetingId: 'mock-meeting-1',
        originalText: notes.substring(100, 200),
        suggestedTask: 'Schedule follow-up meeting to review progress',
        confidenceScore: 0.78,
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        meetingId: 'mock-meeting-1',
        originalText: notes.substring(200, 300),
        suggestedTask: 'Send meeting summary email to all participants',
        confidenceScore: 0.92,
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
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