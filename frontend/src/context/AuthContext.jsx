import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import authService from '../api/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Decode token claims for quick role checks
  const getTokenClaims = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      // Check if expired
      if (decoded.exp * 1000 < Date.now()) {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  }, []);

  // Initialize auth state from stored token
  const initAuth = useCallback(async () => {
    setIsLoading(true);
    const claims = getTokenClaims();

    if (!claims) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await authService.getProfile();
      setUser({
        ...profile,
        is_up_member: claims.is_up_member || profile.is_up_member,
        is_chairman: claims.is_chairman || profile.is_chairman,
      });
      setIsAuthenticated(true);
    } catch {
      // Token might be invalid
      authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [getTokenClaims]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (username, password) => {
    const data = await authService.login(username, password);
    const claims = jwtDecode(data.access);

    try {
      const profile = await authService.getProfile();
      setUser({
        ...profile,
        is_up_member: claims.is_up_member || profile.is_up_member,
        is_chairman: claims.is_chairman || profile.is_chairman,
      });
    } catch {
      // Fallback to claims-only user
      setUser({
        username: claims.display_name || username,
        is_up_member: claims.is_up_member,
        is_chairman: claims.is_chairman,
        nid_verified: claims.nid_verified,
      });
    }

    setIsAuthenticated(true);
    return claims;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const isAdmin = user?.is_up_member || user?.is_chairman || false;
  const isChairman = user?.is_chairman || false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isAdmin,
        isChairman,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
