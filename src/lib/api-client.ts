// API Client for NestJS Backend
// Replaces Supabase client calls with REST API calls

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return {} as T;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const response = await this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.token);
    return response;
  }

  async getProfile() {
    return this.request<any>('/auth/profile');
  }

  // Projects
  async getProjects() {
    return this.request<any[]>('/projects');
  }

  async getProject(id: string) {
    return this.request<any>(`/projects/${id}`);
  }

  async createProject(data: any) {
    return this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: any) {
    return this.request<any>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks
  async getTasks(projectId?: string) {
    const url = projectId ? `/tasks?projectId=${projectId}` : '/tasks';
    return this.request<any[]>(url);
  }

  async getTask(id: string) {
    return this.request<any>(`/tasks/${id}`);
  }

  async createTask(data: any) {
    return this.request<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: any) {
    return this.request<any>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateTaskStatus(id: string, status: string) {
    return this.request<any>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteTask(id: string) {
    return this.request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Task Comments
  async getTaskComments(taskId: string) {
    return this.request<any[]>(`/tasks/${taskId}/comments`);
  }

  async createTaskComment(taskId: string, data: any) {
    return this.request<any>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTaskComment(id: string, data: any) {
    return this.request<any>(`/tasks/comments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTaskComment(id: string) {
    return this.request<void>(`/tasks/comments/${id}`, {
      method: 'DELETE',
    });
  }

  // Task Dependencies
  async getTaskDependencies(taskId: string) {
    return this.request<any[]>(`/tasks/${taskId}/dependencies`);
  }

  async createTaskDependency(taskId: string, data: any) {
    return this.request<any>(`/tasks/${taskId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTaskDependency(id: string) {
    return this.request<void>(`/tasks/dependencies/${id}`, {
      method: 'DELETE',
    });
  }

  // Task Attachments
  async getTaskAttachments(taskId: string) {
    return this.request<any[]>(`/tasks/${taskId}/attachments`);
  }

  async uploadTaskAttachment(taskId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/storage/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async deleteTaskAttachment(id: string) {
    return this.request<void>(`/storage/attachments/${id}`, {
      method: 'DELETE',
    });
  }

  async getAttachmentUrl(id: string) {
    const response = await this.request<{ url: string }>(`/storage/attachments/${id}/url`);
    return response.url;
  }

  // Task Tags
  async getTaskTags(taskId: string) {
    return this.request<any[]>(`/tasks/${taskId}/tags`);
  }

  async updateTaskTags(taskId: string, tagIds: string[]) {
    return this.request<void>(`/tasks/${taskId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagIds }),
    });
  }

  // Project Tags
  async getProjectTags(projectId: string) {
    return this.request<any[]>(`/projects/${projectId}/tags`);
  }

  async updateProjectTags(projectId: string, tagIds: string[]) {
    return this.request<void>(`/projects/${projectId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagIds }),
    });
  }

  // Time Tracking
  async getTimeEntries() {
    return this.request<any[]>('/time/entries');
  }

  async getActiveTimer() {
    return this.request<any | null>('/time/active');
  }

  async startTimer(taskId: string) {
    return this.request<any>('/time/start', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });
  }

  async stopTimer(timeEntryId: string) {
    return this.request<any>(`/time/${timeEntryId}/stop`, {
      method: 'POST',
    });
  }

  async createTimeEntry(data: any) {
    return this.request<any>('/time/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTimeEntry(id: string, data: any) {
    return this.request<any>(`/time/entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTimeEntry(id: string) {
    return this.request<void>(`/time/entries/${id}`, {
      method: 'DELETE',
    });
  }

  // Meetings
  async getMeetings() {
    return this.request<any[]>('/meetings');
  }

  async getMeeting(id: string) {
    return this.request<any>(`/meetings/${id}`);
  }

  async createMeeting(data: any) {
    return this.request<any>('/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMeeting(id: string, data: any) {
    return this.request<any>(`/meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMeeting(id: string) {
    return this.request<void>(`/meetings/${id}`, {
      method: 'DELETE',
    });
  }

  async processMeeting(meetingId: string) {
    return this.request<any[]>(`/meetings/${meetingId}/process`, {
      method: 'POST',
    });
  }

  async reprocessMeeting(meetingId: string) {
    return this.request<any[]>(`/meetings/${meetingId}/reprocess`, {
      method: 'POST',
    });
  }

  // AI Suggestions
  async getSuggestions() {
    return this.request<any[]>('/suggestions');
  }

  async getMeetingSuggestions(meetingId: string) {
    return this.request<any[]>(`/suggestions/meetings/${meetingId}`);
  }

  async approveSuggestion(suggestionId: string, modifications?: any) {
    return this.request<any>(`/suggestions/${suggestionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ ...modifications }),
    });
  }

  async rejectSuggestion(suggestionId: string, reason: string) {
    return this.request<void>(`/suggestions/${suggestionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Notifications
  async getNotifications(unreadOnly: boolean = false) {
    const url = unreadOnly ? '/notifications?unreadOnly=true' : '/notifications';
    return this.request<any[]>(url);
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request<void>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request<void>('/notifications/read-all', {
      method: 'POST',
    });
  }

  async deleteNotification(notificationId: string) {
    return this.request<void>(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  async getNotificationPreferences() {
    return this.request<any>('/notifications/preferences');
  }

  async updateNotificationPreferences(data: any) {
    return this.request<any>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Users
  async getUsers() {
    return this.request<any[]>('/users');
  }

  async getUser(id: string) {
    return this.request<any>(`/users/${id}`);
  }

  async getCurrentUserRole() {
    // Backend returns role as string directly, wrap it for consistency
    const role = await this.request<string>('/users/role');
    return { role: role || 'MEMBER' };
  }

  // Reports
  async getReports(projectId?: string) {
    const url = projectId ? `/projects/reports?projectId=${projectId}` : '/projects/reports';
    return this.request<any[]>(url);
  }

  async createReport(projectId: string, data: any) {
    return this.request<any>(`/projects/${projectId}/reports`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteReport(id: string) {
    return this.request<void>(`/projects/reports/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();

