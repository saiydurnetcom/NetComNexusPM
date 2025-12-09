// API Data Service - Replaces supabase-data.ts
// Uses REST API client instead of Supabase client

import { apiClient } from './api-client';
import {
  Project,
  ProjectCreateData,
  Task,
  TaskCreateData,
  TimeEntry,
  AISuggestion,
  Meeting,
  ProjectReport,
  TaskDependency,
  TaskComment,
  Notification,
} from '../types';

// Projects
export const projectsService = {
  async getProjects(): Promise<Project[]> {
    const projects = await apiClient.getProjects();
    return projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      createdBy: p.createdBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      purpose: p.purpose || null,
      resources: p.resources || null,
    }));
  },

  async createProject(data: ProjectCreateData): Promise<Project> {
    const project = await apiClient.createProject({
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'ACTIVE',
      purpose: data.purpose,
      resources: data.resources,
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      purpose: project.purpose || null,
      resources: project.resources || null,
    };
  },

  async getProject(id: string): Promise<Project> {
    const project = await apiClient.getProject(id);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      purpose: project.purpose || null,
      resources: project.resources || null,
    };
  },

  async updateProject(
    id: string,
    updates: Partial<ProjectCreateData & { status?: Project['status']; purpose?: string }>,
  ): Promise<Project> {
    const project = await apiClient.updateProject(id, updates);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      purpose: project.purpose || null,
      resources: project.resources || null,
    };
  },
};

// Tasks
export const tasksService = {
  async getTasks(projectId?: string): Promise<Task[]> {
    const tasks = await apiClient.getTasks(projectId);
    return tasks.map((t: any) => ({
      id: t.id,
      projectId: t.projectId || null,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      estimatedHours: t.estimatedHours || 0,
      assignedTo: t.assignedTo,
      createdBy: t.createdBy,
      dueDate: t.dueDate,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      meetingId: t.meetingId || null,
      reviewerId: t.reviewerId || null,
      parentTaskId: t.parentTaskId || null,
    }));
  },

  async createTask(data: TaskCreateData): Promise<Task> {
    const task = await apiClient.createTask({
      projectId: data.projectId || undefined,
      title: data.title,
      description: data.description,
      priority: data.priority,
      estimatedHours: data.estimatedHours,
      assignedTo: data.assignedTo,
      dueDate: data.dueDate,
      parentTaskId: data.parentTaskId || undefined,
      meetingId: data.meetingId || undefined,
    });

    return {
      id: task.id,
      projectId: task.projectId || null,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      estimatedHours: task.estimatedHours || 0,
      assignedTo: task.assignedTo,
      createdBy: task.createdBy,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      meetingId: task.meetingId || null,
      reviewerId: task.reviewerId || null,
      parentTaskId: task.parentTaskId || null,
    };
  },

  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    const task = await apiClient.updateTaskStatus(id, status);
    return {
      id: task.id,
      projectId: task.projectId || null,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      estimatedHours: task.estimatedHours || 0,
      assignedTo: task.assignedTo,
      createdBy: task.createdBy,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      meetingId: task.meetingId || null,
      reviewerId: task.reviewerId || null,
      parentTaskId: task.parentTaskId || null,
    };
  },
};

// Time Tracking
export const timeTrackingService = {
  async getTimeEntries(): Promise<TimeEntry[]> {
    return apiClient.getTimeEntries();
  },

  async startTimer(taskId: string): Promise<TimeEntry> {
    return apiClient.startTimer(taskId);
  },

  async stopTimer(timeEntryId: string): Promise<TimeEntry> {
    return apiClient.stopTimer(timeEntryId);
  },

  async createTimeEntry(data: {
    taskId: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    description: string;
    billable?: boolean;
  }): Promise<TimeEntry> {
    return apiClient.createTimeEntry(data);
  },

  async getActiveTimer(): Promise<TimeEntry | null> {
    return apiClient.getActiveTimer();
  },

  async updateTimeEntry(
    timeEntryId: string,
    updates: {
      startTime?: string;
      endTime?: string;
      durationMinutes?: number;
      description?: string;
      billable?: boolean;
    },
  ): Promise<TimeEntry> {
    return apiClient.updateTimeEntry(timeEntryId, updates);
  },

  async deleteTimeEntry(timeEntryId: string): Promise<void> {
    await apiClient.deleteTimeEntry(timeEntryId);
  },
};

