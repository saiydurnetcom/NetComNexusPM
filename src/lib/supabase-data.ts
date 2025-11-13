import { supabase } from './supabase';
import { Project, ProjectCreateData, Task, TaskCreateData, TimeEntry, MeetingProcessData, AISuggestion, Meeting, ProjectReport, TaskDependency, TaskComment, Notification } from '../types';

// Projects
export const projectsService = {
  async getProjects(): Promise<Project[]> {
    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('projects')
      .select('id, name, description, status, startDate, endDate, createdBy, createdAt, updatedAt, purpose, resources')
      .order('createdAt', { ascending: false });
    
    // If camelCase fails, try lowercase (PostgreSQL lowercases unquoted identifiers)
    // Check for column-related errors: PGRST204, 400 status, or column name in error message
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      result = await supabase
        .from('projects')
        .select('id, name, description, status, startdate, enddate, createdby, createdat, updatedat, purpose, resources')
        .order('createdat', { ascending: false });
    }
    
    // If that also fails, try select('*')
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      result = await supabase
      .from('projects')
      .select('*')
      .order('createdAt', { ascending: false });
    }

    if (result.error) throw result.error;
    
    // Normalize the returned data
    return (result.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      startDate: p.startDate || p.startdate || p.start_date,
      endDate: p.endDate || p.enddate || p.end_date,
      createdBy: p.createdBy || p.createdby || p.created_by,
      createdAt: p.createdAt || p.createdat || p.created_at,
      updatedAt: p.updatedAt || p.updatedat || p.updated_at,
      purpose: p.purpose || null,
      resources: p.resources || null,
    }));
  },

  async createProject(data: ProjectCreateData): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try lowercase first
    const insertDataLower = {
      name: data.name,
      description: data.description,
      status: 'active',
      startdate: data.startDate,
      enddate: data.endDate,
      createdby: user.id,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString(),
    };

    let result = await supabase
      .from('projects')
      .insert(insertDataLower)
      .select('id, name, description, status, startdate, enddate, createdby, createdat, updatedat, purpose, resources')
      .single();
    
    // If lowercase fails, try camelCase
    // Check for column-related errors: PGRST204, 400 status, or column name in error message
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const insertDataCamel = {
        name: data.name,
        description: data.description,
        status: 'active',
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      result = await supabase
        .from('projects')
        .insert(insertDataCamel)
        .select('id, name, description, status, startDate, endDate, createdBy, createdAt, updatedAt, purpose, resources')
      .single();
    }
    
    // If that also fails, try select('*')
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const insertDataCamel = {
        name: data.name,
        description: data.description,
        status: 'active',
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      result = await supabase
        .from('projects')
        .insert(insertDataCamel)
        .select('*')
        .single();
    }

    if (result.error) throw result.error;
    
    // Normalize the returned data
    const project = result.data;
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate || project.startdate || project.start_date,
      endDate: project.endDate || project.enddate || project.end_date,
      createdBy: project.createdBy || project.createdby || project.created_by,
      createdAt: project.createdAt || project.createdat || project.created_at,
      updatedAt: project.updatedAt || project.updatedat || project.updated_at,
      purpose: project.purpose || null,
      resources: project.resources || null,
    };
  },

  async getProject(id: string): Promise<Project> {
    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('projects')
      .select('id, name, description, status, startDate, endDate, createdBy, createdAt, updatedAt, purpose, resources')
      .eq('id', id)
      .single();
    
    // If camelCase fails, try lowercase (PostgreSQL lowercases unquoted identifiers)
    // Check for column-related errors: PGRST204, 400 status, or column name in error message
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      result = await supabase
        .from('projects')
        .select('id, name, description, status, startdate, enddate, createdby, createdat, updatedat, purpose, resources')
        .eq('id', id)
        .single();
    }
    
    // If that also fails, try select('*')
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      result = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    }

    if (result.error) throw result.error;
    
    // Normalize the returned data
    const project = result.data;
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate || project.startdate || project.start_date,
      endDate: project.endDate || project.enddate || project.end_date,
      createdBy: project.createdBy || project.createdby || project.created_by,
      createdAt: project.createdAt || project.createdat || project.created_at,
      updatedAt: project.updatedAt || project.updatedat || project.updated_at,
      purpose: project.purpose || null,
      resources: project.resources || null,
    };
  },

  async updateProject(id: string, updates: Partial<ProjectCreateData & { status?: Project['status']; purpose?: string }>): Promise<Project> {
    // Try camelCase first (migrations use quoted identifiers)
    const updateDataCamel: any = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.name !== undefined) updateDataCamel.name = updates.name;
    if (updates.description !== undefined) updateDataCamel.description = updates.description;
    if (updates.startDate !== undefined) updateDataCamel.startDate = updates.startDate;
    if (updates.endDate !== undefined) updateDataCamel.endDate = updates.endDate;
    if (updates.status !== undefined) updateDataCamel.status = updates.status;
    if ((updates as any).purpose !== undefined) updateDataCamel.purpose = (updates as any).purpose;

    let result = await supabase
      .from('projects')
      .update(updateDataCamel)
      .eq('id', id)
      .select('id, name, description, status, startDate, endDate, createdBy, createdAt, updatedAt, purpose, resources')
      .single();

    // If camelCase fails, try lowercase (PostgreSQL lowercases unquoted identifiers)
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const updateDataLower: any = {
        updatedat: new Date().toISOString(),
      };
      if (updates.name !== undefined) updateDataLower.name = updates.name;
      if (updates.description !== undefined) updateDataLower.description = updates.description;
      if (updates.startDate !== undefined) updateDataLower.startdate = updates.startDate;
      if (updates.endDate !== undefined) updateDataLower.enddate = updates.endDate;
      if (updates.status !== undefined) updateDataLower.status = updates.status;
      if ((updates as any).purpose !== undefined) updateDataLower.purpose = (updates as any).purpose;

      result = await supabase
        .from('projects')
        .update(updateDataLower)
        .eq('id', id)
        .select('id, name, description, status, startdate, enddate, createdby, createdat, updatedat, purpose, resources')
        .single();
    }

    // If that also fails, try select('*')
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const updateDataCamel: any = {
        updatedAt: new Date().toISOString(),
      };
      if (updates.name !== undefined) updateDataCamel.name = updates.name;
      if (updates.description !== undefined) updateDataCamel.description = updates.description;
      if (updates.startDate !== undefined) updateDataCamel.startDate = updates.startDate;
      if (updates.endDate !== undefined) updateDataCamel.endDate = updates.endDate;
      if (updates.status !== undefined) updateDataCamel.status = updates.status;
      if ((updates as any).purpose !== undefined) updateDataCamel.purpose = (updates as any).purpose;

      result = await supabase
        .from('projects')
        .update(updateDataCamel)
        .eq('id', id)
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    const project = result.data;
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate || project.startdate || project.start_date,
      endDate: project.endDate || project.enddate || project.end_date,
      createdBy: project.createdBy || project.createdby || project.created_by,
      createdAt: project.createdAt || project.createdat || project.created_at,
      updatedAt: project.updatedAt || project.updatedat || project.updated_at,
      purpose: project.purpose || null,
      resources: project.resources || null,
    };
  },
};

