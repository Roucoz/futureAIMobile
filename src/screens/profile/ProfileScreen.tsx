/**
 * Profile Screen
 * User profile with account information and logout
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../stores';
import { format } from 'date-fns';

const ProfileScreen = observer(() => {
  const authStore = useAuth();

  const InfoRow = ({ label, value, iconName }: { label: string; value: string; iconName: string }) => (
    <View style={styles.infoRow}>
      <Icon name={iconName} size={20} color="#1890ff" style={styles.icon} />
      <View style={styles.infoContent}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Account Information</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <View style={styles.card}>
            {/* Avatar Circle */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {authStore.user?.firstName?.[0]?.toUpperCase()}
                  {authStore.user?.lastName?.[0]?.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.fullName}>{authStore.user?.fullName}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{authStore.user?.role}</Text>
              </View>
            </View>

            {/* Info Rows */}
            <View style={styles.infoContainer}>
              <InfoRow 
                iconName="mail" 
                label="Email" 
                value={authStore.user?.email || 'N/A'} 
              />
              
              <InfoRow 
                iconName="person" 
                label="First Name" 
                value={authStore.user?.firstName || 'N/A'} 
              />
              
              <InfoRow 
                iconName="person-outline" 
                label="Last Name" 
                value={authStore.user?.lastName || 'N/A'} 
              />
              
              <InfoRow 
                iconName="business" 
                label="Project ID" 
                value={authStore.user?.projectId || 'N/A'} 
              />

              {authStore.user?.createdAt && (
                <InfoRow 
                  iconName="calendar" 
                  label="Member Since" 
                  value={format(new Date(authStore.user.createdAt), 'MMM dd, yyyy')} 
                />
              )}

              <InfoRow 
                iconName={authStore.user?.twoFactorEnabled ? "lock-closed" : "lock-open"} 
                label="Two-Factor Auth" 
                value={authStore.user?.twoFactorEnabled ? 'Enabled' : 'Disabled'} 
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={() => authStore.logout()}
              activeOpacity={0.8}
            >
              <Icon name="log-out" size={20} color="#fff" style={styles.logoutIcon} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* App Version */}
          <Text style={styles.version}>Future AI Mobile v1.0.0</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f9',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#8c8c8c',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1890ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#595959',
    textTransform: 'uppercase',
  },
  infoContainer: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  icon: {
    marginRight: 12,
    width: 32,
    marginTop: 4,
  },
  infoContent: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#8c8c8c',
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  actions: {
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: '#f5222d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#f5222d',
    color: "white"
    
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#bfbfbf',
    marginTop: 16,
    marginBottom: 32,
  },
});

export default ProfileScreen;
