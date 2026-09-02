import ENV from '../constants/config';

const API_BASE_URL = ENV.API_BASE_URL;
const DEFAULT_TIMEOUT_MS = 20000;

export const normalizeError = (value) => {
  try {
    if (value == null) {
      return { name: '', message: '', code: '', status: 0, stack: '' };
    }
    if (typeof value === 'string') {
      return { name: '', message: value, code: '', status: 0, stack: '' };
    }
    if (typeof value === 'number') {
      return { name: '', message: String(value), code: '', status: value, stack: '' };
    }
    const normalized = {
      name: value.name ?? '',
      message: value.message ?? '',
      code: value.code ?? '',
      status: typeof value.status === 'number' ? value.status : 0,
      stack: value.stack ?? '',
    };
    return normalized;
  } catch {
    return { name: '', message: '', code: '', status: 0, stack: '' };
  }
};

export const safeError = (value, prop) => {
  try {
    if (value == null) return undefined;
    return value[prop];
  } catch {
    return undefined;
  }
};

export const errorMessage = (value) => {
  const normalized = normalizeError(value);
  return typeof normalized.message === 'string' && normalized.message.length > 0
    ? normalized.message
    : 'Request failed';
};

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = await this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    try {
      const response = await fetch(url, { ...options, signal: controller.signal, headers });
      const text = await response.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = null;
      }

      if (!response.ok) {
        const serverError = safeError(data, 'error');
        throw {
          status: response.status,
          message: safeError(serverError, 'message') || 'Request failed',
          code: safeError(serverError, 'code') || 'UNKNOWN_ERROR',
        };
      }

      return data;
    } catch (error) {
      const normalized = normalizeError(error);
      if (normalized.status) throw error;
      if (normalized.name === 'AbortError') {
        if (options.signal && safeError(options.signal, 'aborted')) {
          throw { status: 0, message: 'Request aborted', code: 'ABORTED' };
        }
        throw { status: 0, message: 'Request timed out', code: 'TIMEOUT' };
      }
      throw {
        status: 0,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      };
    } finally {
      clearTimeout(timer);
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

  get(endpoint, params, options = {}) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`${endpoint}${query}`, options);
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

export const enableDevErrorLogging = () => {
  const previousHandler = ErrorUtils && typeof ErrorUtils.getGlobalHandler === 'function'
    ? ErrorUtils.getGlobalHandler()
    : null;
  const handler = (error) => {
    const normalized = normalizeError(error);
    try {
      console.error('[Yaazh][RuntimeError] name:', normalized.name);
      console.error('[Yaazh][RuntimeError] message:', normalized.message);
      console.error('[Yaazh][RuntimeError] stack:', normalized.stack);
    } catch {
      // never throw from the logger
    }
    if (previousHandler && previousHandler !== handler) {
      previousHandler(error);
    }
  };
  if (typeof ErrorUtils !== 'undefined' && typeof ErrorUtils.setGlobalHandler === 'function') {
    ErrorUtils.setGlobalHandler(handler);
  }
  return handler;
};

export default new ApiService();