// Tasks
export const tasksService = {
  async getTasks(projectId?: string): Promise<Task[]> {
    // Try camelCase first (migrations use quoted identifiers)
    let query = supabase
      .from('tasks')
      .select('id, projectId, title, description, status, priority, estimatedHours, assignedTo, createdBy, dueDate, createdAt, updatedAt, meetingId, reviewerId, parentTaskId')
      .order('createdAt', { ascending: false });

    if (projectId) {
      query = query.eq('projectId', projectId);
    }

    let result = await query;
    
    // If camelCase fails, try lowercase (PostgreSQL lowercases unquoted identifiers)
    // Check for column-related errors: PGRST204, 400 status, or column name in error message
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      query = supabase
        .from('tasks')
        .select('id, projectid, title, description, status, priority, estimatedhours, assignedto, createdby, duedate, createdat, updatedat, meetingid, reviewerid, parenttaskid')
        .order('createdat', { ascending: false });

      if (projectId) {
        query = query.eq('projectid', projectId);
      }
      
      result = await query;
    }
    
    // If that also fails, try select('*')
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      query = supabase
      .from('tasks')
      .select('*')
      .order('createdAt', { ascending: false });

    if (projectId) {
      query = query.eq('projectId', projectId);
    }

      result = await query;
    }

    if (result.error) throw result.error;
    
    // Normalize the returned data
    return (result.data || []).map((t: any) => ({
      id: t.id,
      projectId: t.projectId || t.projectid || t.project_id || null,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      estimatedHours: t.estimatedHours || t.estimatedhours || t.estimated_hours || 0,
      assignedTo: t.assignedTo || t.assignedto || t.assigned_to,
      createdBy: t.createdBy || t.createdby || t.created_by,
      dueDate: t.dueDate || t.duedate || t.due_date,
      createdAt: t.createdAt || t.createdat || t.created_at,
      updatedAt: t.updatedAt || t.updatedat || t.updated_at,
      meetingId: t.meetingId || t.meetingid || t.meeting_id || null,
      reviewerId: t.reviewerId || t.reviewerid || t.reviewer_id || null,
      parentTaskId: t.parentTaskId || t.parenttaskid || t.parent_task_id || null,
    }));
  },

  async createTask(data: TaskCreateData): Promise<Task> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try lowercase first
    const insertDataLower = {
      projectid: data.projectId || null,
      title: data.title,
      description: data.description,
      status: 'todo',
      priority: data.priority,
      estimatedhours: data.estimatedHours,
      assignedto: data.assignedTo,
      createdby: user.id,
      duedate: data.dueDate,
      parenttaskid: data.parentTaskId || null,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString(),
    };

    let result = await supabase
      .from('tasks')
      .insert(insertDataLower)
      .select('id, projectid, title, description, status, priority, estimatedhours, assignedto, createdby, duedate, createdat, updatedat, meetingid, reviewerid, parenttaskid')
      .single();
    
    // If lowercase fails, try camelCase
    // Check for column-related errors: PGRST204, 400 status, or column name in error message
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const insertDataCamel = {
        projectId: data.projectId || null,
        title: data.title,
        description: data.description,
        status: 'todo',
        priority: data.priority,
        estimatedHours: data.estimatedHours,
        assignedTo: data.assignedTo,
        createdBy: user.id,
        dueDate: data.dueDate,
        parentTaskId: data.parentTaskId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      result = await supabase
        .from('tasks')
        .insert(insertDataCamel)
        .select('id, projectId, title, description, status, priority, estimatedHours, assignedTo, createdBy, dueDate, createdAt, updatedAt, meetingId, reviewerId, parentTaskId')
      .single();
    }
    
    // If that also fails, try select('*')
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const insertDataCamel = {
        projectId: data.projectId || null,
        title: data.title,
        description: data.description,
        status: 'todo',
        priority: data.priority,
        estimatedHours: data.estimatedHours,
        assignedTo: data.assignedTo,
        createdBy: user.id,
        dueDate: data.dueDate,
        parentTaskId: data.parentTaskId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      result = await supabase
        .from('tasks')
        .insert(insertDataCamel)
        .select('*')
        .single();
    }

    if (result.error) throw result.error;
    
    // Normalize the returned data
    const task = result.data;
    const normalizedTask = {
      id: task.id,
      projectId: task.projectId || task.projectid || task.project_id || null,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      estimatedHours: task.estimatedHours || task.estimatedhours || task.estimated_hours || 0,
      assignedTo: task.assignedTo || task.assignedto || task.assigned_to,
      createdBy: task.createdBy || task.createdby || task.created_by,
      dueDate: task.dueDate || task.duedate || task.due_date,
      createdAt: task.createdAt || task.createdat || task.created_at,
      updatedAt: task.updatedAt || task.updatedat || task.updated_at,
      meetingId: task.meetingId || task.meetingid || task.meeting_id || null,
      reviewerId: task.reviewerId || task.reviewerid || task.reviewer_id || null,
      parentTaskId: task.parentTaskId || task.parenttaskid || task.parent_task_id || null,
    };

    // Trigger notification if task is assigned to someone other than creator
    if (normalizedTask.assignedTo !== normalizedTask.createdBy) {
      try {
        const { notificationTriggerService } = await import('./notification-trigger-service');
        // Get project name if available
        let projectName: string | undefined;
        if (normalizedTask.projectId) {
          try {
            const { data: project } = await supabase
              .from('projects')
              .select('name')
              .eq('id', normalizedTask.projectId)
              .maybeSingle();
            projectName = project?.name;
          } catch (e) {
            // Ignore errors fetching project name
          }
        }
        await notificationTriggerService.triggerNotification({
          userId: normalizedTask.assignedTo,
          type: 'task_assigned',
          title: `New Task Assigned: ${normalizedTask.title}`,
          message: `You have been assigned a new task: ${normalizedTask.title}`,
          relatedTaskId: normalizedTask.id,
          relatedProjectId: normalizedTask.projectId || undefined,
          metadata: { projectName },
        });
      } catch (error) {
        // Don't fail task creation if notification fails
        console.error('Failed to trigger notification:', error);
      }
    }

    return normalizedTask;
  },

  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    // Try lowercase first
    const updateDataLower = {
      status,
      updatedat: new Date().toISOString(),
    };

    let result = await supabase
      .from('tasks')
      .update(updateDataLower)
      .eq('id', id)
      .select('id, projectid, title, description, status, priority, estimatedhours, assignedto, createdby, duedate, createdat, updatedat, meetingid, reviewerid, parenttaskid')
      .single();
    
    // If lowercase fails, try camelCase
    // Check for column-related errors: PGRST204, 400 status, or column name in error message
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const updateDataCamel = {
        status,
        updatedAt: new Date().toISOString(),
      };
      
      result = await supabase
        .from('tasks')
        .update(updateDataCamel)
      .eq('id', id)
        .select('id, projectId, title, description, status, priority, estimatedHours, assignedTo, createdBy, dueDate, createdAt, updatedAt, meetingId, reviewerId, parentTaskId')
      .single();
    }
    
    // If that also fails, try select('*')
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const updateDataCamel = {
        status,
        updatedAt: new Date().toISOString(),
      };
      
      result = await supabase
        .from('tasks')
        .update(updateDataCamel)
        .eq('id', id)
        .select('*')
        .single();
    }

    if (result.error) throw result.error;
    
    // Normalize the returned data
    const task = result.data;
    return {
      id: task.id,
      projectId: task.projectId || task.projectid || task.project_id || null,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      estimatedHours: task.estimatedHours || task.estimatedhours || task.estimated_hours || 0,
      assignedTo: task.assignedTo || task.assignedto || task.assigned_to,
      createdBy: task.createdBy || task.createdby || task.created_by,
      dueDate: task.dueDate || task.duedate || task.due_date,
      createdAt: task.createdAt || task.createdat || task.created_at,
      updatedAt: task.updatedAt || task.updatedat || task.updated_at,
      meetingId: task.meetingId || task.meetingid || task.meeting_id || null,
      reviewerId: task.reviewerId || task.reviewerid || task.reviewer_id || null,
      parentTaskId: task.parentTaskId || task.parenttaskid || task.parent_task_id || null,
    };
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
      .maybeSingle();

    if (existingTimer) {
      // Timer already running for this task - prevent duplicate timers
      throw new Error('A timer is already running for this task. Please stop the existing timer first.');
    }

    // Check if there's an active timer for a different task
    const { data: otherActiveTimer } = await supabase
      .from('time_entries')
      .select('*')
      .eq('userId', user.id)
      .is('endTime', null)
      .maybeSingle();

    if (otherActiveTimer) {
      // Stop the other timer and start this one
      await this.stopTimer(otherActiveTimer.id);
    }

    // Automatically set task status to "in_progress" when timer starts
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({ 
        status: 'in_progress',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', taskId);
    
    // Don't throw if task update fails - timer should still start
    if (taskUpdateError) {
      console.warn('Failed to update task status to in_progress:', taskUpdateError);
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

    // Use maybeSingle() instead of single() to handle 0 or 1 rows
    // If multiple timers exist, get the most recent one
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('userId', user.id)
      .is('endTime', null)
      .order('startTime', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Log but don't throw - it's okay if there's no active timer
      console.error('Error fetching active timer:', error);
      return null;
    }

    return data || null;
  },

  async updateTimeEntry(
    timeEntryId: string,
    updates: {
      startTime?: string;
      endTime?: string;
      durationMinutes?: number;
      description?: string;
      billable?: boolean;
    }
  ): Promise<TimeEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Recalculate duration if start/end times are updated
    let finalDuration = updates.durationMinutes;
    if (updates.startTime || updates.endTime) {
      const { data: existingEntry } = await supabase
        .from('time_entries')
        .select('startTime, endTime')
        .eq('id', timeEntryId)
        .single();

      if (existingEntry) {
        const startTime = new Date(updates.startTime || existingEntry.startTime);
        const endTime = new Date(updates.endTime || existingEntry.endTime);
        finalDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        
        if (finalDuration <= 0) {
          throw new Error('End time must be after start time');
        }
      }
    }

    const { data: updated, error } = await supabase
      .from('time_entries')
      .update({
        ...updates,
        durationMinutes: finalDuration,
      })
      .eq('id', timeEntryId)
      .eq('userId', user.id) // Ensure user can only update their own entries
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  async deleteTimeEntry(timeEntryId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if this is an active timer (no endTime)
    const { data: entry } = await supabase
      .from('time_entries')
      .select('endTime')
      .eq('id', timeEntryId)
      .eq('userId', user.id)
      .single();

    if (!entry) {
      throw new Error('Time entry not found or you do not have permission to delete it');
    }

    // Don't allow deleting active timers - they should be stopped first
    if (!entry.endTime) {
      throw new Error('Cannot delete an active timer. Please stop it first.');
    }

    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', timeEntryId)
      .eq('userId', user.id); // Ensure user can only delete their own entries

    if (error) throw error;
  },
};

// Meetings Service
export const meetingsService = {
  async getMeetings(): Promise<Meeting[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('createdBy', user.id)
      .order('meetingDate', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getMeeting(id: string): Promise<Meeting | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .eq('createdBy', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data;
  },

  async createMeeting(data: { title: string; notes: string; meetingDate: string; projectId?: string }): Promise<Meeting> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('meetings')
      .insert({
        projectid: data.projectId || null,
        title: data.title,
        notes: data.notes,
        meetingdate: data.meetingDate,
        createdby: user.id,
        createdat: new Date().toISOString(),
      })
      .select('*')
      .single();

    // If that fails, try camelCase
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      result = await supabase
        .from('meetings')
        .insert({
          projectId: data.projectId || null,
          title: data.title,
          notes: data.notes,
          meetingDate: data.meetingDate,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
        })
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    // Normalize the returned data
    const meeting = result.data;
    return {
      id: meeting.id,
      projectId: meeting.projectId || meeting.projectid || meeting.project_id || null,
      title: meeting.title,
      notes: meeting.notes,
      meetingDate: meeting.meetingDate || meeting.meetingdate || meeting.meeting_date,
      createdBy: meeting.createdBy || meeting.createdby || meeting.created_by,
      createdAt: meeting.createdAt || meeting.createdat || meeting.created_at,
    };
  },

  async getMeetingSuggestions(meetingId: string): Promise<AISuggestion[]> {
    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('ai_suggestions')
      .select('id, meetingId, originalText, suggestedTask, suggestedDescription, confidenceScore, status, reviewedBy, reviewedAt, rejectionReason, createdAt')
      .eq('meetingId', meetingId)
      .order('createdAt', { ascending: false });
    
    // If camelCase fails, try lowercase (PostgreSQL lowercases unquoted identifiers)
    // Check for column-related errors: PGRST204, 400 status, or column name in error message
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      result = await supabase
        .from('ai_suggestions')
        .select('id, meetingid, originaltext, suggestedtask, suggesteddescription, confidencescore, status, reviewedby, reviewedat, rejectionreason, createdat')
        .eq('meetingid', meetingId)
        .order('createdat', { ascending: false });
    }
    
    // If that also fails, try select('*')
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      result = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('meetingId', meetingId)
      .order('createdAt', { ascending: false });
    }

    if (result.error) throw result.error;
    
    // Normalize the returned data
    // IMPORTANT: Map fields correctly - originalText should be the original text from meeting notes,
    // suggestedDescription is the AI-generated intelligent description
    // We need to be very explicit about which field comes from which column to avoid swapping
    return (result.data || []).map((s: any) => {
      // Explicitly map originalText - this MUST be the original quote from meeting notes
      // Try camelCase first (quoted identifiers), then lowercase, then snake_case
      let originalText = '';
      if (s.originalText !== undefined && s.originalText !== null) {
        originalText = String(s.originalText);
      } else if (s.originaltext !== undefined && s.originaltext !== null) {
        originalText = String(s.originaltext);
      } else if (s.original_text !== undefined && s.original_text !== null) {
        originalText = String(s.original_text);
      }
      
      // Explicitly map suggestedDescription - this is the AI-generated intelligent description
      // Try camelCase first (quoted identifiers), then lowercase, then snake_case
      let suggestedDescription: string | null = null;
      if (s.suggestedDescription !== undefined && s.suggestedDescription !== null) {
        suggestedDescription = String(s.suggestedDescription);
      } else if (s.suggesteddescription !== undefined && s.suggesteddescription !== null) {
        suggestedDescription = String(s.suggesteddescription);
      } else if (s.suggested_description !== undefined && s.suggested_description !== null) {
        suggestedDescription = String(s.suggested_description);
      }
      
      // CRITICAL: Ensure originalText is NOT the same as suggestedDescription
      // If they're the same, it means the data might be swapped in the database
      if (originalText && suggestedDescription && originalText === suggestedDescription) {
        console.warn('Warning: originalText and suggestedDescription are the same. This might indicate a data mapping issue.');
      }
      
      return {
        id: s.id,
        meetingId: s.meetingId || s.meetingid || s.meeting_id,
        originalText: originalText, // Original text from meeting notes - DO NOT swap with suggestedDescription
        suggestedTask: s.suggestedTask || s.suggestedtask || s.suggested_task,
        suggestedDescription: suggestedDescription, // AI-generated description - separate from originalText
        confidenceScore: s.confidenceScore || s.confidencescore || s.confidence_score,
        status: s.status,
        reviewedBy: s.reviewedBy || s.reviewedby || s.reviewed_by || null,
        reviewedAt: s.reviewedAt || s.reviewedat || s.reviewed_at || null,
        rejectionReason: s.rejectionReason || s.rejectionreason || s.rejection_reason || null,
        createdAt: s.createdAt || s.createdat || s.created_at,
      };
    });
  },
};

