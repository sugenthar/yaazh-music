import api from './api';

class AuthService {
  async register(name, email, password) {
    try {
      const response = await api.post('/api/auth/register', { name, email, password });
      if (response.data?.token) {
        await api.setToken(response.data.token);
      }
      return response.data;
    } catch (e) {
      throw e;
    }
  }

  async login(email, password) {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      if (response.data?.token) {
        await api.setToken(response.data.token);
      }
      return response.data;
    } catch (e) {
      throw e;
    }
  }

  async logout() {
    await api.clearToken();
  }

  async getMe() {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (e) {
      return null;
    }
  }

  async isAuthenticated() {
    const token = await api.getToken();
    return !!token;
  }
}

export default new AuthService();
