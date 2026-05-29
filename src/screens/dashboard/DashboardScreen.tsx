/**
 * Dashboard Screen
 * Shows KPI cards for agent metrics + upcoming appointments
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useNavigation } from '@react-navigation/native';
import { useAuth, useChat } from '../../stores';
import { appointmentsService, Appointment } from '../../services/api/appointments.service';

const DashboardScreen = observer(() => {
  const navigation = useNavigation();
  const authStore = useAuth();
  const chatStore = useChat();
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsEnabled, setAppointmentsEnabled] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch current agent status first
      await chatStore.fetchAgentStatus();
      
      // Load conversations
      await chatStore.loadConversations('OPEN');
      
      // Load appointments (if module enabled)
      try {
        const todayAppointments = await appointmentsService.getTodayAppointments();
        setAppointments(todayAppointments);
        setAppointmentsEnabled(true);
      } catch (error: any) {
        // Module might not be enabled - this is OK
        if (error.message?.includes('MODULE_APPOINTMENTS')) {
          setAppointmentsEnabled(false);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleStatusToggle = async (value: boolean) => {
    try {
      const newStatus = value ? 'ONLINE' : 'OFFLINE';
      await chatStore.updateAgentStatus(newStatus);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const isOnline = chatStore.currentAgentStatus === 'ONLINE';
  const openChatsCount = chatStore.conversations.filter((c) => c.status === 'OPEN').length;
  const claimedChatsCount = chatStore.claimedChatsCount;
  const requiresAttentionCount = chatStore.escalationCount;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {/* Header */}
        <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome, {authStore.user?.fullName}</Text>
      </View>

      {/* Status Card */}
      <View style={[styles.card, styles.statusCard]}>
        <View style={styles.statusHeader}>
          <View>
            <Text style={styles.cardTitle}>Agent Status</Text>
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleStatusToggle}
            trackColor={{ false: '#d9d9d9', true: '#52c41a' }}
            thumbColor="#fff"
            ios_backgroundColor="#d9d9d9"
            disabled={chatStore.isStatusLoading}
          />
        </View>
        <Text style={styles.statusDescription}>
          {isOnline
            ? 'You are available to receive chats'
            : 'You will not receive new chats'}
        </Text>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        {/* Open Chats */}
        <TouchableOpacity
          style={[styles.kpiCard, styles.kpiCardBlue]}
          onPress={() => navigation.navigate('ConversationList')}>
          <Text style={styles.kpiValue}>{openChatsCount}</Text>
          <Text style={styles.kpiLabel}>Open Chats</Text>
          <Text style={styles.kpiIcon}>💬</Text>
        </TouchableOpacity>

        {/* Claimed Chats */}
        <TouchableOpacity
          style={[styles.kpiCard, styles.kpiCardGreen]}
          onPress={() => navigation.navigate('ConversationList')}>
          <Text style={styles.kpiValue}>{claimedChatsCount}</Text>
          <Text style={styles.kpiLabel}>Claimed by You</Text>
          <Text style={styles.kpiIcon}>👤</Text>
        </TouchableOpacity>

        {/* Requires Attention */}
        <TouchableOpacity
          style={[styles.kpiCard, styles.kpiCardOrange]}
          onPress={() => navigation.navigate('ConversationList')}>
          <Text style={styles.kpiValue}>{requiresAttentionCount}</Text>
          <Text style={styles.kpiLabel}>Needs Attention</Text>
          <Text style={styles.kpiIcon}>⚠️</Text>
        </TouchableOpacity>

        {/* AI Disabled */}
        <TouchableOpacity style={[styles.kpiCard, styles.kpiCardPurple]}>
          <Text style={styles.kpiValue}>{chatStore.aiDisabledCount}</Text>
          <Text style={styles.kpiLabel}>AI Disabled</Text>
          <Text style={styles.kpiIcon}>⏸️</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Appointments */}
      {appointmentsEnabled && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Today's Appointments ({appointments.length})</Text>
          {appointments.length === 0 ? (
            <>
              <Text style={styles.placeholderText}>No appointments scheduled for today</Text>
              <Text style={styles.placeholderSubtext}>
                Appointments will appear here when customers book through AI
              </Text>
            </>
          ) : (
            <View style={styles.appointmentsList}>
              {appointments.slice(0, 5).map((apt) => (
                <View key={apt.id} style={styles.appointmentItem}>
                  <View style={styles.appointmentHeader}>
                    <Text style={styles.appointmentCustomer}>{apt.customerName}</Text>
                    <View
                      style={[
                        styles.appointmentStatusBadge,
                        { backgroundColor: getStatusColor(apt.status) },
                      ]}>
                      <Text style={styles.appointmentStatusText}>{apt.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.appointmentService}>
                    {apt.serviceName} {apt.price ? `- $${apt.price}` : ''}
                  </Text>
                  <Text style={styles.appointmentTime}>
                    🕒 {formatAppointmentTime(apt.appointmentDate)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('ConversationList')}>
          <Text style={styles.quickActionIcon}>💬</Text>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>View All Chats</Text>
            <Text style={styles.quickActionSubtitle}>Manage customer conversations</Text>
          </View>
          <Text style={styles.quickActionArrow}>›</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
});

/**
 * Get status color
 */
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return '#faad14';
    case 'CONFIRMED':
      return '#1890ff';
    case 'COMPLETED':
      return '#52c41a';
    case 'CANCELED':
      return '#ff4d4f';
    case 'NO_SHOW':
      return '#8c8c8c';
    default:
      return '#d9d9d9';
  }
};

/**
 * Format appointment time
 */
const formatAppointmentTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusCard: {
    marginTop: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#52c41a',
    marginTop: 4,
  },
  statusDescription: {
    fontSize: 13,
    color: '#666',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    marginTop: 8,
  },
  kpiCard: {
    width: '47%',
    margin: '1.5%',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  kpiCardBlue: {
    backgroundColor: '#1890ff',
  },
  kpiCardGreen: {
    backgroundColor: '#52c41a',
  },
  kpiCardOrange: {
    backgroundColor: '#fa8c16',
  },
  kpiCardPurple: {
    backgroundColor: '#722ed1',
  },
  kpiValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  kpiIcon: {
    fontSize: 32,
    position: 'absolute',
    right: 16,
    top: 16,
    opacity: 0.3,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quickActionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  quickActionArrow: {
    fontSize: 28,
    color: '#d9d9d9',
  },
  appointmentsList: {
    marginTop: 12,
  },
  appointmentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appointmentCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  appointmentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appointmentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  appointmentService: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  appointmentTime: {
    fontSize: 12,
    color: '#999',
  },
});

export default DashboardScreen;