// AI Suggestions (using mock for now, but structure ready for real implementation)
export const aiSuggestionsService = {
  async getSuggestions(): Promise<AISuggestion[]> {
    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('ai_suggestions')
      .select('id, meetingId, originalText, suggestedTask, suggestedDescription, confidenceScore, status, reviewedBy, reviewedAt, rejectionReason, createdAt')
      .eq('status', 'pending')
      .order('createdAt', { ascending: false });
    
    // If camelCase fails, try lowercase (PostgreSQL lowercases unquoted identifiers)
    // Check for column-related errors: PGRST204, 400 status, or column name in error message
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      result = await supabase
        .from('ai_suggestions')
        .select('id, meetingid, originaltext, suggestedtask, suggesteddescription, confidencescore, status, reviewedby, reviewedat, rejectionreason, createdat')
        .eq('status', 'pending')
        .order('createdat', { ascending: false });
    }
    
    // If that also fails, try select('*')
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      result = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('createdAt', { ascending: false });
    }

    if (result.error) throw result.error;
    
    // Normalize the returned data
    // IMPORTANT: Map fields correctly - originalText should be the original text from meeting notes,
    // suggestedDescription is the AI-generated intelligent description
    // We need to be very explicit about which field comes from which column to avoid swapping
    return (result.data || []).map((s: any) => {
      // Explicitly map originalText - this MUST be the original quote from meeting notes
      // Try camelCase first (quoted identifiers), then lowercase, then snake_case
      let originalText = '';
      if (s.originalText !== undefined && s.originalText !== null) {
        originalText = String(s.originalText);
      } else if (s.originaltext !== undefined && s.originaltext !== null) {
        originalText = String(s.originaltext);
      } else if (s.original_text !== undefined && s.original_text !== null) {
        originalText = String(s.original_text);
      }
      
      // Explicitly map suggestedDescription - this is the AI-generated intelligent description
      // Try camelCase first (quoted identifiers), then lowercase, then snake_case
      let suggestedDescription: string | null = null;
      if (s.suggestedDescription !== undefined && s.suggestedDescription !== null) {
        suggestedDescription = String(s.suggestedDescription);
      } else if (s.suggesteddescription !== undefined && s.suggesteddescription !== null) {
        suggestedDescription = String(s.suggesteddescription);
      } else if (s.suggested_description !== undefined && s.suggested_description !== null) {
        suggestedDescription = String(s.suggested_description);
      }
      
      // CRITICAL: Ensure originalText is NOT the same as suggestedDescription
      // If they're the same, it means the data might be swapped in the database
      if (originalText && suggestedDescription && originalText === suggestedDescription) {
        console.warn('Warning: originalText and suggestedDescription are the same. This might indicate a data mapping issue.');
      }
      
      return {
        id: s.id,
        meetingId: s.meetingId || s.meetingid || s.meeting_id,
        originalText: originalText, // Original text from meeting notes - DO NOT swap with suggestedDescription
        suggestedTask: s.suggestedTask || s.suggestedtask || s.suggested_task,
        suggestedDescription: suggestedDescription, // AI-generated description - separate from originalText
        confidenceScore: s.confidenceScore || s.confidencescore || s.confidence_score,
        status: s.status,
        reviewedBy: s.reviewedBy || s.reviewedby || s.reviewed_by || null,
        reviewedAt: s.reviewedAt || s.reviewedat || s.reviewed_at || null,
        rejectionReason: s.rejectionReason || s.rejectionreason || s.rejection_reason || null,
        createdAt: s.createdAt || s.createdat || s.created_at,
      };
    });
  },

  async processMeeting(data: MeetingProcessData & { meetingId?: string }, existingTaskTitles?: string[]): Promise<AISuggestion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // For now, use the mock service but save to database
    const { deepseekService } = await import('./deepseek');
    
    // Get existing tasks if meetingId is provided and we need to avoid duplicates
    let existingTasks: Array<{ title: string; description?: string }> | undefined;
    if (existingTaskTitles && existingTaskTitles.length > 0) {
      // Fetch task details for context
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title, description')
        .in('title', existingTaskTitles);
      existingTasks = tasks || [];
    }
    
    const suggestions = await deepseekService.processMeetingNotes(data.notes, data.projectId, existingTasks);

    // Use existing meeting ID if provided, otherwise create a new meeting
    let meetingId: string;
    if (data.meetingId) {
      meetingId = data.meetingId;
    } else {
      // Save meeting (projectId is optional)
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          projectId: data.projectId || null,
          title: data.title,
          notes: data.notes,
          meetingDate: data.meetingDate,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (meetingError) throw meetingError;
      meetingId = meeting.id;
    }

    // Save suggestions (remove any temporary IDs, let Supabase generate UUIDs)
    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    // Note: suggestedDescription may not exist in the database yet, so we'll try without it first
    const suggestionsToInsertLower = suggestions.map(s => ({
      meetingid: meetingId,
      originaltext: s.originalText,
      suggestedtask: s.suggestedTask,
      confidencescore: s.confidenceScore,
      status: s.status || 'pending',
      reviewedby: null,
      reviewedat: null,
      rejectionreason: null,
      createdat: new Date().toISOString(),
    }));

    let result = await supabase
      .from('ai_suggestions')
      .insert(suggestionsToInsertLower)
      .select('id, meetingid, originaltext, suggestedtask, confidencescore, status, reviewedby, reviewedat, rejectionreason, createdat');
    
    // If that works, try to update with suggestedDescription if it exists
    if (!result.error && result.data && (suggestions.some(s => (s as any).suggestedDescription))) {
      // Try to update with suggestedDescription using lowercase
      for (let i = 0; i < result.data.length; i++) {
        const savedSuggestion = result.data[i];
        const originalSuggestion = suggestions[i];
        if ((originalSuggestion as any).suggestedDescription) {
          // Try lowercase first
          await supabase
            .from('ai_suggestions')
            .update({ suggesteddescription: (originalSuggestion as any).suggestedDescription })
            .eq('id', savedSuggestion.id);
          
          // If that fails, try camelCase
          const updateResult = await supabase
            .from('ai_suggestions')
            .update({ suggestedDescription: (originalSuggestion as any).suggestedDescription })
            .eq('id', savedSuggestion.id);
          
          if (updateResult.error && updateResult.error.code !== 'PGRST204') {
            // Column doesn't exist - that's okay, we'll just skip it
            console.warn('suggestedDescription column not found, skipping update');
          }
        }
      }
    }
    
    // If lowercase insert fails, try camelCase (quoted identifiers)
    // But don't include suggestedDescription if the column doesn't exist
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const suggestionsToInsertCamel = suggestions.map(s => ({
      meetingId: meetingId,
      originalText: s.originalText,
      suggestedTask: s.suggestedTask,
      confidenceScore: s.confidenceScore,
      status: s.status || 'pending',
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
    }));

      result = await supabase
      .from('ai_suggestions')
        .insert(suggestionsToInsertCamel)
        .select('id, meetingId, originalText, suggestedTask, confidenceScore, status, reviewedBy, reviewedAt, rejectionReason, createdAt');
      
      // Try to update with suggestedDescription if it exists
      if (!result.error && result.data && (suggestions.some(s => (s as any).suggestedDescription))) {
        for (let i = 0; i < result.data.length; i++) {
          const savedSuggestion = result.data[i];
          const originalSuggestion = suggestions[i];
          if ((originalSuggestion as any).suggestedDescription) {
            await supabase
              .from('ai_suggestions')
              .update({ suggestedDescription: (originalSuggestion as any).suggestedDescription })
              .eq('id', savedSuggestion.id);
          }
        }
      }
    }
    
    // If that also fails, try select('*') without suggestedDescription
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const suggestionsToInsertCamel = suggestions.map(s => ({
        meetingId: meetingId,
        originalText: s.originalText,
        suggestedTask: s.suggestedTask,
        confidenceScore: s.confidenceScore,
        status: s.status || 'pending',
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
      }));
      
      result = await supabase
        .from('ai_suggestions')
        .insert(suggestionsToInsertCamel)
        .select('*');
    }

    if (result.error) throw result.error;
    
    // Normalize the returned data
    const savedSuggestions = (result.data || []).map((s: any) => ({
      id: s.id,
      meetingId: s.meetingId || s.meetingid || s.meeting_id,
      originalText: s.originalText || s.originaltext || s.original_text,
      suggestedTask: s.suggestedTask || s.suggestedtask || s.suggested_task,
      suggestedDescription: s.suggestedDescription || s.suggesteddescription || s.suggested_description || null,
      confidenceScore: s.confidenceScore || s.confidencescore || s.confidence_score,
      status: s.status,
      reviewedBy: s.reviewedBy || s.reviewedby || s.reviewed_by || null,
      reviewedAt: s.reviewedAt || s.reviewedat || s.reviewed_at || null,
      rejectionReason: s.rejectionReason || s.rejectionreason || s.rejection_reason || null,
      createdAt: s.createdAt || s.createdat || s.created_at,
    }));

    return savedSuggestions;
  },

  async reprocessMeeting(meetingId: string): Promise<AISuggestion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .eq('createdBy', user.id)
      .single();

    if (meetingError || !meeting) throw new Error('Meeting not found');

    // Get ALL existing suggestions (approved AND pending) to avoid duplicates
    // Try lowercase first
    let existingResult = await supabase
      .from('ai_suggestions')
      .select('suggestedtask, originaltext, status')
      .eq('meetingid', meetingId)
      .in('status', ['approved', 'pending']);
    
    // If lowercase fails, try camelCase
    if (existingResult.error && (
      existingResult.error.code === 'PGRST204' || 
      existingResult.error.code === '42703' ||
      existingResult.error.status === 400 ||
      existingResult.error.message?.includes('column') ||
      existingResult.error.message?.includes('does not exist')
    )) {
      existingResult = await supabase
        .from('ai_suggestions')
        .select('suggestedTask, originalText, status')
      .eq('meetingId', meetingId)
        .in('status', ['approved', 'pending']);
    }
    
    const existingSuggestions = existingResult.data ? existingResult.data.map((s: any) => ({
      suggestedTask: s.suggestedTask || s.suggestedtask || s.suggested_task,
      originalText: s.originalText || s.originaltext || s.original_text,
      status: s.status,
    })) : [];

    // Process meeting notes with existing tasks as context
    const { deepseekService } = await import('./deepseek');
    const existingTasks = existingSuggestions?.map(s => ({
      title: s.suggestedTask,
      description: s.originalText,
    })) || [];

    const newSuggestions = await deepseekService.processMeetingNotes(
      meeting.notes,
      meeting.projectId || undefined,
      existingTasks
    );

    // Additional client-side filtering for safety (AI should handle most of this, but we add a safety net)
    // This uses improved semantic similarity checking
    const existingTaskTitles = existingSuggestions?.map(s => s.suggestedTask.toLowerCase().trim()) || [];
    
    const filteredSuggestions = newSuggestions.filter(newSuggestion => {
      const newTitle = newSuggestion.suggestedTask.toLowerCase().trim();
      
      // Check against all existing suggestions (approved and pending)
      return !existingTaskTitles.some(existingTitle => {
        // Exact match
        if (newTitle === existingTitle) return true;
        
        // Check if one is a substring of the other (for very similar tasks)
        if (newTitle.includes(existingTitle) || existingTitle.includes(newTitle)) {
          // Only consider it duplicate if the shorter one is at least 70% of the longer one
          const shorter = newTitle.length < existingTitle.length ? newTitle : existingTitle;
          const longer = newTitle.length >= existingTitle.length ? newTitle : existingTitle;
          if (shorter.length / longer.length > 0.7) return true;
        }
        
        // Word-based similarity (improved)
        const newWords = new Set(newTitle.split(/\s+/).filter(w => w.length > 2)); // Ignore very short words
        const existingWords = new Set(existingTitle.split(/\s+/).filter(w => w.length > 2));
        const commonWords = [...newWords].filter(w => existingWords.has(w));
        
        // Consider duplicate if significant word overlap AND similar length
        const wordOverlap = commonWords.length / Math.max(newWords.size, existingWords.size);
        const lengthSimilarity = Math.min(newTitle.length, existingTitle.length) / Math.max(newTitle.length, existingTitle.length);
        
        // More strict: need both high word overlap AND similar length
        if (wordOverlap > 0.6 && lengthSimilarity > 0.7) return true;
        
        return false;
      });
    });

    // Save only the new, non-duplicate suggestions
    if (filteredSuggestions.length === 0) {
      return [];
    }

    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    // Don't include suggestedDescription in insert if column doesn't exist
    const suggestionsToInsertLower = filteredSuggestions.map(s => ({
      meetingid: meeting.id,
      originaltext: s.originalText,
      suggestedtask: s.suggestedTask,
      confidencescore: s.confidenceScore,
      status: s.status || 'pending',
      reviewedby: null,
      reviewedat: null,
      rejectionreason: null,
      createdat: new Date().toISOString(),
    }));

    let result = await supabase
      .from('ai_suggestions')
      .insert(suggestionsToInsertLower)
      .select('id, meetingid, originaltext, suggestedtask, confidencescore, status, reviewedby, reviewedat, rejectionreason, createdat');
    
    // If insert succeeds, try to update with suggestedDescription if it exists
    if (!result.error && result.data && (filteredSuggestions.some(s => (s as any).suggestedDescription))) {
      for (let i = 0; i < result.data.length; i++) {
        const savedSuggestion = result.data[i];
        const originalSuggestion = filteredSuggestions[i];
        if ((originalSuggestion as any).suggestedDescription) {
          // Try lowercase first
          await supabase
            .from('ai_suggestions')
            .update({ suggesteddescription: (originalSuggestion as any).suggestedDescription })
            .eq('id', savedSuggestion.id);
          
          // If that fails, try camelCase
          const updateResult = await supabase
            .from('ai_suggestions')
            .update({ suggestedDescription: (originalSuggestion as any).suggestedDescription })
            .eq('id', savedSuggestion.id);
          
          if (updateResult.error && updateResult.error.code !== 'PGRST204') {
            console.warn('suggestedDescription column not found, skipping update');
          }
        }
      }
    }
    
    // If lowercase insert fails, try camelCase (quoted identifiers)
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const suggestionsToInsertCamel = filteredSuggestions.map(s => ({
      meetingId: meeting.id,
      originalText: s.originalText,
      suggestedTask: s.suggestedTask,
      confidenceScore: s.confidenceScore,
      status: s.status || 'pending',
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
    }));

      result = await supabase
      .from('ai_suggestions')
        .insert(suggestionsToInsertCamel)
        .select('id, meetingId, originalText, suggestedTask, confidenceScore, status, reviewedBy, reviewedAt, rejectionReason, createdAt');
      
      // Try to update with suggestedDescription if it exists
      if (!result.error && result.data && (filteredSuggestions.some(s => (s as any).suggestedDescription))) {
        for (let i = 0; i < result.data.length; i++) {
          const savedSuggestion = result.data[i];
          const originalSuggestion = filteredSuggestions[i];
          if ((originalSuggestion as any).suggestedDescription) {
            await supabase
              .from('ai_suggestions')
              .update({ suggestedDescription: (originalSuggestion as any).suggestedDescription })
              .eq('id', savedSuggestion.id);
          }
        }
      }
    }
    
    // If that also fails, try select('*')
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('does not exist')
    )) {
      const suggestionsToInsertCamel = filteredSuggestions.map(s => ({
        meetingId: meeting.id,
        originalText: s.originalText,
        suggestedTask: s.suggestedTask,
        confidenceScore: s.confidenceScore,
        status: s.status || 'pending',
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
      }));
      
      result = await supabase
        .from('ai_suggestions')
        .insert(suggestionsToInsertCamel)
        .select('*');
    }

    if (result.error) throw result.error;
    
    // Normalize the returned data
    const savedSuggestions = (result.data || []).map((s: any) => ({
      id: s.id,
      meetingId: s.meetingId || s.meetingid || s.meeting_id,
      originalText: s.originalText || s.originaltext || s.original_text,
      suggestedTask: s.suggestedTask || s.suggestedtask || s.suggested_task,
      suggestedDescription: s.suggestedDescription || s.suggesteddescription || s.suggested_description || null,
      confidenceScore: s.confidenceScore || s.confidencescore || s.confidence_score,
      status: s.status,
      reviewedBy: s.reviewedBy || s.reviewedby || s.reviewed_by || null,
      reviewedAt: s.reviewedAt || s.reviewedat || s.reviewed_at || null,
      rejectionReason: s.rejectionReason || s.rejectionreason || s.rejection_reason || null,
      createdAt: s.createdAt || s.createdat || s.created_at,
    }));

    return savedSuggestions;
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

    // Get project ID from meeting (optional - can be null)
    let projectId: string | undefined = undefined;
    if (suggestion.meetingId) {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('projectId')
        .eq('id', suggestion.meetingId)
        .single();
      projectId = meeting?.projectId || undefined;
    }

    // Use projectId from modifications if provided, otherwise from meeting
    const finalProjectId = modifications?.projectId !== undefined 
      ? modifications.projectId 
      : projectId;

    // Create task from suggestion (projectId is optional)
    // Use AI-generated description if available, otherwise fall back to originalText
    const defaultDescription = (suggestion as any).suggestedDescription || suggestion.originalText;
    const taskData: TaskCreateData = {
      projectId: finalProjectId,
      title: modifications?.title || suggestion.suggestedTask,
      description: modifications?.description || defaultDescription,
      priority: modifications?.priority || 'medium',
      estimatedHours: modifications?.estimatedHours || 1,
      assignedTo: modifications?.assignedTo || user.id,
      dueDate: modifications?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const task = await tasksService.createTask(taskData);

    // Link task to meeting by updating task with meetingId
    if (suggestion.meetingId) {
    await supabase
        .from('tasks')
        .update({ meetingId: suggestion.meetingId })
        .eq('id', task.id);
    }

    // Update suggestion status
    const { error: updateError } = await supabase
      .from('ai_suggestions')
      .update({
        status: 'approved',
        reviewedBy: user.id,
        reviewedAt: new Date().toISOString(),
      })
      .eq('id', suggestionId);

    if (updateError) {
      console.error('Error updating suggestion status:', updateError);
      // Don't throw - task was created successfully
    }

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

// Project Reports Service
export const projectReportsService = {
  async getReports(projectId?: string): Promise<ProjectReport[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try camelCase first (migrations use quoted identifiers)
    let query = supabase
      .from('project_reports')
      .select('*')
      .order('createdAt', { ascending: false });

    if (projectId) {
      query = query.eq('projectId', projectId);
    }

    let result = await query;

    // If camelCase fails, try lowercase (PostgreSQL lowercases unquoted identifiers)
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      query = supabase
        .from('project_reports')
        .select('*')
        .order('createdat', { ascending: false });

      if (projectId) {
        query = query.eq('projectid', projectId);
      }

      result = await query;
    }

    if (result.error) throw result.error;

    // Normalize the returned data
    return (result.data || []).map((r: any) => ({
      id: r.id,
      projectId: r.projectId || r.projectid || r.project_id,
      title: r.title,
      content: r.content,
      reportType: r.reportType || r.reporttype || r.report_type || 'cxo',
      generatedBy: r.generatedBy || r.generatedby || r.generated_by,
      createdAt: r.createdAt || r.createdat || r.created_at,
      updatedAt: r.updatedAt || r.updatedat || r.updated_at,
    }));
  },

  async createReport(data: {
    projectId: string;
    title: string;
    content: string;
    reportType?: 'cxo' | 'summary' | 'detailed';
  }): Promise<ProjectReport> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('project_reports')
      .insert({
        projectId: data.projectId,
        title: data.title,
        content: data.content,
        reportType: data.reportType || 'cxo',
        generatedBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select('*')
      .single();

    // If camelCase fails, try lowercase (PostgreSQL lowercases unquoted identifiers)
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('project_reports')
        .insert({
          projectid: data.projectId,
          title: data.title,
          content: data.content,
          reporttype: data.reportType || 'cxo',
          generatedby: user.id,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString(),
        })
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    // Normalize the returned data
    const report = result.data;
    return {
      id: report.id,
      projectId: report.projectId || report.projectid || report.project_id,
      title: report.title,
      content: report.content,
      reportType: report.reportType || report.reporttype || report.report_type || 'cxo',
      generatedBy: report.generatedBy || report.generatedby || report.generated_by,
      createdAt: report.createdAt || report.createdat || report.created_at,
      updatedAt: report.updatedAt || report.updatedat || report.updated_at,
    };
  },

  async deleteReport(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('project_reports')
      .delete()
      .eq('id', id)
      .eq('generatedby', user.id); // Only allow deleting own reports

    if (error) throw error;
  },
};

// Task Dependencies Service
export const taskDependenciesService = {
  async getDependencies(taskId: string): Promise<TaskDependency[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('task_dependencies')
      .select('*')
      .eq('taskId', taskId);

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('task_dependencies')
        .select('*')
        .eq('taskid', taskId);
    }

    if (result.error) throw result.error;

    return (result.data || []).map((d: any) => ({
      id: d.id,
      taskId: d.taskId || d.taskid || d.task_id,
      dependsOnTaskId: d.dependsOnTaskId || d.dependson_task_id || d.depends_on_task_id,
      dependencyType: d.dependencyType || d.dependencytype || d.dependency_type || 'finish_to_start',
      createdAt: d.createdAt || d.createdat || d.created_at,
    }));
  },

  async createDependency(data: {
    taskId: string;
    dependsOnTaskId: string;
    dependencyType?: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  }): Promise<TaskDependency> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('task_dependencies')
      .insert({
        taskId: data.taskId,
        dependsOnTaskId: data.dependsOnTaskId,
        dependencyType: data.dependencyType || 'finish_to_start',
      })
      .select('*')
      .single();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('task_dependencies')
        .insert({
          taskid: data.taskId,
          dependson_task_id: data.dependsOnTaskId,
          dependencytype: data.dependencyType || 'finish_to_start',
        })
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    const dep = result.data;
    return {
      id: dep.id,
      taskId: dep.taskId || dep.taskid || dep.task_id,
      dependsOnTaskId: dep.dependsOnTaskId || dep.dependson_task_id || dep.depends_on_task_id,
      dependencyType: dep.dependencyType || dep.dependencytype || dep.dependency_type || 'finish_to_start',
      createdAt: dep.createdAt || dep.createdat || dep.created_at,
    };
  },

  async deleteDependency(dependencyId: string): Promise<void> {
    const { error } = await supabase
      .from('task_dependencies')
      .delete()
      .eq('id', dependencyId);

    if (error) throw error;
  },
};

