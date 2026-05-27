/**
 * Secure Storage Service
 * Uses React Native Keychain for sensitive data
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICE_NAME = 'futureai.mobile';

class SecureStorageService {
  /**
   * Store JWT token securely in Keychain
   */
  async setToken(token: string): Promise<void> {
    try {
      await Keychain.setGenericPassword('jwt', token, {
        service: SERVICE_NAME,
      });
    } catch (error) {
      console.error('Failed to store token:', error);
      throw error;
    }
  }

  /**
   * Retrieve JWT token from Keychain
   */
  async getToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_NAME,
      });
      return credentials ? credentials.password : null;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Remove JWT token from Keychain
   */
  async removeToken(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: SERVICE_NAME,
      });
    } catch (error) {
      console.error('Failed to remove token:', error);
      throw error;
    }
  }

  /**
   * Check if token exists
   */
  async hasToken(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }
}

/**
 * AsyncStorage Service
 * For non-sensitive data
 */
class AsyncStorageService {
  async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Failed to store ${key}:`, error);
      throw error;
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }
}

export const secureStorage = new SecureStorageService();
export const asyncStorage = new AsyncStorageService();
