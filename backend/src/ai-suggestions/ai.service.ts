import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface AISuggestion {
  originalText: string;
  suggestedTask: string;
  suggestedDescription?: string;
  confidenceScore: number;
  status?: 'pending' | 'approved' | 'rejected';
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async processMeetingNotes(
    notes: string,
    projectId?: string,
    existingTasks?: Array<{ title: string; description?: string }>,
  ): Promise<AISuggestion[]> {
    // Get AI configuration from settings table or environment
    const settings = await this.prisma.setting.findUnique({
      where: { id: 'default' },
    });

    const aiApiKey = settings?.aiApiKey || this.configService.get<string>('AI_API_KEY');
    const aiApiUrl = settings?.aiApiUrl || this.configService.get<string>('AI_API_URL') || 'https://api.deepseek.com/v1/chat/completions';
    const aiModel = settings?.aiModel || this.configService.get<string>('AI_MODEL') || 'deepseek-reasoner';

    if (!aiApiKey || !aiApiUrl) {
      this.logger.warn('AI API not configured, returning mock suggestions');
      return this.getMockSuggestions(notes);
    }

    try {
      const systemPrompt = existingTasks && existingTasks.length > 0
        ? this.getSystemPromptWithExistingTasks()
        : this.getSystemPrompt();

      const userPrompt = existingTasks && existingTasks.length > 0
        ? this.getUserPromptWithExistingTasks(notes, existingTasks)
        : this.getUserPrompt(notes);

      const response = await fetch(aiApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`AI API error: ${response.status} ${errorText}`);
        return this.getMockSuggestions(notes);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      const parsedContent = JSON.parse(content);

      let suggestions: AISuggestion[] = [];
      if (Array.isArray(parsedContent)) {
        suggestions = parsedContent;
      } else if (parsedContent.suggestions && Array.isArray(parsedContent.suggestions)) {
        suggestions = parsedContent.suggestions;
      } else if (parsedContent.tasks && Array.isArray(parsedContent.tasks)) {
        suggestions = parsedContent.tasks;
      }

      // Validate and normalize suggestions
      return suggestions.map(s => ({
        originalText: s.originalText || notes.substring(0, 100),
        suggestedTask: s.suggestedTask || 'Review meeting notes',
        suggestedDescription: s.suggestedDescription,
        confidenceScore: typeof s.confidenceScore === 'number' ? Math.max(0, Math.min(1, s.confidenceScore)) : 0.8,
        status: 'pending' as const,
      }));
    } catch (error) {
      this.logger.error('AI processing error:', error);
      return this.getMockSuggestions(notes);
    }
  }

  private getSystemPrompt(): string {
    return `You are an intelligent task extraction and refinement assistant. Your role is to:
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

Return a JSON object with a "suggestions" array, each containing:
- originalText: The exact excerpt from notes that led to this suggestion (quote directly)
- suggestedTask: A concise, specific, actionable task title (8-12 words, action verb first)
- suggestedDescription: A detailed, intelligent description (2-4 sentences) that explains WHAT needs to be done, WHY it's important, and HOW to approach it.
- confidenceScore: 0.0-1.0 indicating confidence this is a clear, actionable task`;
  }

  private getSystemPromptWithExistingTasks(): string {
    return this.getSystemPrompt() + `

DUPLICATE DETECTION:
When comparing with existing tasks, understand SEMANTIC MEANING and INTENT, not just word matching.
Only suggest tasks that are genuinely new with unique goals, not variations of existing ones.`;
  }

  private getUserPrompt(notes: string): string {
    return `Extract and refine actionable tasks from these meeting notes:

${notes}

Return a JSON object with a "suggestions" array containing at least 3 refined task suggestions.
Format: {"suggestions": [{"originalText": "[exact quote]", "suggestedTask": "[refined task]", "suggestedDescription": "[intelligent description]", "confidenceScore": 0.8}, ...]}`;
  }

  private getUserPromptWithExistingTasks(notes: string, existingTasks: Array<{ title: string; description?: string }>): string {
    return `EXISTING TASKS (already created - DO NOT duplicate these in intent or purpose):

${existingTasks.map((t, i) => `${i + 1}. "${t.title}"${t.description ? `\n   Purpose: ${t.description}` : ''}`).join('\n\n')}

MEETING NOTES:
${notes}

Return a JSON object with a "suggestions" array containing ONLY new, detailed, actionable tasks that are not covered by existing tasks.
Format: {"suggestions": [{"originalText": "[exact quote]", "suggestedTask": "[refined task]", "suggestedDescription": "[intelligent description]", "confidenceScore": 0.8}, ...]}`;
  }

  private getMockSuggestions(notes: string): AISuggestion[] {
    return [
      {
        originalText: notes.substring(0, 100) || 'Meeting discussion about project planning',
        suggestedTask: 'Create project plan document based on meeting discussion',
        suggestedDescription: 'Develop a comprehensive project plan document that outlines key phases, deliverables, milestones, and resource allocation.',
        confidenceScore: 0.85,
        status: 'pending',
      },
      {
        originalText: notes.substring(100, 200) || 'Follow-up actions needed',
        suggestedTask: 'Schedule follow-up meeting to review progress',
        suggestedDescription: 'Organize a follow-up meeting with relevant stakeholders to review the current progress of tasks.',
        confidenceScore: 0.78,
        status: 'pending',
      },
      {
        originalText: notes.substring(200, 300) || 'Communication and documentation tasks',
        suggestedTask: 'Send meeting summary email to all participants',
        suggestedDescription: 'Draft and send a concise summary email of the meeting outcomes, decisions made, and assigned action items.',
        confidenceScore: 0.92,
        status: 'pending',
      },
    ];
  }
}

