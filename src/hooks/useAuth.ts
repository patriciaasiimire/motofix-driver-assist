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
      return;
    }

    try {
      const response = await authService.getMe();
      const userData = response.data;
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('motofix_user', JSON.stringify(userData));
    } catch (error) {
      localStorage.removeItem('motofix_token');
      localStorage.removeItem('motofix_user');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Try to load from localStorage first for faster initial load
    const storedUser = localStorage.getItem('motofix_user');
    const token = localStorage.getItem('motofix_token');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    
    checkAuth();
  }, [checkAuth]);

  const login = async (phone: string, otp: string, fullName?: string) => {
    const response = await authService.login(phone, otp, fullName);
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('motofix_token', access_token);
    localStorage.setItem('motofix_user', JSON.stringify(userData));
    
    setUser(userData);
    setIsAuthenticated(true);
    
    return userData;
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
