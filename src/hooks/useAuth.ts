import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../lib/auth';
import { apiClient } from '../lib/api';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserFromDatabase = useCallback(async (authUser: any) => {
    try {
      // Try to fetch user from users table
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (dbUser && !error) {
        // User exists in users table, use that data
        return {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName || dbUser.first_name || authUser.user_metadata?.firstName || '',
          lastName: dbUser.lastName || dbUser.last_name || authUser.user_metadata?.lastName || '',
          role: dbUser.role || 'member',
          isActive: dbUser.isActive ?? dbUser.is_active ?? true,
          createdAt: dbUser.createdAt || dbUser.created_at || authUser.created_at,
        };
      }
    } catch (error) {
      console.error('Error fetching user from database:', error);
    }

    // Fallback to auth user metadata if users table doesn't have the user
    return {
      id: authUser.id,
      email: authUser.email!,
      firstName: authUser.user_metadata?.firstName || '',
      lastName: authUser.user_metadata?.lastName || '',
      role: authUser.user_metadata?.role || 'member',
      createdAt: authUser.created_at,
    };
  }, []);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userData = await fetchUserFromDatabase(session.user);
        setUser(userData);
        apiClient.setToken(session.access_token ?? null);
      }
      if (!session?.user) {
        apiClient.setToken(null);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const userData = await fetchUserFromDatabase(session.user);
        setUser(userData);
        apiClient.setToken(session.access_token ?? null);
      } else {
        setUser(null);
        apiClient.setToken(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserFromDatabase]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);
      apiClient.setToken(response.token || null);
      // Fetch user from database to get role
      if (response.user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userData = await fetchUserFromDatabase(session.user);
          setUser(userData);
        } else {
          setUser(response.user);
        }
      }
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      apiClient.setToken(response.token || null);
      // Fetch user from database to get role
      if (response.user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userData = await fetchUserFromDatabase(session.user);
          setUser(userData);
        } else {
          setUser(response.user);
        }
      }
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    apiClient.setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userData = await fetchUserFromDatabase(session.user);
      setUser(userData);
    }
  };

  return {
    user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };
};