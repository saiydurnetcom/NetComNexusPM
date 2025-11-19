export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'manager' | 'member';
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedHours: number;
  assignedTo: string;
  reviewerId?: string | null;
  meetingId?: string | null;
  parentTaskId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  dueDate: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number; // in bytes
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  taskId: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  description: string;
  billable: boolean;
  createdAt: string;
}

export interface Meeting {
  id: string;
  projectId: string | null; // Optional - meetings can exist without projects
  title: string;
  notes: string;
  meetingDate: string;
  createdBy: string;
  createdAt: string;
}

export interface AISuggestion {
  id: string;
  meetingId: string;
  originalText: string;
  suggestedTask: string;
  suggestedDescription?: string | null; // AI-generated intelligent description
  confidenceScore: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface ProjectReport {
  id: string;
  projectId: string;
  title: string;
  content: string;
  reportType: 'cxo' | 'summary' | 'detailed';
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ProjectCreateData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  purpose?: string;
  resources?: Record<string, unknown>;
  tags?: string[];
}

export interface TaskCreateData {
  projectId?: string; // Optional - tasks can exist without projects
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedHours: number;
  assignedTo: string;
  dueDate: string;
  parentTaskId?: string | null; // Optional - for sub-tasks
}

export interface MeetingProcessData {
  projectId?: string; // Optional - meetings can exist without projects
  title: string;
  notes: string;
  meetingDate: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  departmentId?: string;
  teamLeadId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AllowedDomain {
  id: string;
  domain: string;
  isActive: boolean;
  autoAssignTeamId?: string;
  autoAssignDepartmentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Extended User interface with team/department
export interface ExtendedUser extends User {
  teamId?: string;
  departmentId?: string;
  team?: Team;
  department?: Department;
}

// Extended Project with tags
export interface ProjectWithTags extends Project {
  tags?: Tag[];
}

// Extended Task with tags
export interface TaskWithTags extends Task {
  tags?: Tag[];
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  taskAssignments: boolean;
  projectUpdates: boolean;
  meetingReminders: boolean;
  pushNotifications: boolean;
  pushSubscription?: any; // Web Push API subscription object
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRisk {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  riskCategory: 'technical' | 'schedule' | 'budget' | 'resource' | 'scope' | 'quality' | 'external' | 'other';
  probability: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  status: 'identified' | 'monitoring' | 'mitigated' | 'closed';
  mitigationStrategy?: string;
  mitigationOwner?: string | null;
  targetMitigationDate?: string | null;
  actualMitigationDate?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBudgetItem {
  id: string;
  projectId: string;
  category: string;
  description?: string;
  budgetedAmount: number;
  actualAmount: number;
  currency: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  targetDate: string;
  completedDate?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}