// Task Comments Service
export const taskCommentsService = {
  async getComments(taskId: string): Promise<TaskComment[]> {
    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('task_comments')
      .select('*, users(id, firstName, lastName, email)')
      .eq('taskId', taskId)
      .order('createdAt', { ascending: false });

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('task_comments')
        .select('*, users(id, firstName, lastName, email)')
        .eq('taskid', taskId)
        .order('createdat', { ascending: false });
    }

    if (result.error) throw result.error;

    return (result.data || []).map((c: any) => ({
      id: c.id,
      taskId: c.taskId || c.taskid || c.task_id,
      userId: c.userId || c.userid || c.user_id,
      content: c.content,
      mentionedUserIds: c.mentionedUserIds || c.mentioned_user_ids || c.mentioneduserids || [],
      createdAt: c.createdAt || c.createdat || c.created_at,
      updatedAt: c.updatedAt || c.updatedat || c.updated_at,
      user: c.users ? {
        id: c.users.id,
        firstName: c.users.firstName || c.users.firstname,
        lastName: c.users.lastName || c.users.lastname,
        email: c.users.email,
      } : undefined,
    }));
  },

  async createComment(data: {
    taskId: string;
    content: string;
    mentionedUserIds?: string[];
  }): Promise<TaskComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let result = await supabase
      .from('task_comments')
      .insert({
        taskid: data.taskId,
        userid: user.id,
        content: data.content,
        mentioneduserids: data.mentionedUserIds || [],
      })
      .select('*, users(id, firstName, lastName, email)')
      .single();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('task_comments')
        .insert({
          taskId: data.taskId,
          userId: user.id,
          content: data.content,
          mentionedUserIds: data.mentionedUserIds || [],
        })
        .select('*, users(id, firstName, lastName, email)')
        .single();
    }

    if (result.error) throw result.error;

    const comment = result.data;
    const normalizedComment = {
      id: comment.id,
      taskId: comment.taskId || comment.taskid || comment.task_id,
      userId: comment.userId || comment.userid || comment.user_id,
      content: comment.content,
      mentionedUserIds: comment.mentionedUserIds || comment.mentioned_user_ids || comment.mentioneduserids || [],
      createdAt: comment.createdAt || comment.createdat || comment.created_at,
      updatedAt: comment.updatedAt || comment.updatedat || comment.updated_at,
      user: comment.users ? {
        id: comment.users.id,
        firstName: comment.users.firstName || comment.users.firstname,
        lastName: comment.users.lastName || comment.users.lastname,
        email: comment.users.email,
      } : undefined,
    };

    // Trigger notifications for mentioned users
    if (normalizedComment.mentionedUserIds && normalizedComment.mentionedUserIds.length > 0) {
      try {
        const { notificationTriggerService } = await import('./notification-trigger-service');
        const commenterName = normalizedComment.user 
          ? `${normalizedComment.user.firstName} ${normalizedComment.user.lastName}`
          : 'Someone';
        
        // Get task title for notification
        let taskTitle = 'a task';
        try {
          const { data: task } = await supabase
            .from('tasks')
            .select('title')
            .eq('id', normalizedComment.taskId)
            .maybeSingle();
          taskTitle = task?.title || 'a task';
        } catch (e) {
          // Ignore errors
        }

        // Send notification to each mentioned user
        for (const mentionedUserId of normalizedComment.mentionedUserIds) {
          if (mentionedUserId !== normalizedComment.userId) {
            await notificationTriggerService.triggerNotification({
              userId: mentionedUserId,
              type: 'mention',
              title: `${commenterName} mentioned you`,
              message: `${commenterName} mentioned you in a comment on ${taskTitle}`,
              relatedTaskId: normalizedComment.taskId,
              relatedCommentId: normalizedComment.id,
              metadata: {
                commenterName,
                taskTitle,
              },
            });
          }
        }
      } catch (error) {
        // Don't fail comment creation if notification fails
        console.error('Failed to trigger mention notifications:', error);
      }
    }

    return normalizedComment;
  },

  async updateComment(commentId: string, content: string): Promise<TaskComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let result = await supabase
      .from('task_comments')
      .update({
        content,
        updatedat: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('userid', user.id)
      .select('*, users(id, firstName, lastName, email)')
      .single();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('task_comments')
        .update({
          content,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('userId', user.id)
        .select('*, users(id, firstName, lastName, email)')
        .single();
    }

    if (result.error) throw result.error;

    const comment = result.data;
    return {
      id: comment.id,
      taskId: comment.taskId || comment.taskid || comment.task_id,
      userId: comment.userId || comment.userid || comment.user_id,
      content: comment.content,
      mentionedUserIds: comment.mentionedUserIds || comment.mentioned_user_ids || comment.mentioneduserids || [],
      createdAt: comment.createdAt || comment.createdat || comment.created_at,
      updatedAt: comment.updatedAt || comment.updatedat || comment.updated_at,
      user: comment.users ? {
        id: comment.users.id,
        firstName: comment.users.firstName || comment.users.firstname,
        lastName: comment.users.lastName || comment.users.lastname,
        email: comment.users.email,
      } : undefined,
    };
  },

  async deleteComment(commentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId)
      .eq('userid', user.id);

    if (error && (error.code === '42703' || error.message?.includes('userid'))) {
      const result = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId)
        .eq('userId', user.id);
      if (result.error) throw result.error;
    } else if (error) {
      throw error;
    }
  },
};

