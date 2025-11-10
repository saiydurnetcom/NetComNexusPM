import {
  AISuggestion,
  Meeting,
  MeetingProcessData,
  Project,
  ProjectCreateData,
  Task,
  TaskCreateData,
  TimeEntry,
} from '@/types';

type SuggestionContext = Record<string, {
  projectId: string;
}>;

interface MockDataStore {
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  activeTimeEntryId: string | null;
  suggestions: AISuggestion[];
  suggestionContext: SuggestionContext;
  meetings: Meeting[];
}

const STORAGE_KEY = 'nexuspm_mock_data';

const defaultStore = (): MockDataStore => ({
  projects: [],
  tasks: [],
  timeEntries: [],
  activeTimeEntryId: null,
  suggestions: [],
  suggestionContext: {},
  meetings: [],
});

const hasLocalStorage = () => typeof window !== 'undefined' && !!window.localStorage;

let inMemoryStore: MockDataStore | null = null;

const loadStore = (): MockDataStore => {
  if (hasLocalStorage()) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultStore();
    }

    try {
      const parsed = JSON.parse(raw) as MockDataStore;
      return {
        ...defaultStore(),
        ...parsed,
      };
    } catch (error) {
      console.warn('[MockApi] Failed to parse local storage data, resetting.', error);
      return defaultStore();
    }
  }

  if (!inMemoryStore) {
    inMemoryStore = defaultStore();
  }

  return inMemoryStore;
};

const persistStore = (store: MockDataStore) => {
  if (hasLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } else {
    inMemoryStore = store;
  }
};

