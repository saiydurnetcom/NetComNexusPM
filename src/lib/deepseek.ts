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
// VITE_AI_API_URL=https://api.deepseek.com/chat/completions
//
// Note: DeepSeek API endpoint is https://api.deepseek.com/chat/completions (no /v1/)

const AI_API_KEY = import.meta.env.VITE_AI_API_KEY;
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'https://api.deepseek.com/chat/completions';

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
                content: 'You are a helpful assistant that extracts actionable tasks from meeting notes. You must return a valid JSON object with a "suggestions" array. Each suggestion must have: originalText (excerpt from notes), suggestedTask (task title), and confidenceScore (a number between 0 and 1).',
              },
              {
                role: 'user',
                content: `Extract actionable tasks from these meeting notes:\n\n${notes}\n\nReturn a JSON object with a "suggestions" array containing at least 3 task suggestions. Format: {"suggestions": [{"originalText": "...", "suggestedTask": "...", "confidenceScore": 0.8}, ...]}`,
              },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `AI API error: ${response.status} ${response.statusText}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error?.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '{}';
        
        // Parse the JSON response
        let parsedContent: any;
        try {
          parsedContent = JSON.parse(content);
        } catch (parseError) {
          console.error('Failed to parse AI response:', content);
          throw new Error('AI returned invalid JSON. Please try again.');
        }

        // Handle both array and object with array property
        let suggestions: Array<{ originalText: string; suggestedTask: string; confidenceScore: number }>;
        if (Array.isArray(parsedContent)) {
          suggestions = parsedContent;
        } else if (parsedContent.tasks && Array.isArray(parsedContent.tasks)) {
          suggestions = parsedContent.tasks;
        } else if (parsedContent.suggestions && Array.isArray(parsedContent.suggestions)) {
          suggestions = parsedContent.suggestions;
        } else {
          // Try to find any array in the response
          const arrayKey = Object.keys(parsedContent).find(key => Array.isArray(parsedContent[key]));
          if (arrayKey) {
            suggestions = parsedContent[arrayKey];
          } else {
            throw new Error('AI response does not contain a valid suggestions array');
          }
        }

        // Validate suggestions structure
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
          throw new Error('No valid task suggestions found in AI response');
        }

        // Ensure all suggestions have required fields
        suggestions = suggestions.map(s => ({
          originalText: s.originalText || notes.substring(0, 100),
          suggestedTask: s.suggestedTask || 'Review meeting notes',
          confidenceScore: typeof s.confidenceScore === 'number' ? Math.max(0, Math.min(1, s.confidenceScore)) : 0.8,
        }));

        // Return suggestions without IDs - Supabase will generate UUIDs on insert
        return suggestions.map((s) => ({
          originalText: s.originalText,
          suggestedTask: s.suggestedTask,
          confidenceScore: s.confidenceScore,
          status: 'pending' as const,
        }));
      } catch (error) {
        console.error('AI API error:', error);
        // Re-throw the error so the caller can handle it
        throw error;
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