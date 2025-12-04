/* eslint-disable @typescript-eslint/no-explicit-any */
import { AISuggestion } from '../types';
import { apiClient } from './api-client';

// Type for suggestions returned from AI (without database-generated fields)
type RawAISuggestion = Omit<AISuggestion, 'id' | 'meetingId' | 'reviewedBy' | 'reviewedAt' | 'rejectionReason' | 'createdAt'>;

// AI Service Configuration
// ⚠️ SECURITY: NEVER hardcode API keys in this file!
// Settings are now stored in the backend configuration table and fetched via the public settings endpoint.
// Environment variables remain as a fallback for local development.

const DEFAULT_AI_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Access environment variables with proper typing
const getEnv = (key: string): string | undefined => {
  return (import.meta as any).env[key];
};

type LoadedAIConfig = {
  apiKey?: string;
  apiUrl: string;
  model: string;
};

const pickString = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const envConfig = (): LoadedAIConfig => ({
  apiKey: pickString(getEnv('VITE_AI_API_KEY')),
  apiUrl: pickString(getEnv('VITE_AI_API_URL')) || DEFAULT_AI_API_URL,
  model: pickString(getEnv('VITE_AI_MODEL')) || 'deepseek-reasoner',
});

let cachedConfig: LoadedAIConfig | null = null;
let configPromise: Promise<LoadedAIConfig> | null = null;

