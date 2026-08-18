/**
 * ModuleNotEnabled
 * Friendly placeholder shown when a paid module is not enabled for the account.
 * Directs the user to enable it from the web admin panel.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface ModuleNotEnabledProps {
  iconName: string;
  moduleName: string;
}

const ModuleNotEnabled: React.FC<ModuleNotEnabledProps> = ({
  iconName,
  moduleName,
}) => {
  return (
    <View style={styles.container}>
      <Icon name={iconName} size={56} color="#d9d9d9" />
      <Text style={styles.title}>{moduleName} Module Not Enabled</Text>
      <Text style={styles.message}>
        The {moduleName} module is not enabled for your account. You can enable
        it from the admin panel on the website (Configuration → Modules).
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

export default ModuleNotEnabled;
