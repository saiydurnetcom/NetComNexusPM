import { apiClient } from './api';
import { User, AuthResponse } from '../types';

class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'user_data';

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  setAuthData(token: string, user: User): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    apiClient.setToken(token);
  }

  clearAuthData(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    apiClient.setToken('');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.login({ email, password });
      this.setAuthData(response.token, response.user);
      return response;
    } catch (error) {
      this.clearAuthData();
      throw error;
    }
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> {
    try {
      const response = await apiClient.register(data);
      this.setAuthData(response.token, response.user);
      return response;
    } catch (error) {
      this.clearAuthData();
      throw error;
    }
  }

  logout(): void {
    this.clearAuthData();
    window.location.href = '/login';
  }
}

export const authService = new AuthService();