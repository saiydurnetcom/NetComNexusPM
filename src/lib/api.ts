import { 
  AuthResponse, 
  LoginCredentials, 
  RegisterData, 
  Project, 
  ProjectCreateData, 
  Task, 
  TaskCreateData, 
  TimeEntry, 
  Meeting, 
  MeetingProcessData, 
  AISuggestion,
  User
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers || {},
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

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile(): Promise<User> {
    return this.request<User>('/auth/profile');
  }

  // Project endpoints
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  async createProject(data: ProjectCreateData): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  // Task endpoints
  async getTasks(projectId?: string): Promise<Task[]> {
    const url = projectId ? `/tasks?projectId=${projectId}` : '/tasks';
    return this.request<Task[]>(url);
  }

  async createTask(data: TaskCreateData): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Time tracking endpoints
  async startTimer(taskId: string): Promise<TimeEntry> {
    return this.request<TimeEntry>('/time/start', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });
  }

  async stopTimer(timeEntryId: string): Promise<TimeEntry> {
    return this.request<TimeEntry>(`/time/${timeEntryId}/stop`, {
      method: 'POST',
    });
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    return this.request<TimeEntry[]>('/time/entries');
  }

  // AI Meeting processing
  async processMeeting(data: MeetingProcessData): Promise<AISuggestion[]> {
    return this.request<AISuggestion[]>('/meetings/process', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveSuggestion(suggestionId: string, modifications?: Partial<TaskCreateData>): Promise<Task> {
    return this.request<Task>(`/suggestions/${suggestionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ modifications }),
    });
  }

  async rejectSuggestion(suggestionId: string, reason: string): Promise<void> {
    return this.request<void>(`/suggestions/${suggestionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getSuggestions(): Promise<AISuggestion[]> {
    return this.request<AISuggestion[]>('/suggestions');
  }
}

export const apiClient = new ApiClient();