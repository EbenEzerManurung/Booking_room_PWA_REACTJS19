import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from '../utils/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/auth/me');
      console.log('✅ User fetched:', response.data);
      setUser(response.data);
      sessionStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      sessionStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      console.log('🔐 Login attempt for:', email);
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      console.log('📤 Sending login request to:', axios.defaults.baseURL + '/auth/login');
      
      const response = await axios.post('/auth/login', { 
        email: email.trim(), 
        password: password.trim() 
      });
      
      console.log('✅ Login response status:', response.status);
      console.log('✅ Login response data:', response.data);
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid response from server');
      }
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      sessionStorage.setItem('user', JSON.stringify(user));
      
      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let message = 'Login failed. Please check your credentials.';
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        message = error.response.data?.message || message;
      } else if (error.request) {
        console.error('No response from server');
        message = 'Cannot connect to server. Please make sure backend is running.';
      } else {
        message = error.message || message;
      }
      
      setError(message);
      return { 
        success: false, 
        message 
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      sessionStorage.removeItem('user');
      setUser(null);
    }
  };

  // 🔥🔥🔥 TAMBAHKAN INI: UPDATE USER 🔥🔥🔥
  const updateUser = (userData) => {
    if (userData) {
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
      // Update axios default header jika token berubah
      if (userData.token) {
        localStorage.setItem('token', userData.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      }
      console.log('✅ User updated:', userData);
    }
  };

  // 🔥 TAMBAHKAN INI: REFRESH USER DATA 🔥
  const refreshUser = async () => {
    try {
      const response = await axios.get('/auth/me');
      if (response.data) {
        setUser(response.data);
        sessionStorage.setItem('user', JSON.stringify(response.data));
        console.log('✅ User refreshed:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,     // 🔥 TAMBAHKAN INI
    refreshUser,    // 🔥 TAMBAHKAN INI
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;