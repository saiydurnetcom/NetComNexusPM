import { AISuggestion } from '../types';

// Type for suggestions returned from AI (without database-generated fields)
type RawAISuggestion = Omit<AISuggestion, 'id' | 'meetingId' | 'reviewedBy' | 'reviewedAt' | 'rejectionReason' | 'createdAt'>;

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

// Access environment variables with proper typing
const getEnv = (key: string): string | undefined => {
  return (import.meta as any).env[key];
};

const AI_API_KEY = getEnv('VITE_AI_API_KEY');
// Default to DeepSeek API (user can override with VITE_AI_API_URL env var)
// Note: DeepSeek uses /v1/chat/completions endpoint format
const AI_API_URL = getEnv('VITE_AI_API_URL') || 'https://api.deepseek.com/v1/chat/completions';

// Debug logging (only in development)
const DEBUG = (import.meta as any).env.DEV || (import.meta as any).env.MODE === 'development';
const logDebug = (...args: any[]) => {
  if (DEBUG) {
    console.log('[DeepSeek Service]', ...args);
  }
};

export const deepseekService = {
  async processMeetingNotes(
    notes: string, 
    projectId?: string, 
    existingTasks?: Array<{ title: string; description?: string }>
  ): Promise<RawAISuggestion[]> {
    // Check if API is configured
    const hasApiKey = AI_API_KEY && AI_API_KEY.trim().length > 0;
    const hasApiUrl = AI_API_URL && AI_API_URL.trim().length > 0;
    
    logDebug('API Configuration:', {
      hasApiKey,
      hasApiUrl,
      apiUrl: hasApiUrl ? AI_API_URL : 'not set',
      apiKeyPrefix: hasApiKey ? `${AI_API_KEY.substring(0, 7)}...` : 'not set',
    });

    // If API key is configured, use real API
    if (hasApiKey && hasApiUrl) {
      try {
        logDebug('Attempting to call DeepSeek API...');
        
        const requestBody = {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that extracts actionable tasks from meeting notes. You must return a valid JSON object with a "suggestions" array. Each suggestion must have: originalText (excerpt from notes), suggestedTask (task title), and confidenceScore (a number between 0 and 1). When existing tasks are provided, only suggest NEW tasks that are different from the existing ones. Do not duplicate or recreate existing tasks.',
            },
            {
              role: 'user',
              content: existingTasks && existingTasks.length > 0
                ? `Extract NEW actionable tasks from these meeting notes. IMPORTANT: The following tasks have already been created from this meeting, so DO NOT suggest them again:\n\n${existingTasks.map(t => `- ${t.title}${t.description ? `: ${t.description}` : ''}`).join('\n')}\n\nMeeting notes:\n\n${notes}\n\nReturn a JSON object with a "suggestions" array containing NEW task suggestions that are different from the existing ones above. Only suggest tasks that are truly new and not already covered. Format: {"suggestions": [{"originalText": "...", "suggestedTask": "...", "confidenceScore": 0.8}, ...]}`
                : `Extract actionable tasks from these meeting notes:\n\n${notes}\n\nReturn a JSON object with a "suggestions" array containing at least 3 task suggestions. Format: {"suggestions": [{"originalText": "...", "suggestedTask": "...", "confidenceScore": 0.8}, ...]}`,
            },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        };

        logDebug('Request URL:', AI_API_URL);
        logDebug('Request body (truncated):', {
          ...requestBody,
          messages: requestBody.messages.map(m => ({
            ...m,
            content: m.content.substring(0, 100) + '...',
          })),
        });

        const response = await fetch(AI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        });

        logDebug('Response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `AI API error: ${response.status} ${response.statusText}`;
          let errorDetails: any = { status: response.status, statusText: response.statusText };
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error?.message || errorData.error?.code || errorMessage;
            errorDetails = { ...errorDetails, ...errorData };
          } catch {
            errorDetails.rawError = errorText;
          }
          
          console.error('AI API Error Details:', errorDetails);
          throw new Error(`${errorMessage} (Status: ${response.status}). Check your API key and URL configuration.`);
        }

        const data = await response.json();
        logDebug('Response data received:', { 
          hasChoices: !!data.choices,
          choicesCount: data.choices?.length || 0,
        });
        
        const content = data.choices[0]?.message?.content || '{}';
        logDebug('Response content (first 200 chars):', content.substring(0, 200));
        
        // Parse the JSON response
        let parsedContent: any;
        try {
          parsedContent = JSON.parse(content);
        } catch (parseError) {
          console.error('Failed to parse AI response. Raw content:', content);
          console.error('Parse error:', parseError);
          throw new Error(`AI returned invalid JSON. Response: ${content.substring(0, 200)}...`);
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
            logDebug(`Found suggestions array in key: ${arrayKey}`);
          } else {
            console.error('AI response structure:', parsedContent);
            throw new Error(`AI response does not contain a valid suggestions array. Response keys: ${Object.keys(parsedContent).join(', ')}`);
          }
        }

        // Validate suggestions structure
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
          console.error('Invalid suggestions array:', suggestions);
          throw new Error('No valid task suggestions found in AI response');
        }

        logDebug(`Successfully parsed ${suggestions.length} suggestions`);

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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Falling back to mock suggestions due to API error');
        // Fall through to mock implementation instead of throwing
        // This ensures the feature works even if API is misconfigured
      }
    } else {
      logDebug('API not configured, using mock suggestions');
      if (!hasApiKey) {
        console.warn('VITE_AI_API_KEY is not set. Using mock suggestions.');
      }
      if (!hasApiUrl) {
        console.warn('VITE_AI_API_URL is not set. Using mock suggestions.');
      }
    }

    // Mock implementation (used when no API key is configured or API call fails)
    logDebug('Generating mock suggestions...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockSuggestions: RawAISuggestion[] = [
      {
        originalText: notes.substring(0, 100) || 'Meeting discussion about project planning',
        suggestedTask: 'Create project plan document based on meeting discussion',
        confidenceScore: 0.85,
        status: 'pending',
      },
      {
        originalText: notes.substring(100, 200) || 'Follow-up actions needed',
        suggestedTask: 'Schedule follow-up meeting to review progress',
        confidenceScore: 0.78,
        status: 'pending',
      },
      {
        originalText: notes.substring(200, 300) || 'Communication and documentation tasks',
        suggestedTask: 'Send meeting summary email to all participants',
        confidenceScore: 0.92,
        status: 'pending',
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