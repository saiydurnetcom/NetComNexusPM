import { supabase } from './supabase';
import { User } from '../types';

// Service to fetch users from Supabase auth
// Note: Without a users table or admin access, we can only get the current user
// In a production app, you'd create a users table synced with auth.users
export const usersService = {
  async getUsers(): Promise<User[]> {
    // For now, we can only get the current user
    // In a real app, you'd have a users table that syncs with auth.users
    const current = await this.getCurrentUser();
    return current ? [current] : [];
  },

  async getUserById(userId: string): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    // For now, we can only get the current user's info
    // To get other users, we'd need a users table or admin access
    if (user.id === userId) {
      return {
        id: user.id,
        email: user.email || '',
        firstName: user.user_metadata?.firstName || '',
        lastName: user.user_metadata?.lastName || '',
        role: user.user_metadata?.role || 'member',
        isActive: true,
        createdAt: user.created_at,
      };
    }

    return null;
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email || '',
      firstName: user.user_metadata?.firstName || '',
      lastName: user.user_metadata?.lastName || '',
      role: user.user_metadata?.role || 'member',
      isActive: true,
      createdAt: user.created_at,
    };
  },
};

