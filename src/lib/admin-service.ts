/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from './api-client';
import { User, Team, Department, AllowedDomain, Tag } from '../types';

export const adminService = {
  // Users
  async getUsers(): Promise<User[]> {
    const users = await apiClient.getUsers();
    return (users || []) as User[];
  },

  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
    role?: User['role'];
    isActive?: boolean;
    teamId?: string;
    departmentId?: string;
  }): Promise<User> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const created = await apiClient.createUser({ ...data, email: normalizedEmail });
    return created as User;
  },

  async getUserById(id: string): Promise<User | null> {
    try {
      const user = await apiClient.getUser(id);
      return user as User;
    } catch {
      return null;
    }
  },

  async updateUser(id: string, updates: Partial<User> & { teamId?: string; departmentId?: string }): Promise<User> {
    const payload: Record<string, unknown> = {
      email: updates.email ? updates.email.trim().toLowerCase() : undefined,
      firstName: updates.firstName,
      lastName: updates.lastName,
      role: updates.role,
      isActive: updates.isActive,
    };
    // Include optional relations when provided
    if (updates.teamId !== undefined) payload.teamId = updates.teamId;
    if (updates.departmentId !== undefined) payload.departmentId = updates.departmentId;

    const user = await apiClient.updateUser(id, payload);
    return user as User;
  },

  async syncUsersFromAuth(): Promise<void> {
    // Note: User sync is no longer needed with self-hosted backend
    // Users are created directly in the users table during registration
    // This function is kept for backward compatibility but does nothing
    console.warn('syncUsersFromAuth is deprecated. Users are synced automatically during registration.');
    return;
  },

  // Teams
  async getTeams(): Promise<Team[]> {
    const teams = await apiClient.getTeams();
    return (teams || []) as Team[];
  },

  async createTeam(data: { name: string; description?: string; departmentId?: string; teamLeadId?: string }): Promise<Team> {
    const team = await apiClient.createTeam({
      name: data.name,
      description: data.description,
      departmentId: data.departmentId || undefined,
      teamLeadId: data.teamLeadId || undefined,
    });
    return team as Team;
  },

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const team = await apiClient.updateTeam(id, {
      name: updates.name,
      description: updates.description,
      departmentId: updates.departmentId,
      teamLeadId: updates.teamLeadId,
    });
    return team as Team;
  },

  async deleteTeam(id: string): Promise<void> {
    await apiClient.deleteTeam(id);
  },

  // Departments
  async getDepartments(): Promise<Department[]> {
    const departments = await apiClient.getDepartments();
    return (departments || []) as Department[];
  },

  async createDepartment(data: { name: string; description?: string }): Promise<Department> {
    const dept = await apiClient.createDepartment({
      name: data.name,
      description: data.description,
    });
    return dept as Department;
  },

  async updateDepartment(id: string, updates: Partial<Department>): Promise<Department> {
    const dept = await apiClient.updateDepartment(id, {
      name: updates.name,
      description: updates.description,
    });
    return dept as Department;
  },

  async deleteDepartment(id: string): Promise<void> {
    await apiClient.deleteDepartment(id);
  },

  // Allowed Domains
  async getAllowedDomains(): Promise<AllowedDomain[]> {
    try {
      const { apiClient } = await import('./api-client');
      const domains = await apiClient.getAllowedDomains();
      return (domains || []) as AllowedDomain[];
    } catch (error) {
      console.error('Error loading allowed domains:', error);
      return [];
    }
  },

  async createAllowedDomain(data: { domain: string; isActive?: boolean; autoAssignTeamId?: string; autoAssignDepartmentId?: string }): Promise<AllowedDomain> {
    const { apiClient } = await import('./api-client');
    return apiClient.createAllowedDomain(data);
  },

  async updateAllowedDomain(id: string, updates: { domain?: string; isActive?: boolean; autoAssignTeamId?: string; autoAssignDepartmentId?: string }): Promise<AllowedDomain> {
    const { apiClient } = await import('./api-client');
    return apiClient.updateAllowedDomain(id, updates);
  },

  async deleteAllowedDomain(id: string): Promise<void> {
    const { apiClient } = await import('./api-client');
    return apiClient.deleteAllowedDomain(id);
  },

  // Tags
  async getTags(): Promise<Tag[]> {
    try {
      const { apiClient } = await import('./api-client');
      return await apiClient.getTags();
    } catch (error) {
      console.error('Error loading tags:', error);
      return [];
    }
  },

  async createTag(data: Omit<Tag, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Tag> {
    const { apiClient } = await import('./api-client');
    return await apiClient.createTag({
      name: data.name,
      color: data.color,
      category: data.category,
      description: data.description,
    });
  },

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    const { apiClient } = await import('./api-client');
    return await apiClient.updateTag(id, {
      name: updates.name,
      color: updates.color,
      category: updates.category,
      description: updates.description,
    });
  },

  async deleteTag(id: string): Promise<void> {
    const { apiClient } = await import('./api-client');
    return await apiClient.deleteTag(id);
  },

  // Settings (API Keys, Models)
  async getSettings(): Promise<Record<string, unknown>> {
    return apiClient.getSettings();
  },

  async updateSettings(settings: Record<string, unknown>): Promise<void> {
    await apiClient.updateSettings(settings);
  },

  // Project Members
  async getProjectMembers(projectId: string): Promise<Array<User & { role: string; addedBy: string; createdAt: string }>> {
    const members = await apiClient.getProjectMembers(projectId);
    return (members || []).map((pm: any) => {
      const user = pm.user || pm.users || {};
      const role = typeof pm.role === 'string' ? pm.role.toLowerCase() : 'member';
      return {
        id: user.id || pm.userId || pm.userid,
        email: user.email || pm.email || '',
        firstName: user.firstName || user.firstname || '',
        lastName: user.lastName || user.lastname || '',
        role,
        isActive: user.isActive ?? true,
        addedBy: pm.addedBy || pm.addedby || '',
        createdAt: pm.createdAt || pm.created_at || new Date().toISOString(),
      };
    }) as Array<User & { role: string; addedBy: string; createdAt: string }>;
  },

  async addProjectMember(projectId: string, userId: string, role: 'owner' | 'member' | 'viewer' = 'member'): Promise<void> {
    await apiClient.addProjectMember(projectId, { userId, role });
  },

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await apiClient.removeProjectMember(projectId, userId);
  },

  async updateProjectMemberRole(projectId: string, userId: string, role: 'owner' | 'member' | 'viewer'): Promise<void> {
    // No direct endpoint; emulate by remove + add if needed or leave unimplemented.
    // For now, we will re-add the member with the role.
    await apiClient.addProjectMember(projectId, { userId, role });
  },
};

