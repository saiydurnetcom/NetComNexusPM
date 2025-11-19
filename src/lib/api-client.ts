/* eslint-disable @typescript-eslint/no-explicit-any */
// API Client for NestJS Backend
// Replaces Supabase client calls with REST API calls

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Enum normalization helpers
function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Keys that should be uppercased when sending to backend (Prisma enums are uppercase)
const ENUM_KEYS_TO_UPPERCASE = new Set([
  'role',
  'status',
  'priority',
  'dependencyType',
  'reportType',
  'riskCategory',
  'probability',
  'impact',
]);

function normalizeOutgoingEnums<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map(item => normalizeOutgoingEnums(item)) as unknown as T;
  }
  if (isPlainObject(data)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && ENUM_KEYS_TO_UPPERCASE.has(key)) {
        result[key] = value.toUpperCase();
      } else if (Array.isArray(value) || isPlainObject(value)) {
        result[key] = normalizeOutgoingEnums(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }
  return data;
}

// Lowercase only enums the frontend expects in lowercase. Leave Task/Project status/priority as-is (uppercase).
function normalizeIncomingEnums<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map(item => normalizeIncomingEnums(item)) as unknown as T;
  }
  if (isPlainObject(data)) {
    const result: Record<string, any> = {};
    const obj = data as Record<string, any>;
    const looksLikeSuggestion = 'originalText' in obj && 'suggestedTask' in obj;
    const looksLikeRisk =
      'riskCategory' in obj ||
      ('probability' in obj && 'impact' in obj);
    const looksLikeMilestone =
      'targetDate' in obj || 'completedDate' in obj;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Always lowercase these keys for frontend
        if (key === 'role') {
          result[key] = value.toLowerCase();
          continue;
        }
        if (key === 'reportType') {
          result[key] = value.toLowerCase();
          continue;
        }
        if (key === 'dependencyType') {
          result[key] = value.toLowerCase();
          continue;
        }
        if (key === 'riskCategory' || key === 'probability' || key === 'impact') {
          result[key] = value.toLowerCase();
          continue;
        }
        if (key === 'status') {
          // Lowercase status for suggestions, risks, milestones
          if (looksLikeSuggestion || looksLikeRisk || looksLikeMilestone) {
            result[key] = value.toLowerCase();
            continue;
          }
          // Else, leave as-is (tasks and projects expect uppercase in frontend)
          result[key] = value;
          continue;
        }
        // Default: keep value
        result[key] = value;
      } else if (Array.isArray(value) || isPlainObject(value)) {
        result[key] = normalizeIncomingEnums(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }
  return data;
}

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

    // Normalize outgoing JSON bodies for enum casing
    let body = options.body;
    const contentType = (headers as Record<string, string>)['Content-Type'] || '';
    if (body && contentType.includes('application/json') && typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        const normalized = normalizeOutgoingEnums(parsed);
        body = JSON.stringify(normalized);
      } catch {
        // If parsing fails, send as-is
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Handle empty responses
    const respContentType = response.headers.get('content-type');
    if (respContentType && respContentType.includes('application/json')) {
      const json = await response.json();
      return normalizeIncomingEnums(json);
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

  async updateProfile(data: { firstName?: string; lastName?: string }) {
    return this.request<any>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Users
  async updateUser(id: string, data: any) {
    return this.request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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

  // Tags Management
  async getTags() {
    return this.request<any[]>('/tags');
  }

  async getTag(id: string) {
    return this.request<any>(`/tags/${id}`);
  }

  async createTag(data: { name: string; color?: string; category?: string; description?: string }) {
    return this.request<any>('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTag(id: string, data: { name?: string; color?: string; category?: string; description?: string }) {
    return this.request<any>(`/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTag(id: string) {
    return this.request<void>(`/tags/${id}`, {
      method: 'DELETE',
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
    const normalized = typeof role === 'string' ? role.toLowerCase() : 'member';
    return { role: normalized || 'member' };
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

  // Project Members
  async getProjectMembers(projectId: string) {
    return this.request<any[]>(`/projects/${projectId}/members`);
  }

  async addProjectMember(projectId: string, data: { userId: string; role?: 'owner' | 'member' | 'viewer' }) {
    return this.request<void>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeProjectMember(projectId: string, memberId: string) {
    return this.request<void>(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  // Project Milestones
  async getProjectMilestones(projectId: string) {
    return this.request<any[]>(`/projects/${projectId}/milestones`);
  }

  async createProjectMilestone(projectId: string, data: { name: string; description?: string; targetDate: string }) {
    return this.request<any>(`/projects/${projectId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProjectMilestone(id: string, data: { name?: string; description?: string; targetDate?: string; completedDate?: string; status?: string }) {
    return this.request<any>(`/projects/milestones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProjectMilestone(id: string) {
    return this.request<void>(`/projects/milestones/${id}`, {
      method: 'DELETE',
    });
  }

  // Project Risks
  async getProjectRisks(projectId: string) {
    return this.request<any[]>(`/projects/${projectId}/risks`);
  }

  async createProjectRisk(projectId: string, data: { title: string; description?: string; riskCategory: string; probability: string; impact: string; status?: string; mitigationStrategy?: string; mitigationOwnerId?: string; mitigationOwner?: string; targetMitigationDate?: string }) {
    return this.request<any>(`/projects/${projectId}/risks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProjectRisk(id: string, data: Partial<{ title: string; description: string; riskCategory: string; probability: string; impact: string; status: string; mitigationStrategy: string; mitigationOwnerId: string; mitigationOwner: string; targetMitigationDate: string; actualMitigationDate: string }>) {
    return this.request<any>(`/projects/risks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProjectRisk(id: string) {
    return this.request<void>(`/projects/risks/${id}`, {
      method: 'DELETE',
    });
  }

  // Project Budget
  async getProjectBudget(projectId: string) {
    return this.request<any[]>(`/projects/${projectId}/budget`);
  }

  async createProjectBudgetItem(projectId: string, data: { category: string; description?: string; budgetedAmount: number; actualAmount?: number; currency?: string }) {
    return this.request<any>(`/projects/${projectId}/budget`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProjectBudgetItem(id: string, data: Partial<{ category: string; description: string; budgetedAmount: number; actualAmount: number; currency: string }>) {
    return this.request<any>(`/projects/budget/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProjectBudgetItem(id: string) {
    return this.request<void>(`/projects/budget/${id}`, {
      method: 'DELETE',
    });
  }

  // Teams
  async getTeams() {
    return this.request<any[]>('/teams');
  }

  async createTeam(data: { name: string; description?: string; departmentId?: string; teamLeadId?: string }) {
    return this.request<any>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id: string, data: Partial<{ name: string; description: string; departmentId: string; teamLeadId: string }>) {
    return this.request<any>(`/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: string) {
    return this.request<void>(`/teams/${id}`, {
      method: 'DELETE',
    });
  }

  // Departments
  async getDepartments() {
    return this.request<any[]>('/departments');
  }

  async createDepartment(data: { name: string; description?: string }) {
    return this.request<any>('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDepartment(id: string, data: Partial<{ name: string; description: string }>) {
    return this.request<any>(`/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDepartment(id: string) {
    return this.request<void>(`/departments/${id}`, {
      method: 'DELETE',
    });
  }

  // Settings (admin)
  async getSettings() {
    return this.request<any>('/settings');
  }

  async updateSettings(data: Partial<{
    aiApiKey: string; aiApiUrl: string; aiModel: string;
    emailEnabled: boolean; emailApiUrl: string; emailApiKey: string; emailFrom: string; emailProvider: 'resend' | 'sendgrid' | 'ses' | 'custom';
    pushEnabled: boolean; pushVapidPublicKey: string; pushVapidPrivateKey: string;
  }>) {
    return this.request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getPublicSettings() {
    return this.request<any>('/settings/public');
  }
}

export const apiClient = new ApiClient();

