import { supabase } from './supabase';
import { Project, ProjectCreateData, Task, TaskCreateData, TimeEntry, MeetingProcessData, AISuggestion } from '../types';

// Projects
export const projectsService = {
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createProject(data: ProjectCreateData): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: data.name,
        description: data.description,
        status: 'active',
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return project;
  },

  async getProject(id: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },
};

// Tasks
export const tasksService = {
  async getTasks(projectId?: string): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('createdAt', { ascending: false });

    if (projectId) {
      query = query.eq('projectId', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createTask(data: TaskCreateData): Promise<Task> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        projectId: data.projectId || null, // Allow null for tasks without projects
        title: data.title,
        description: data.description,
        status: 'todo',
        priority: data.priority,
        estimatedHours: data.estimatedHours,
        assignedTo: data.assignedTo,
        createdBy: user.id,
        dueDate: data.dueDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return task;
  },

  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({ 
        status,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Time Tracking
export const timeTrackingService = {
  async getTimeEntries(): Promise<TimeEntry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('userId', user.id)
      .order('startTime', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async startTimer(taskId: string): Promise<TimeEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if there's already an active timer for this specific task
    const { data: existingTimer } = await supabase
      .from('time_entries')
      .select('*')
      .eq('userId', user.id)
      .eq('taskId', taskId)
      .is('endTime', null)
      .single();

    if (existingTimer) {
      // Timer already running for this task
      return existingTimer;
    }

    // Check if there's an active timer for a different task
    const { data: otherActiveTimer } = await supabase
      .from('time_entries')
      .select('*')
      .eq('userId', user.id)
      .is('endTime', null)
      .single();

    if (otherActiveTimer) {
      // Stop the other timer and start this one
      await this.stopTimer(otherActiveTimer.id);
    }

    const { data: timeEntry, error } = await supabase
      .from('time_entries')
      .insert({
        userId: user.id,
        taskId,
        startTime: new Date().toISOString(),
        endTime: null,
        durationMinutes: 0,
        description: '',
        billable: false,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return timeEntry;
  },

  async stopTimer(timeEntryId: string): Promise<TimeEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get the time entry
    const { data: timeEntry, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', timeEntryId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !timeEntry) throw new Error('Time entry not found');

    const startTime = new Date(timeEntry.startTime);
    const endTime = new Date();
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60);

    const { data: updated, error } = await supabase
      .from('time_entries')
      .update({
        endTime: endTime.toISOString(),
        durationMinutes,
      })
      .eq('id', timeEntryId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  async createTimeEntry(data: {
    taskId: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    description: string;
    billable?: boolean;
  }): Promise<TimeEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: timeEntry, error } = await supabase
      .from('time_entries')
      .insert({
        userId: user.id,
        taskId: data.taskId,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes,
        description: data.description,
        billable: data.billable || false,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return timeEntry;
  },

  async getActiveTimer(): Promise<TimeEntry | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('userId', user.id)
      .is('endTime', null)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data || null;
  },
};

// AI Suggestions (using mock for now, but structure ready for real implementation)
export const aiSuggestionsService = {
  async getSuggestions(): Promise<AISuggestion[]> {
    const { data, error } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async processMeeting(data: MeetingProcessData): Promise<AISuggestion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // For now, use the mock service but save to database
    const { deepseekService } = await import('./deepseek');
    const suggestions = await deepseekService.processMeetingNotes(data.notes, data.projectId);

    // Save meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        projectId: data.projectId,
        title: data.title,
        notes: data.notes,
        meetingDate: data.meetingDate,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    // Save suggestions
    const suggestionsToInsert = suggestions.map(s => ({
      ...s,
      meetingId: meeting.id,
    }));

    const { data: savedSuggestions, error: suggestionsError } = await supabase
      .from('ai_suggestions')
      .insert(suggestionsToInsert)
      .select();

    if (suggestionsError) throw suggestionsError;
    return savedSuggestions || [];
  },

  async approveSuggestion(suggestionId: string, modifications?: Partial<TaskCreateData>): Promise<Task> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get suggestion
    const { data: suggestion, error: fetchError } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (fetchError || !suggestion) throw new Error('Suggestion not found');

    // Get project ID from meeting
    let projectId = '';
    if (suggestion.meetingId) {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('projectId')
        .eq('id', suggestion.meetingId)
        .single();
      projectId = meeting?.projectId || '';
    }

    if (!projectId) {
      throw new Error('Could not determine project for this suggestion');
    }

    // Create task from suggestion
    const taskData: TaskCreateData = {
      projectId,
      title: modifications?.title || suggestion.suggestedTask,
      description: modifications?.description || suggestion.originalText,
      priority: modifications?.priority || 'medium',
      estimatedHours: modifications?.estimatedHours || 1,
      assignedTo: modifications?.assignedTo || user.id,
      dueDate: modifications?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const task = await tasksService.createTask(taskData);

    // Update suggestion status
    await supabase
      .from('ai_suggestions')
      .update({
        status: 'approved',
        reviewedBy: user.id,
        reviewedAt: new Date().toISOString(),
      })
      .eq('id', suggestionId);

    return task;
  },

  async rejectSuggestion(suggestionId: string, reason: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('ai_suggestions')
      .update({
        status: 'rejected',
        reviewedBy: user.id,
        reviewedAt: new Date().toISOString(),
        rejectionReason: reason,
      })
      .eq('id', suggestionId);

    if (error) throw error;
  },
};

