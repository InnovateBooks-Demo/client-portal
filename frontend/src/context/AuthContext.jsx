import React, { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('client_portal_token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('client_portal_token', accessToken);
      fetchUserInfo();
    } else {
      localStorage.removeItem('client_portal_token');
      setLoading(false);
    }
  }, [accessToken]);

  const fetchUserInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/client-portal/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const json = await res.json();
        setUser(json.user);
      } else {
        // Token might be invalid
        setAccessToken('');
      }
    } catch (err) {
      console.error("Failed to fetch user info", err);
    } finally {
      setLoading(false);
    }
  };

  const login = (token) => {
    setAccessToken(token);
  };

  const logout = () => {
    setAccessToken('');
    setUser(null);
    localStorage.removeItem('client_portal_token');
  };

  return (
    <AuthContext.Provider value={{ accessToken, user, loading, login, logout, isAuthenticated: !!accessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
