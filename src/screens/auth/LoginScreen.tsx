/**
 * Login Screen
 * Email/Password login + Google OAuth button
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../stores';

const LoginScreen = observer(() => {
  const navigation = useNavigation();
  const authStore = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const result = await authStore.login(email, password);

      if (result.requiresTwoFactor) {
        navigation.navigate('TwoFactor', { userId: result.userId! });
      }
      // If successful, navigation will be handled by RootNavigator
    } catch (error: any) {
      // Extract clean error message
      const errorMessage = error.message || 'Invalid credentials';
      console.error('❌ Login failed:', errorMessage);
      Alert.alert('Login Failed', errorMessage);
      authStore.clearError();
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth with deep linking
    Alert.alert('Coming Soon', 'Google OAuth will be implemented next');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to FutureAI</Text>
      <Text style={styles.subtitle}>Sign in to manage your conversations</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!authStore.loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!authStore.loading}
      />

      <TouchableOpacity
        style={[styles.button, authStore.loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={authStore.loading}>
        {authStore.loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.googleButton, authStore.loading && styles.buttonDisabled]}
        onPress={handleGoogleLogin}
        disabled={authStore.loading}>
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    height: 50,
    backgroundColor: '#1890ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
