import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/config/api';
import { toast } from 'sonner';

interface User {
  id?: string;
  phone: string;
  full_name?: string;
  role: string;
}

const STORAGE_TOKEN_KEY = 'motofix_token';
const STORAGE_USER_KEY = 'motofix_user';

/**
 * Custom hook for managing authentication state
 * Provides persistent login using localStorage + httpOnly cookies
 * Auto-checks auth on app load via /auth/me endpoint
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Verify token with server by calling /auth/me
   * This ensures token is valid and gets fresh user data
   */
  const checkAuth = useCallback(async () => {
    try {
      // Check if token exists in localStorage
      const token = localStorage.getItem(STORAGE_TOKEN_KEY);
      console.log('🔍 checkAuth: token exists?', !!token);
      
      if (!token) {
        console.log('❌ No token found - not authenticated');
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      console.log('✅ Token found, verifying with /auth/me...');
      // Call /auth/me to verify token and get fresh user data
      const response = await authService.getMe();
      const userData = response.data;
      
      console.log('✅ Auth verification succeeded:', userData);
      setUser(userData);
      setIsAuthenticated(true);
      // Update localStorage with fresh user data
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
    } catch (error: any) {
      console.error('❌ Auth check failed:', error?.response?.status, error?.message);
      // Token is invalid or expired - clear everything
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
      setIsAuthenticated(false);
      setUser(null);
      
      // Show user-friendly error message
      if (error.response?.status === 401) {
        console.log('⚠️ Token expired or invalid');
        toast.error('Session expired – please login again');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * On mount: check for existing token and verify with server
   * This enables persistent login across page reloads
   */
  useEffect(() => {
    console.log('📱 useAuth mounted - checking for existing session...');
    
    // Load from localStorage first for instant UI (avoid flash/flicker)
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const storedUser = localStorage.getItem(STORAGE_USER_KEY);
    
    console.log('🔍 localStorage check: token?', !!storedToken, 'user?', !!storedUser);
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('✅ Loaded cached user:', parsedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        // Leave loading as true, will be set to false after server verification
      } catch (e) {
        console.error('❌ Failed to parse stored user', e);
        localStorage.removeItem(STORAGE_USER_KEY);
      }
    } else {
      console.log('ℹ️ No cached user found');
    }

    // Always verify with server (even if we have cached data)
    // This ensures token is still valid and gets fresh user info
    console.log('🔄 Starting server verification...');
    checkAuth();
  }, [checkAuth]);

  /**
   * Handle login: send OTP and receive JWT token
   * @param phone - User's phone number (formatted)
   * @param otp - One-time password from SMS
   * @param fullName - Optional name for new users
   */
  const login = async (phone: string, otp: string, fullName?: string) => {
    try {
      console.log('🔐 Attempting login with phone:', phone);
      const response = await authService.login(phone, otp, fullName);

      // Backend returns: { access_token, user }
      const { access_token, user: userData } = response.data;
      
      console.log('✅ Login successful');
      console.log('💾 Saving token to localStorage');

      // Save JWT token to localStorage
      // axios interceptor will automatically include it in all API requests
      if (access_token) {
        localStorage.setItem(STORAGE_TOKEN_KEY, access_token);
        console.log('✅ Token saved:', access_token.substring(0, 20) + '...');
      }

      // Persist user info for instant UI
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
      console.log('✅ User saved to localStorage');

      setUser(userData);
      setIsAuthenticated(true);

      return userData;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  /**
   * Handle logout: clear token and user data
   * Calls /auth/logout on server to clear httpOnly cookie
   */
  const logout = () => {
    console.log('🚪 Logout initiated');
    // Clear localStorage
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    console.log('✅ localStorage cleared');
    
    // Clear state
    setUser(null);
    setIsAuthenticated(false);

    // Call server to clear httpOnly cookie (best effort - ignore errors)
    authService.logout().catch((err) => {
      console.error('⚠️ Logout request failed (non-blocking):', err);
    });
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth, // For manual auth checks if needed
  };
}