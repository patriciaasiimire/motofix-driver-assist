import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/config/api';

interface User {
  id?: string;
  phone: string;
  full_name?: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('motofix_token');

    if (!token) {
      setIsLoading(false);
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    try {
      const response = await authService.getMe();
      const userData = response.data;
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('motofix_user', JSON.stringify(userData));
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem('motofix_token');
      localStorage.removeItem('motofix_user');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load from localStorage first for instant UI (avoid flash)
    const storedUser = localStorage.getItem('motofix_user');
    const token = localStorage.getItem('motofix_token');

    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem('motofix_user');
      }
    }

    // Always verify with server
    checkAuth();
  }, [checkAuth]);

  const login = async (phone: string, otp: string, fullName?: string) => {
    try {
      const response = await authService.login(phone, otp, fullName);
      const { access_token } = response.data;

      // Some backends return user in response.data, some in response.data.user
      // Adjust based on your actual API response
      const userData = response.data.user || response.data;

      localStorage.setItem('motofix_token', access_token);
      localStorage.setItem('motofix_user', JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      return userData;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('motofix_token');
    localStorage.removeItem('motofix_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
  };
}