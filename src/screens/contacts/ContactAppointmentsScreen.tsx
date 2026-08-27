/**
 * Contact Appointments Screen
 * Shows all appointments for a specific contact
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Appointment } from '../../services/api/appointments.service';

interface RouteParams {
  contactName: string;
  appointments: Appointment[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#fa8c16',
  CONFIRMED: '#1890ff',
  COMPLETED: '#52c41a',
  CANCELED: '#8c8c8c',
  NO_SHOW: '#ff4d4f',
};

const ContactAppointmentsScreen = () => {
  const route = useRoute();
  const { contactName, appointments } = route.params as RouteParams;

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const date = new Date(item.appointmentDate);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const statusColor = STATUS_COLORS[item.status] || '#d9d9d9';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.serviceName}>
            {item.service?.name || 'Appointment'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <Icon
            name="calendar"
            size={14}
            color="#666"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.detailText}>
            {dateStr} at {timeStr}
          </Text>
        </View>

        {item.durationMinutes > 0 && (
          <View style={styles.detailsRow}>
            <Icon
              name="time"
              size={14}
              color="#666"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.detailText}>{item.durationMinutes} min</Text>
          </View>
        )}

        {item.customerNotes ? (
          <Text style={styles.notesText} numberOfLines={2}>
            {item.customerNotes}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Appointment History</Text>
          <Text style={styles.headerSubtitle}>{contactName}</Text>
        </View>

        <FlatList
          data={appointments}
          renderItem={renderAppointment}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon
                name="calendar-outline"
                size={64}
                color="#d9d9d9"
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>No appointments found</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  notesText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ContactAppointmentsScreen;
