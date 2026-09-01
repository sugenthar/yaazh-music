import ENV from '../constants/config';

const API_BASE_URL = ENV.API_BASE_URL;

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = await this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.error?.message || 'Request failed',
          code: data.error?.code || 'UNKNOWN_ERROR',
        };
      }

      return data;
    } catch (error) {
      if (error.status) throw error;
      throw {
        status: 0,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      };
    }
  }

  async getToken() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem('auth_token');
    } catch {
      return null;
    }
  }

  async setToken(token) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('auth_token', token);
    } catch (e) {
      console.error('Failed to save token:', e);
    }
  }

  async clearToken() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('auth_token');
    } catch (e) {
      console.error('Failed to clear token:', e);
    }
  }

  get(endpoint, params) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`${endpoint}${query}`);
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new ApiService();
