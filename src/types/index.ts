export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'member';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
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
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  assignedTo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
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
  projectId: string;
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
  confidenceScore: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
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
}

export interface TaskCreateData {
  projectId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  assignedTo: string;
  dueDate: string;
}

export interface MeetingProcessData {
  projectId: string;
  title: string;
  notes: string;
  meetingDate: string;
}