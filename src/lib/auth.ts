import { apiClient } from './api-client';
import { User, AuthResponse } from '../types';

class AuthService {
  private userKey = 'user_data';

  async getUser(): Promise<User | null> {
    try {
      const user = await apiClient.getProfile();
      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role || 'member',
        createdAt: user.createdAt,
      };
    } catch (error) {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const response = await apiClient.login(normalizedEmail, password);
    
    const user: User = {
      id: response.user.id,
      email: response.user.email,
      firstName: response.user.firstName,
      lastName: response.user.lastName,
      role: response.user.role || 'member',
      createdAt: response.user.createdAt,
    };

    localStorage.setItem(this.userKey, JSON.stringify(user));

    return {
      token: response.token,
      user,
    };
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const response = await apiClient.register({ ...data, email: normalizedEmail });

    const user: User = {
      id: response.user.id,
      email: response.user.email,
      firstName: response.user.firstName,
      lastName: response.user.lastName,
      role: response.user.role || 'member',
      createdAt: response.user.createdAt,
    };

    localStorage.setItem(this.userKey, JSON.stringify(user));

    return {
      token: response.token,
      user,
    };
  }

  async logout(): Promise<void> {
    apiClient.setToken(null);
    localStorage.removeItem(this.userKey);
    window.location.href = '/login';
  }
}

export const authService = new AuthService();