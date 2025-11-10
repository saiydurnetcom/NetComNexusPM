import {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  Project,
  ProjectCreateData,
  Task,
  TaskCreateData,
  TimeEntry,
  MeetingProcessData,
  AISuggestion,
  User,
} from '../types';
import { MockApiClient } from './mockApi';

const API_BASE_URL = import.meta.env.VITE_API_URL;

class ApiClient {
  private token: string | null = null;
  private useMock = !API_BASE_URL;
  private mockClient = new MockApiClient();

  setToken(token: string | null) {
    this.token = token;
    this.mockClient.setToken(token);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!API_BASE_URL) {
      throw new Error('API base URL not configured');
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private async withFallback<T>(operation: () => Promise<T>, mockOperation: () => Promise<T>): Promise<T> {
    if (this.useMock) {
      return mockOperation();
    }

    try {
      return await operation();
    } catch (error) {
      console.warn('[ApiClient] Falling back to mock API because the network request failed.', error);
      this.useMock = true;
      return mockOperation();
    }
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (this.useMock || !API_BASE_URL) {
      throw new Error('Login via mock API is not supported. Configure VITE_API_URL for real authentication.');
    }

    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    if (this.useMock || !API_BASE_URL) {
      throw new Error('Registration via mock API is not supported. Configure VITE_API_URL for real authentication.');
    }

    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile(): Promise<User> {
    if (this.useMock || !API_BASE_URL) {
      throw new Error('Profile endpoint requires a configured API.');
    }

    return this.request<User>('/auth/profile');
  }

  // Project endpoints
  async getProjects(): Promise<Project[]> {
    return this.withFallback(
      () => this.request<Project[]>('/projects'),
      () => this.mockClient.getProjects()
    );
  }

  async createProject(data: ProjectCreateData): Promise<Project> {
    return this.withFallback(
      () => this.request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      () => this.mockClient.createProject(data)
    );
  }

  async getProject(id: string): Promise<Project> {
    return this.withFallback(
      () => this.request<Project>(`/projects/${id}`),
      () => this.mockClient.getProject(id)
    );
  }

  // Task endpoints
  async getTasks(projectId?: string): Promise<Task[]> {
    return this.withFallback(
      () => {
        const url = projectId ? `/tasks?projectId=${projectId}` : '/tasks';
        return this.request<Task[]>(url);
      },
      () => this.mockClient.getTasks(projectId)
    );
  }

  async createTask(data: TaskCreateData): Promise<Task> {
    return this.withFallback(
      () => this.request<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      () => this.mockClient.createTask(data)
    );
  }

  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    return this.withFallback(
      () => this.request<Task>(`/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
      () => this.mockClient.updateTaskStatus(id, status)
    );
  }

  // Time tracking endpoints
  async startTimer(taskId: string): Promise<TimeEntry> {
    return this.withFallback(
      () => this.request<TimeEntry>('/time/start', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      }),
      () => this.mockClient.startTimer(taskId)
    );
  }

  async stopTimer(timeEntryId: string): Promise<TimeEntry> {
    return this.withFallback(
      () => this.request<TimeEntry>(`/time/${timeEntryId}/stop`, {
        method: 'POST',
      }),
      () => this.mockClient.stopTimer(timeEntryId)
    );
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    return this.withFallback(
      () => this.request<TimeEntry[]>('/time/entries'),
      () => this.mockClient.getTimeEntries()
    );
  }

  // AI Meeting processing
  async processMeeting(data: MeetingProcessData): Promise<AISuggestion[]> {
    return this.withFallback(
      () => this.request<AISuggestion[]>('/meetings/process', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      () => this.mockClient.processMeeting(data)
    );
  }

  async approveSuggestion(suggestionId: string, modifications?: Partial<TaskCreateData>): Promise<Task> {
    return this.withFallback(
      () => this.request<Task>(`/suggestions/${suggestionId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ modifications }),
      }),
      () => this.mockClient.approveSuggestion(suggestionId, modifications)
    );
  }

  async rejectSuggestion(suggestionId: string, reason: string): Promise<void> {
    return this.withFallback(
      () => this.request<void>(`/suggestions/${suggestionId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
      () => this.mockClient.rejectSuggestion(suggestionId, reason)
    );
  }

  async getSuggestions(): Promise<AISuggestion[]> {
    return this.withFallback(
      () => this.request<AISuggestion[]>('/suggestions'),
      () => this.mockClient.getSuggestions()
    );
  }
}

export const apiClient = new ApiClient();