const uid = () => (
  typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const ensureProjectDates = (project: Project): Project => ({
  ...project,
  startDate: project.startDate || new Date().toISOString(),
  endDate: project.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
});

export class MockApiClient {
  private currentUserId: string | null = null;

  setToken(token: string | null) {
    this.currentUserId = token ?? null;
  }

  private getStore() {
    return loadStore();
  }

  private saveStore(store: MockDataStore) {
    persistStore(store);
  }

  async getProjects(): Promise<Project[]> {
    const store = this.getStore();
    return store.projects.map(ensureProjectDates);
  }

  async createProject(data: ProjectCreateData): Promise<Project> {
    const store = this.getStore();
    const now = new Date().toISOString();
    const project: Project = {
      id: uid(),
      name: data.name,
      description: data.description,
      status: 'active',
      startDate: data.startDate,
      endDate: data.endDate,
      createdBy: this.currentUserId ?? 'mock-user',
      createdAt: now,
      updatedAt: now,
    };

    const nextStore: MockDataStore = {
      ...store,
      projects: [...store.projects, project],
    };

    this.saveStore(nextStore);
    return project;
  }

  async getProject(id: string): Promise<Project> {
    const store = this.getStore();
    const project = store.projects.find((item) => item.id === id);
    if (!project) {
      throw new Error('Project not found');
    }
    return ensureProjectDates(project);
  }

  async getTasks(projectId?: string): Promise<Task[]> {
    const store = this.getStore();
    const tasks = projectId ? store.tasks.filter((task) => task.projectId === projectId) : store.tasks;
    return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createTask(data: TaskCreateData): Promise<Task> {
    const store = this.getStore();
    const now = new Date().toISOString();
    const task: Task = {
      id: uid(),
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: 'todo',
      priority: data.priority,
      estimatedHours: data.estimatedHours,
      assignedTo: data.assignedTo,
      createdBy: this.currentUserId ?? 'mock-user',
      createdAt: now,
      updatedAt: now,
      dueDate: data.dueDate,
    };

    const nextStore: MockDataStore = {
      ...store,
      tasks: [...store.tasks, task],
    };

    this.saveStore(nextStore);
    return task;
  }

  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    const store = this.getStore();
    const now = new Date().toISOString();
    const tasks = store.tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            status,
            updatedAt: now,
          }
        : task
    );
    const updatedTask = tasks.find((task) => task.id === id);
    if (!updatedTask) {
      throw new Error('Task not found');
    }

    this.saveStore({
      ...store,
      tasks,
    });

    return updatedTask;
  }

  async startTimer(taskId: string): Promise<TimeEntry> {
    const store = this.getStore();
    const now = new Date().toISOString();
    const timeEntry: TimeEntry = {
      id: uid(),
      userId: this.currentUserId ?? 'mock-user',
      taskId,
      startTime: now,
      endTime: null,
      durationMinutes: 0,
      description: '',
      billable: false,
      createdAt: now,
    };

    const nextStore: MockDataStore = {
      ...store,
      activeTimeEntryId: timeEntry.id,
      timeEntries: [...store.timeEntries.filter((entry) => entry.id !== store.activeTimeEntryId), timeEntry],
    };

    this.saveStore(nextStore);
    return timeEntry;
  }

  async stopTimer(timeEntryId: string): Promise<TimeEntry> {
    const store = this.getStore();
    const entry = store.timeEntries.find((timeEntry) => timeEntry.id === timeEntryId);
    if (!entry) {
      throw new Error('Time entry not found');
    }

    const endTime = new Date();
    const startTime = new Date(entry.startTime);
    const diffMs = Math.max(0, endTime.getTime() - startTime.getTime());
    const durationMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

    const updatedEntry: TimeEntry = {
      ...entry,
      endTime: endTime.toISOString(),
      durationMinutes,
    };

    const timeEntries = store.timeEntries.map((item) => (item.id === entry.id ? updatedEntry : item));

    const nextStore: MockDataStore = {
      ...store,
      activeTimeEntryId: store.activeTimeEntryId === timeEntryId ? null : store.activeTimeEntryId,
      timeEntries,
    };

    this.saveStore(nextStore);
    return updatedEntry;
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    const store = this.getStore();
    return [...store.timeEntries].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  async processMeeting(data: MeetingProcessData): Promise<AISuggestion[]> {
    const store = this.getStore();
    const meetingId = uid();
    const now = new Date().toISOString();

    const meeting: Meeting = {
      id: meetingId,
      projectId: data.projectId,
      title: data.title,
      notes: data.notes,
      meetingDate: data.meetingDate,
      createdBy: this.currentUserId ?? 'mock-user',
      createdAt: now,
    };

    const sentences = data.notes
      .split(/\r?\n|[.!?]/)
      .map((item) => item.replace(/[-*]/g, '').trim())
      .filter((item) => item.length > 3);

    const suggestions: AISuggestion[] = sentences.map((sentence) => ({
      id: uid(),
      meetingId,
      originalText: sentence,
      suggestedTask: sentence.charAt(0).toUpperCase() + sentence.slice(1),
      confidenceScore: Math.min(0.95, 0.6 + Math.random() * 0.3),
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: now,
    }));

    const nextStore: MockDataStore = {
      ...store,
      meetings: [...store.meetings, meeting],
      suggestions: [...store.suggestions, ...suggestions],
      suggestionContext: suggestions.reduce<SuggestionContext>((acc, suggestion) => {
        acc[suggestion.id] = { projectId: data.projectId };
        return acc;
      }, { ...store.suggestionContext }),
    };

    this.saveStore(nextStore);
    return suggestions;
  }

  async approveSuggestion(suggestionId: string, modifications?: Partial<TaskCreateData>): Promise<Task> {
    const store = this.getStore();
    const suggestion = store.suggestions.find((item) => item.id === suggestionId);
    if (!suggestion) {
      throw new Error('Suggestion not found');
    }

    const context = store.suggestionContext[suggestionId];
    const now = new Date().toISOString();
    const dueDate = modifications?.dueDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const projectId = modifications?.projectId ?? context?.projectId;

    if (!projectId) {
      throw new Error('Missing project information for suggestion approval');
    }

    const task: Task = {
      id: uid(),
      projectId,
      title: modifications?.title ?? suggestion.suggestedTask,
      description: modifications?.description ?? suggestion.originalText,
      status: 'todo',
      priority: modifications?.priority ?? 'medium',
      estimatedHours: modifications?.estimatedHours ?? 1,
      assignedTo: modifications?.assignedTo ?? 'unassigned',
      createdBy: this.currentUserId ?? 'mock-user',
      createdAt: now,
      updatedAt: now,
      dueDate,
    };

    const nextStore: MockDataStore = {
      ...store,
      tasks: [...store.tasks, task],
      suggestions: store.suggestions.filter((item) => item.id !== suggestionId),
      suggestionContext: Object.keys(store.suggestionContext).reduce<SuggestionContext>((acc, key) => {
        if (key !== suggestionId) {
          acc[key] = store.suggestionContext[key];
        }
        return acc;
      }, {}),
    };

    this.saveStore(nextStore);
    return task;
  }

  async rejectSuggestion(suggestionId: string, _reason: string): Promise<void> {
    const store = this.getStore();

    const nextStore: MockDataStore = {
      ...store,
      suggestions: store.suggestions.filter((item) => item.id !== suggestionId),
      suggestionContext: Object.keys(store.suggestionContext).reduce<SuggestionContext>((acc, key) => {
        if (key !== suggestionId) {
          acc[key] = store.suggestionContext[key];
        }
        return acc;
      }, {}),
    };

    this.saveStore(nextStore);
  }

  async getSuggestions(): Promise<AISuggestion[]> {
    const store = this.getStore();
    return [...store.suggestions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
