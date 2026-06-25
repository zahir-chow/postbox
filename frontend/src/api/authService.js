import api from './api';

export const authService = {
  /**
   * Login with username/password → returns JWT tokens
   */
  async login(username, password) {
    const { data } = await api.post('/auth/login/', { username, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },

  /**
   * Refresh the access token
   */
  async refreshToken() {
    const refresh = localStorage.getItem('refresh_token');
    const { data } = await api.post('/auth/refresh/', { refresh });
    localStorage.setItem('access_token', data.access);
    if (data.refresh) {
      localStorage.setItem('refresh_token', data.refresh);
    }
    return data;
  },

  /**
   * Get authenticated user's profile
   */
  async getProfile() {
    const { data } = await api.get('/auth/profile/');
    return data;
  },

  /**
   * Retrieve one-time auto-generated credentials
   */
  async getCredentials() {
    const { data } = await api.get('/auth/credentials/');
    return data;
  },

  /**
   * Logout — clear tokens
   */
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  /**
   * Check if user has a valid token stored
   */
  isLoggedIn() {
    return !!localStorage.getItem('access_token');
  },
};

export default authService;
