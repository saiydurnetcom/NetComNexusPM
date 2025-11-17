import { apiClient } from './api-client';
import { authService } from './auth';
import { User } from '../types';

// Users service backed by API
export const usersService = {
  async getUsers(): Promise<User[]> {
    try {
      const users = await apiClient.getUsers();
      return (users || []) as User[];
    } catch {
      return [];
    }
  },

  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await apiClient.getUser(userId);
      return user as User;
    } catch {
      return null;
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    return await authService.getUser();
  },

  // Alias used elsewhere
  async getUser(userId: string): Promise<User | null> {
    return this.getUserById(userId);
  }
};

