/**
 * Two-Factor Authentication Screen
 * Collects the 6-digit TOTP code (or a backup code) to complete login.
 * Used after password/OTP/Google sign-in when the user has 2FA enabled.
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
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../stores';
import { AuthStackParamList } from '../../navigation/types';

type TwoFactorRouteProp = RouteProp<AuthStackParamList, 'TwoFactor'>;

const TwoFactorScreen = observer(() => {
  const route = useRoute<TwoFactorRouteProp>();
  const authStore = useAuth();
  const { userId } = route.params;

  const [code, setCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Missing Code', 'Please enter your verification code.');
      return;
    }

    try {
      await authStore.completeTwoFactor(userId, code, isBackupCode);
      // On success, RootNavigator automatically switches to the app flow
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error?.message || 'Invalid verification code',
      );
      authStore.clearError();
    }
  };

  const toggleBackupCode = () => {
    setIsBackupCode(prev => !prev);
    setCode('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Two-Factor Authentication</Text>
      <Text style={styles.subtitle}>
        {isBackupCode
          ? 'Enter one of your backup codes'
          : 'Enter the 6-digit code from your authenticator app'}
      </Text>

      <TextInput
        style={styles.codeInput}
        placeholder={isBackupCode ? 'XXXXXXXX' : '000000'}
        value={code}
        onChangeText={text =>
          isBackupCode
            ? setCode(text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
            : setCode(text.replace(/\D/g, ''))
        }
        keyboardType={isBackupCode ? 'default' : 'number-pad'}
        maxLength={isBackupCode ? 8 : 6}
        autoFocus
        editable={!authStore.loading}
      />

      <TouchableOpacity
        style={[styles.button, authStore.loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={authStore.loading}
      >
        {authStore.loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify & Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={toggleBackupCode}
        disabled={authStore.loading}
        style={styles.linkContainer}
      >
        <Text style={styles.linkText}>
          {isBackupCode ? 'Use authenticator code' : 'Use a backup code'}
        </Text>
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
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#1890ff',
    fontSize: 15,
  },
});

export default TwoFactorScreen;
