/**
 * Profile Screen
 * User profile with account information and logout
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../stores';
import { env } from '../../config/env';
import { resolveImageUrl } from '../../utils/imageUrl';
import ScreenBackground from '../../components/common/ScreenBackground';
import { ZoomableImage } from '../../components/common/ZoomableImage';
import { notificationService } from '../../services/notifications/NotificationService';
import { format } from 'date-fns';

const ProfileScreen = observer(() => {
  const authStore = useAuth();
  const navigation = useNavigation();

  // "New customer chat" alerts are a per-DEVICE setting: the same account can
  // alert on a phone and stay quiet on a shared tablet.
  const [alertsNewChats, setAlertsNewChats] = useState(
    notificationService.isNotifyNewConversationsEnabled(),
  );
  const [savingPreference, setSavingPreference] = useState(false);

  useEffect(() => {
    let mounted = true;
    void notificationService.loadNotifyNewConversations().then(enabled => {
      if (mounted) {
        setAlertsNewChats(enabled);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleNewChatAlerts = async (enabled: boolean) => {
    setAlertsNewChats(enabled);
    setSavingPreference(true);
    try {
      await notificationService.setNotifyNewConversations(enabled);
    } finally {
      setSavingPreference(false);
    }
  };

  const InfoRow = ({
    label,
    value,
    iconName,
  }: {
    label: string;
    value: string;
    iconName: string;
  }) => (
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
      <ScreenBackground>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="chevron-back" size={24} color="#1890ff" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Account Information</Text>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Card */}
            <View style={styles.card}>
              {/* Avatar Circle */}
              <View style={styles.avatarContainer}>
                {authStore.user?.avatarUrl ? (
                  <ZoomableImage
                    uri={resolveImageUrl(authStore.user.avatarUrl)!}
                    style={styles.avatarImage}
                    accessibilityLabel="View your profile picture full screen"
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {authStore.user?.firstName?.[0]?.toUpperCase()}
                      {authStore.user?.lastName?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
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
                    value={format(
                      new Date(authStore.user.createdAt),
                      'MMM dd, yyyy',
                    )}
                  />
                )}

                <InfoRow
                  iconName={
                    authStore.user?.twoFactorEnabled
                      ? 'lock-closed'
                      : 'lock-open'
                  }
                  label="Two-Factor Auth"
                  value={
                    authStore.user?.twoFactorEnabled ? 'Enabled' : 'Disabled'
                  }
                />
              </View>
            </View>

            {/* Notification preferences (per device) */}
            <View style={styles.card}>
              <View style={styles.prefRow}>
                <Icon
                  name="notifications-outline"
                  size={20}
                  color="#1890ff"
                  style={styles.icon}
                />
                <View style={styles.prefText}>
                  <Text style={styles.prefTitle}>New customer chat alerts</Text>
                  <Text style={styles.prefHint}>
                    Get notified on this device when a customer starts a new chat
                    on your website — even when the AI answers it.
                  </Text>
                </View>
                <Switch
                  value={alertsNewChats}
                  onValueChange={handleToggleNewChatAlerts}
                  disabled={savingPreference}
                  trackColor={{ false: '#d9d9d9', true: '#91d5ff' }}
                  thumbColor={alertsNewChats ? '#1890ff' : '#f4f3f4'}
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
                <Icon
                  name="log-out"
                  size={20}
                  color="#fff"
                  style={styles.logoutIcon}
                />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>

            {/* App Version + environment.
                Environment/API host are compiled in at build time (see
                src/config/env.target.ts), so this line is the on-device proof of
                which backend this build talks to — useful when TestFlight holds
                both a prod and a dev build. */}
            <Text style={styles.version}>Tuxon Mobile v1.0.0</Text>
            <Text
              style={[
                styles.environment,
                env.appTarget !== 'prod' && styles.environmentNonProd,
              ]}
            >
              {env.appTarget === 'prod'
                ? 'Production'
                : env.appTarget === 'dev'
                ? 'Development'
                : 'Local'}{' '}
              · {env.API_BASE_URL.replace(/^https?:\/\//, '')}
            </Text>
          </ScrollView>
        </View>
      </ScreenBackground>
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
    backgroundColor: 'transparent',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: '#1890ff',
    marginLeft: 2,
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  prefText: {
    flex: 1,
    marginRight: 12,
  },
  prefTitle: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    marginBottom: 4,
  },
  prefHint: {
    fontSize: 13,
    color: '#8c8c8c',
    lineHeight: 18,
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
    color: 'white',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#bfbfbf',
    marginTop: 16,
    marginBottom: 4,
  },
  environment: {
    textAlign: 'center',
    fontSize: 12,
    color: '#bfbfbf',
    marginBottom: 32,
  },
  // Non-production builds get a visible amber tint so nobody mistakes a dev
  // build (dev-api + dev database) for the production app during testing.
  environmentNonProd: {
    color: '#d48806',
    fontWeight: '600',
  },
});

export default ProfileScreen;
