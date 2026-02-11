import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

/**
 * Auth Context
 * จัดการ authentication state และ functions
 */
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('elegance_user');
    const storedToken = localStorage.getItem('elegance_token');
    
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Error parsing stored user:', err);
        localStorage.removeItem('elegance_user');
        localStorage.removeItem('elegance_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      // Call real API: POST /auth/login
      const response = await authAPI.login(username, password);
      
      // Check if login was successful
      if (response.status !== 'success') {
        return { 
          success: false, 
          error: response.message || 'Login failed' 
        };
      }
      
      // Extract token from response.data
      const token = response.data?.token;
      
      if (!token) {
        return { 
          success: false, 
          error: 'No token received from server' 
        };
      }
      
      // Create user data from response
        const userData = {
        username: response.data?.username || username,
        name: response.data?.username || username,
        token: token,
        };

        setUser(userData);
        localStorage.setItem('elegance_user', JSON.stringify(userData));
      localStorage.setItem('elegance_token', token);
        
        return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle API error response
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Login failed. Please check your credentials.';
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('elegance_user');
    localStorage.removeItem('elegance_token');
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

