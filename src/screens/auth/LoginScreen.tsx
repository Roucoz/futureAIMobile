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
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

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

  const handleOtpRequest = async () => {
    if (!otpEmail.trim()) {
      Alert.alert('Email Required', 'Enter your email to receive a code.');
      return;
    }
    try {
      await authStore.requestOtp(otpEmail);
      setOtpSent(true);
      Alert.alert(
        'Code Sent',
        'Check your email for the one-time sign-in code.',
      );
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send sign-in code';
      console.error('❌ OTP request failed:', errorMessage);
      Alert.alert('Request Failed', errorMessage);
      authStore.clearError();
    }
  };

  const handleOtpVerify = async () => {
    if (!otpCode.trim()) {
      Alert.alert('Missing Code', 'Enter the code you received by email.');
      return;
    }
    try {
      const result = await authStore.loginWithOtp(otpEmail, otpCode);

      if (result.requiresTwoFactor) {
        navigation.navigate('TwoFactor', { userId: result.userId! });
      }
      // If successful, navigation will be handled by RootNavigator
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid sign-in code';
      console.error('❌ OTP verify failed:', errorMessage);
      Alert.alert('Verification Failed', errorMessage);
      authStore.clearError();
    }
  };

  const handleGoogleLogin = () => {
    // Google-linked accounts have no password. Native Google Sign-In requires
    // the SDK + Google Cloud Console setup (still TODO); until then, route
    // Google users to the email-OTP flow: enter their Google account email →
    // receive a 6-digit code → sign in.
    setMode('otp');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Tuxon</Text>
      <Text style={styles.subtitle}>Sign in to manage your conversations</Text>

      {mode === 'password' ? (
        <>
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
            disabled={authStore.loading}
          >
            {authStore.loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('otp')}
            disabled={authStore.loading}
            style={styles.linkContainer}
          >
            <Text style={styles.linkText}>Sign in with email code</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a one-time sign-in code. This
            also works for Google accounts.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={otpEmail}
            onChangeText={setOtpEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!authStore.loading}
          />

          {otpSent ? (
            <>
              <TextInput
                style={styles.codeInput}
                placeholder="000000"
                value={otpCode}
                onChangeText={text => setOtpCode(text.replace(/\D/g, ''))}
                keyboardType="number-pad"
                maxLength={6}
                editable={!authStore.loading}
              />

              <TouchableOpacity
                style={[
                  styles.button,
                  authStore.loading && styles.buttonDisabled,
                ]}
                onPress={handleOtpVerify}
                disabled={authStore.loading}
              >
                {authStore.loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleOtpRequest}
                disabled={authStore.loading}
                style={styles.linkContainer}
              >
                <Text style={styles.resendText}>Resend code</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.button,
                authStore.loading && styles.buttonDisabled,
              ]}
              onPress={handleOtpRequest}
              disabled={authStore.loading}
            >
              {authStore.loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Code</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => {
              setMode('password');
              setOtpSent(false);
              setOtpCode('');
            }}
            disabled={authStore.loading}
            style={styles.linkContainer}
          >
            <Text style={styles.linkText}>Back to password login</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={[
          styles.googleButton,
          authStore.loading && styles.buttonDisabled,
        ]}
        onPress={handleGoogleLogin}
        disabled={authStore.loading}
      >
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
  linkContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#1890ff',
    fontSize: 15,
  },
  resendText: {
    color: '#666',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  codeInput: {
    height: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
  },
});

export default LoginScreen;