// Meetings Service
export const meetingsService = {
  async getMeetings(): Promise<Meeting[]> {
    return apiClient.getMeetings();
  },

  async getMeeting(id: string): Promise<Meeting | null> {
    try {
      return await apiClient.getMeeting(id);
    } catch (error) {
      return null;
    }
  },

  async createMeeting(data: {
    title: string;
    notes: string;
    meetingDate: string;
    projectId?: string;
  }): Promise<Meeting> {
    return apiClient.createMeeting(data);
  },

  async getMeetingSuggestions(meetingId: string): Promise<AISuggestion[]> {
    return apiClient.getMeetingSuggestions(meetingId);
  },
};

// AI Suggestions
export const aiSuggestionsService = {
  async getSuggestions(): Promise<AISuggestion[]> {
    return apiClient.getSuggestions();
  },

  async processMeeting(
    data: { notes: string; title: string; meetingDate: string; projectId?: string; meetingId?: string },
    existingTaskTitles?: string[],
  ): Promise<AISuggestion[]> {
    if (data.meetingId) {
      return apiClient.processMeeting(data.meetingId);
    } else {
      const meeting = await apiClient.createMeeting({
        title: data.title,
        notes: data.notes,
        meetingDate: data.meetingDate,
        projectId: data.projectId,
      });
      return apiClient.processMeeting(meeting.id);
    }
  },

  async reprocessMeeting(meetingId: string): Promise<AISuggestion[]> {
    return apiClient.reprocessMeeting(meetingId);
  },

  async approveSuggestion(suggestionId: string, modifications?: Partial<TaskCreateData>): Promise<Task> {
    return apiClient.approveSuggestion(suggestionId, modifications);
  },

  async rejectSuggestion(suggestionId: string, reason: string): Promise<void> {
    await apiClient.rejectSuggestion(suggestionId, reason);
  },
};

// Project Reports Service
export const projectReportsService = {
  async getReports(projectId?: string): Promise<ProjectReport[]> {
    return apiClient.getReports(projectId);
  },

  async createReport(data: {
    projectId: string;
    title: string;
    content: string;
    reportType?: 'cxo' | 'summary' | 'detailed';
  }): Promise<ProjectReport> {
    return apiClient.createReport(data.projectId, data);
  },

  async deleteReport(id: string): Promise<void> {
    await apiClient.deleteReport(id);
  },
};

// Task Dependencies Service
export const taskDependenciesService = {
  async getDependencies(taskId: string): Promise<TaskDependency[]> {
    return apiClient.getTaskDependencies(taskId);
  },

  async createDependency(data: {
    taskId: string;
    dependsOnTaskId: string;
    dependencyType?: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  }): Promise<TaskDependency> {
    return apiClient.createTaskDependency(data.taskId, {
      dependsOnTaskId: data.dependsOnTaskId,
      dependencyType: data.dependencyType,
    });
  },

  async deleteDependency(dependencyId: string): Promise<void> {
    await apiClient.deleteTaskDependency(dependencyId);
  },
};

// Task Comments Service
export const taskCommentsService = {
  async getComments(taskId: string): Promise<TaskComment[]> {
    return apiClient.getTaskComments(taskId);
  },

  async createComment(data: {
    taskId: string;
    content: string;
    mentionedUserIds?: string[];
  }): Promise<TaskComment> {
    return apiClient.createTaskComment(data.taskId, {
      content: data.content,
      mentionedUserIds: data.mentionedUserIds || [],
    });
  },

  async updateComment(commentId: string, content: string): Promise<TaskComment> {
    return apiClient.updateTaskComment(commentId, { content });
  },

  async deleteComment(commentId: string): Promise<void> {
    await apiClient.deleteTaskComment(commentId);
  },
};

// Notifications Service
export const notificationsService = {
  async getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
    return apiClient.getNotifications(unreadOnly);
  },

  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.markNotificationAsRead(notificationId);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.markAllNotificationsAsRead();
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.deleteNotification(notificationId);
  },

  async triggerNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedTaskId?: string;
    relatedProjectId?: string;
    relatedCommentId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await apiClient.triggerNotification(data);
  },
};

