/**
 * API Client (Axios Instance)
 * Handles authentication, request/response interceptors
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '../../config/env';
import { API_TIMEOUT } from '../../config/constants';
import { secureStorage } from '../storage/SecureStorageService';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add JWT token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await secureStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Clear token and trigger logout
      await secureStorage.removeToken();
      
      // Emit logout event (will be handled by AuthStore)
      // You can use EventEmitter or a global callback here
      console.log('Token expired - redirecting to login');
      
      // Don't retry the request
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        originalError: error,
      });
    }

    // Handle other errors
    const errorData = error.response?.data;
    const errorMessage = errorData?.error || errorData?.message || error.message;
    console.error('API error:', errorMessage);

    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
      data: errorData,
      originalError: error,
    });
  }
);

export default apiClient;
