import { useState, useEffect } from 'react';
import { authService } from '../lib/auth';
import { apiClient } from '../lib/api-client';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        apiClient.setToken(token);
        try {
          const userData = await authService.getUser();
          if (userData) {
            setUser(userData);
          } else {
            // Token might be invalid, clear it
            apiClient.setToken(null);
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          // Token might be invalid, clear it
          apiClient.setToken(null);
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
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
      setUser(response.user);
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getUser();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      // User might not be authenticated
      setUser(null);
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
