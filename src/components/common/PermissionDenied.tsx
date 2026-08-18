/**
 * PermissionDenied
 * Friendly placeholder shown when the current user does not have the
 * required group permissions to access a feature (403 insufficient
 * permissions). Directs the user to contact their account admin.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface PermissionDeniedProps {
  iconName?: string;
  featureName?: string;
}

const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  iconName = 'lock-closed',
  featureName,
}) => {
  return (
    <View style={styles.container}>
      <Icon name={iconName} size={56} color="#d9d9d9" />
      <Text style={styles.title}>Access Restricted</Text>
      <Text style={styles.message}>
        {featureName
          ? `You don't have permission to access ${featureName}. `
          : `You don't have permission to access this feature. `}
        Please contact your account administrator to request access.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PermissionDenied;