// Notifications Service
export const notificationsService = {
  async getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try different column name variations
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })
      .limit(100);
    
    if (unreadOnly) {
      query = query.eq('read', false);
    }
    
    let result = await query;
    
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('userid')
    )) {
      query = supabase
        .from('notifications')
        .select('*')
        .eq('userid', user.id)
        .order('createdat', { ascending: false })
        .limit(100);
      
      if (unreadOnly) {
        query = query.eq('read', false);
      }
      
      result = await query;
    }

    if (result.error) throw result.error;

    return (result.data || []).map((n: any) => ({
      id: n.id,
      userId: n.userId || n.userid || n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      relatedTaskId: n.relatedTaskId || n.related_task_id || n.relatedtaskid,
      relatedProjectId: n.relatedProjectId || n.related_project_id || n.relatedprojectid,
      relatedCommentId: n.relatedCommentId || n.related_comment_id || n.relatedcommentid,
      read: n.read || false,
      readAt: n.readAt || n.read_at || n.readat,
      createdAt: n.createdAt || n.createdat || n.created_at,
    }));
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let result = await supabase
      .from('notifications')
      .update({
        read: true,
        readAt: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('userId', user.id);

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('userid')
    )) {
      result = await supabase
        .from('notifications')
        .update({
          read: true,
          readat: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('userid', user.id);
    }

    if (result.error) throw result.error;
  },

  async markAllAsRead(): Promise<void> {
    // RPC function replaced with API call - handled in notificationsService.markAllAsRead
    // This function is deprecated - use notificationsService instead
    console.warn('markAllAsRead in supabase-data is deprecated. Use notificationsService.markAllAsRead instead.');
    return;
  },

  async deleteNotification(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let result = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('userId', user.id);

    if (result.error && (result.error.code === '42703' || result.error.message?.includes('userid') || result.error.status === 400)) {
      result = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('userid', user.id);
    }

    if (result.error) throw result.error;
  },
};