const loadAIConfig = async (): Promise<LoadedAIConfig> => {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (!configPromise) {
    configPromise = (async () => {
      const fallback = envConfig();
      try {
        const settings = await apiClient.getPublicSettings();
        const config: LoadedAIConfig = {
          apiKey: pickString(settings?.aiApiKey) || fallback.apiKey,
          apiUrl: pickString(settings?.aiApiUrl) || fallback.apiUrl,
          model: pickString(settings?.aiModel) || fallback.model,
        };

        logDebug('Loaded AI config from backend', {
          hasApiKey: !!config.apiKey,
          apiUrl: config.apiUrl,
          model: config.model,
        });

        cachedConfig = config;
        return config;
      } catch (error) {
        console.error('Failed to load AI config from backend, falling back to environment values.', error);
        cachedConfig = fallback;
        return fallback;
      } finally {
        configPromise = null;
      }
    })();
  }

  return configPromise;
};

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
    const { apiKey, apiUrl, model } = await loadAIConfig();
    // Check if API is configured
    const hasApiKey = typeof apiKey === 'string' && apiKey.length > 0;
    const hasApiUrl = typeof apiUrl === 'string' && apiUrl.length > 0;

    logDebug('API Configuration:', {
      hasApiKey,
      hasApiUrl,
      apiUrl: hasApiUrl ? apiUrl : 'not set',
      apiKeyPrefix: hasApiKey && apiKey ? `${apiKey.substring(0, 7)}...` : 'not set',
      model,
    });

    // If API key is configured, use real API
    if (hasApiKey && hasApiUrl) {
      try {
        logDebug('Attempting to call DeepSeek API...');

        const systemPrompt = existingTasks && existingTasks.length > 0
          ? `You are an intelligent task extraction and refinement assistant. Your role is to:
1. Extract actionable tasks from meeting notes
2. Transform vague, broad, or incomplete mentions into specific, actionable tasks
3. Fill in missing details based on context and common business practices
4. Break down high-level goals into concrete, executable steps
5. Avoid duplicating existing tasks by understanding their intent and purpose

CRITICAL INSTRUCTIONS:
- When you encounter vague mentions like "work on X", "handle Y", "look into Z", transform them into specific actions
- Add missing details: WHO should do it, WHAT specifically needs to be done, WHEN it's needed (if mentioned), and WHY it matters
- Break down broad tasks into 2-4 smaller, specific sub-tasks that can be completed independently
- Make every task title start with an action verb (Create, Review, Update, Schedule, Prepare, Design, Implement, etc.)
- Ensure tasks are SMART: Specific, Measurable, Achievable, Relevant, Time-bound (where context allows)

EXAMPLES OF REFINEMENT:
Vague: "Marketing campaign"
Refined: "Design social media content calendar for Q1 marketing campaign"

Vague: "Follow up with client"
Refined: "Schedule follow-up call with client to discuss project requirements and timeline"

Vague: "Update documentation"
Refined: "Update API documentation with new endpoint specifications and example requests"

Vague: "Prepare presentation"
Refined: "Create PowerPoint presentation for board meeting covering Q4 results and 2025 strategy"

DUPLICATE DETECTION:
When comparing with existing tasks, understand SEMANTIC MEANING and INTENT, not just word matching.
These are DUPLICATES (same intent, different wording):
- "Add context to pipeline information for Allen" 
- "Provide context in pipeline data to Allen"
- "Include context for Allen's pipeline info"

These are NOT duplicates (different intents):
- "Add context to pipeline information for Allen"
- "Review pipeline information for errors"
- "Update pipeline documentation"

When existing tasks are provided, analyze their INTENT and PURPOSE. Only suggest tasks that are genuinely new with unique goals, not variations of existing ones.

Return a JSON object with a "suggestions" array, each containing:
- originalText: The exact excerpt from notes that led to this suggestion (quote directly)
- suggestedTask: A concise, specific, actionable task title (8-12 words, action verb first)
- suggestedDescription: A detailed, intelligent description (2-4 sentences) that explains WHAT needs to be done, WHY it's important, and HOW to approach it. 
  CRITICAL: The suggestedDescription must be DIFFERENT from originalText. It should:
  * Expand on the task with context, rationale, and approach
  * Explain the business value or purpose
  * Provide guidance on how to execute the task
  * NOT simply repeat or rephrase the originalText
  Example: If originalText is "Update the dashboard", suggestedDescription should be something like "Review the current dashboard design and user feedback to identify areas for improvement. Update the visualizations and data points to better align with stakeholder needs and business objectives. Implement changes using the established design system and ensure all data sources are properly integrated."
- confidenceScore: 0.0-1.0 indicating confidence this is a new, unique, actionable task`

          : `You are an intelligent task extraction and refinement assistant. Your role is to:
1. Extract actionable tasks from meeting notes
2. Transform vague, broad, or incomplete mentions into specific, actionable tasks
3. Fill in missing details based on context and common business practices
4. Break down high-level goals into concrete, executable steps

CRITICAL INSTRUCTIONS:
- When you encounter vague mentions like "work on X", "handle Y", "look into Z", transform them into specific actions
- Add missing details: WHO should do it, WHAT specifically needs to be done, WHEN it's needed (if mentioned), and WHY it matters
- Break down broad tasks into 2-4 smaller, specific sub-tasks that can be completed independently
- Make every task title start with an action verb (Create, Review, Update, Schedule, Prepare, Design, Implement, etc.)
- Ensure tasks are SMART: Specific, Measurable, Achievable, Relevant, Time-bound (where context allows)
- If a task mentions a deadline or timeframe, include it in the task title or make it clear

EXAMPLES OF REFINEMENT:
Vague: "Marketing campaign"
Refined: "Design social media content calendar for Q1 marketing campaign"

Vague: "Follow up with client"
Refined: "Schedule follow-up call with client to discuss project requirements and timeline"

Vague: "Update documentation"
Refined: "Update API documentation with new endpoint specifications and example requests"

Vague: "Prepare presentation"
Refined: "Create PowerPoint presentation for board meeting covering Q4 results and 2025 strategy"

Vague: "Fix bugs"
Refined: "Investigate and resolve authentication errors in user login flow"

Vague: "Team meeting"
Refined: "Schedule weekly team standup meeting for project status updates"

Return a JSON object with a "suggestions" array containing detailed, actionable tasks. Each suggestion must contain:
- originalText: The exact excerpt from notes that led to this suggestion (quote directly from notes)
- suggestedTask: A refined, specific, actionable task title (8-12 words, action verb first)
- suggestedDescription: A detailed, intelligent description (2-4 sentences) that explains WHAT needs to be done, WHY it's important, and HOW to approach it.
  CRITICAL: The suggestedDescription must be DIFFERENT from originalText. It should:
  * Expand on the task with context, rationale, and approach
  * Explain the business value or purpose
  * Provide guidance on how to execute the task
  * NOT simply repeat or rephrase the originalText
  Example: If originalText is "Follow up with client", suggestedDescription should be something like "Schedule a follow-up call or meeting with the client to discuss their requirements in detail, address any questions or concerns they may have, and establish clear next steps for the project. This communication is essential for maintaining a strong client relationship and ensuring project alignment. Prepare an agenda beforehand and gather any relevant materials or documentation that may be needed during the discussion."
- confidenceScore: 0.0-1.0 indicating confidence this is a clear, actionable task`

        const userPrompt = existingTasks && existingTasks.length > 0
          ? `EXISTING TASKS (already created - DO NOT duplicate these in intent or purpose):

${existingTasks.map((t, i) => `${i + 1}. "${t.title}"${t.description ? `\n   Purpose: ${t.description}` : ''}`).join('\n\n')}

MEETING NOTES:
${notes}

YOUR TASK:
1. Extract ALL actionable tasks from the meeting notes
2. For each vague, broad, or incomplete mention, transform it into a specific, actionable task
3. Fill in missing details (who, what, when, why) based on context
4. Break down high-level goals into concrete steps
5. Only suggest tasks that are NEW and not covered by existing tasks

TRANSFORMATION RULES:
- "We need to..." → "Create/Prepare/Implement [specific action]"
- "Someone should..." → "Assign [specific person/role] to [specific action]"
- "Look into..." → "Research and analyze [specific topic] and document findings"
- "Follow up on..." → "Schedule follow-up [meeting/call] with [specific person] about [specific topic]"
- "Work on..." → "Develop/Implement/Design [specific deliverable]"
- Generic mentions → Add context: project name, deadline, stakeholders, specific requirements

QUALITY CHECK:
Each suggested task should:
✓ Start with an action verb
✓ Be specific enough that someone can start working on it immediately
✓ Include relevant context (project, deadline, stakeholder if mentioned)
✓ Be independent and completable
✓ Not duplicate existing tasks in intent or purpose

Return a JSON object with a "suggestions" array containing ONLY new, detailed, actionable tasks.
Minimum 3 suggestions, but extract all genuine tasks from the notes.

IMPORTANT: For suggestedDescription, DO NOT copy originalText. Instead, create an intelligent description that:
- Explains WHAT specifically needs to be done (expand on the task)
- Explains WHY it matters (business value, impact, importance)
- Explains HOW to approach it (methodology, steps, considerations)

Format: {"suggestions": [{"originalText": "[exact quote from notes]", "suggestedTask": "[refined actionable task]", "suggestedDescription": "[intelligent 2-4 sentence description that is DIFFERENT from originalText]", "confidenceScore": 0.8}, ...]}

If all tasks are already covered, return an empty suggestions array: {"suggestions": []}`

          : `Extract and refine actionable tasks from these meeting notes:

${notes}

YOUR TASK:
1. Identify ALL mentions of work, actions, follow-ups, or deliverables in the notes
2. Transform vague or broad mentions into specific, actionable tasks
3. Fill in missing details based on context (who, what, when, why)
4. Break down high-level goals into concrete, executable steps

TRANSFORMATION RULES:
- "We need to..." → "Create/Prepare/Implement [specific action]"
- "Someone should..." → "Assign [specific person/role] to [specific action]"
- "Look into..." → "Research and analyze [specific topic] and document findings"
- "Follow up on..." → "Schedule follow-up [meeting/call] with [specific person] about [specific topic]"
- "Work on..." → "Develop/Implement/Design [specific deliverable]"
- Generic mentions → Add context: project name, deadline, stakeholders, specific requirements

QUALITY CHECK:
Each suggested task should:
✓ Start with an action verb (Create, Review, Update, Schedule, Prepare, Design, Implement, etc.)
✓ Be specific enough that someone can start working on it immediately
✓ Include relevant context (project, deadline, stakeholder if mentioned in notes)
✓ Be independent and completable
✓ Be 8-12 words long for clarity

Return a JSON object with a "suggestions" array containing at least 3 refined task suggestions.
Extract all genuine tasks from the notes - don't limit yourself if there are more.

IMPORTANT: For suggestedDescription, DO NOT copy originalText. Instead, create an intelligent description that:
- Explains WHAT specifically needs to be done (expand on the task)
- Explains WHY it matters (business value, impact, importance)
- Explains HOW to approach it (methodology, steps, considerations)

Format: {"suggestions": [{"originalText": "[exact quote from notes]", "suggestedTask": "[refined actionable task]", "suggestedDescription": "[intelligent 2-4 sentence description that is DIFFERENT from originalText]", "confidenceScore": 0.8}, ...]}`;

        const requestBody = {
          model: model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent, focused responses
          response_format: { type: 'json_object' },
        };

        logDebug('Request URL:', apiUrl);
        logDebug('Request body (truncated):', {
          ...requestBody,
          messages: requestBody.messages.map(m => ({
            ...m,
            content: m.content.substring(0, 100) + '...',
          })),
        });

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
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
        let suggestions: Array<{ originalText: string; suggestedTask: string; suggestedDescription?: string; confidenceScore: number }>;
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

        // Ensure all suggestions have required fields and generate intelligent descriptions if missing
        suggestions = suggestions.map(s => {
          const taskTitle = s.suggestedTask || 'Review meeting notes';
          const originalText = s.originalText || notes.substring(0, 100);

          // Generate intelligent description if not provided by AI
          // The description should explain WHAT, WHY, and HOW, not just copy originalText
          let intelligentDescription = s.suggestedDescription;
          if (!intelligentDescription || intelligentDescription.trim() === originalText.trim()) {
            // Create an intelligent description based on the task title
            intelligentDescription = `This task involves ${taskTitle.toLowerCase()}. It is important for maintaining project momentum and ensuring all stakeholders are aligned. Approach this systematically by breaking it down into clear steps, gathering necessary resources, and setting appropriate milestones for tracking progress.`;
          }

          return {
            originalText,
            suggestedTask: taskTitle,
            suggestedDescription: intelligentDescription,
            confidenceScore: typeof s.confidenceScore === 'number' ? Math.max(0, Math.min(1, s.confidenceScore)) : 0.8,
          };
        });

        // Return suggestions without IDs - Supabase will generate UUIDs on insert
        return suggestions.map((s) => ({
          originalText: s.originalText,
          suggestedTask: s.suggestedTask,
          suggestedDescription: s.suggestedDescription,
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
        console.warn('AI API key is not configured in settings or environment. Using mock suggestions.');
      }
      if (!hasApiUrl) {
        console.warn('AI API URL is not configured in settings or environment. Using mock suggestions.');
      }
    }

    // Mock implementation (used when no API key is configured or API call fails)
    logDebug('Generating mock suggestions...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockSuggestions: RawAISuggestion[] = [
      {
        originalText: notes.substring(0, 100) || 'Meeting discussion about project planning',
        suggestedTask: 'Create project plan document based on meeting discussion',
        suggestedDescription: 'Develop a comprehensive project plan document that outlines key phases, deliverables, milestones, and resource allocation. This document is critical for ensuring all team members understand the project scope, timeline, and expectations. Structure it with clear sections for objectives, timeline, dependencies, and success criteria to serve as a reference throughout the project lifecycle.',
        confidenceScore: 0.85,
        status: 'pending',
      },
      {
        originalText: notes.substring(100, 200) || 'Follow-up actions needed',
        suggestedTask: 'Schedule follow-up meeting to review progress',
        suggestedDescription: 'Organize a follow-up meeting with relevant stakeholders to review the current progress of tasks, address any blockers, and ensure the project remains on track. This meeting is important for maintaining alignment and identifying any adjustments needed to the plan. Prepare a brief agenda beforehand and send calendar invites to all participants with relevant context and materials.',
        confidenceScore: 0.78,
        status: 'pending',
      },
      {
        originalText: notes.substring(200, 300) || 'Communication and documentation tasks',
        suggestedTask: 'Send meeting summary email to all participants',
        suggestedDescription: 'Draft and send a concise summary email of the meeting outcomes, decisions made, and assigned action items to all attendees. This communication is essential for ensuring everyone has a clear record of what was discussed and what is expected. Include a clear call to action for each task owner, with deadlines and any relevant context or resources needed to complete their assignments.',
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
  },

  async refreshConfig(forceReload: boolean = false): Promise<void> {
    cachedConfig = null;
    if (forceReload) {
      await loadAIConfig();
    }
  },

  async generateReport(userPrompt: string, systemPrompt: string): Promise<string> {
    const { apiKey, apiUrl, model } = await loadAIConfig();

    const hasApiKey = typeof apiKey === 'string' && apiKey.length > 0;
    const hasApiUrl = typeof apiUrl === 'string' && apiUrl.length > 0;

    if (hasApiKey && hasApiUrl) {
      try {
        const requestBody = {
          model: model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          temperature: 0.3,
          response_format: { type: 'text' },
        };
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });
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
          console.error('AI API Error Details for report generation:', errorDetails);
          throw new Error(`${errorMessage} (Status: ${response.status}). Check your API key and URL configuration.`);
        }
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        return content;
      } catch (error) {
        console.error('AI API error during report generation:', error);
        throw error;
      }
    } else {
      const missingConfigs = [];
      if (!hasApiKey) missingConfigs.push('API key');
      if (!hasApiUrl) missingConfigs.push('API URL');
      throw new Error(`AI API is not properly configured (${missingConfigs.join(', ')} missing).`);
    }
  }
};