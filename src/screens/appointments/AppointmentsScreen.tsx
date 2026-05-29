/**
 * Appointments Screen
 * View and manage appointments
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useAppointment } from '../../stores';
import { format } from 'date-fns';
import AppointmentFormModal from './AppointmentFormModal';
import AppointmentDetailsModal from './AppointmentDetailsModal';
import WeekViewScreen from './WeekViewScreen';

// Status colors
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#fa8c16',
  CONFIRMED: '#1890ff',
  COMPLETED: '#52c41a',
  CANCELED: '#f5222d',
  NO_SHOW: '#8c8c8c',
};

// Status labels
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELED: 'Canceled',
  NO_SHOW: 'No Show',
};

// Status icons (emoji)
const STATUS_ICONS: Record<string, string> = {
  PENDING: '🟠',
  CONFIRMED: '🔵',
  COMPLETED: '🟢',
  CANCELED: '🔴',
  NO_SHOW: '⚫',
};

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELED', label: 'Canceled' },
];

const AppointmentsScreen = observer(() => {
  const appointmentStore = useAppointment();
  const [refreshing, setRefreshing] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      // Always fetch all appointments, filtering happens in the store
      await appointmentStore.fetchAppointments();
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const handleStatusFilter = (status: string) => {
    appointmentStore.setStatusFilter(status);
  };

  const handleDateFilter = () => {
    // TODO: Show date picker modal
    // For now, showing a placeholder alert
    alert('Date filter coming soon!');
  };

  const clearDateFilter = () => {
    appointmentStore.clearDateRange();
  };

  const renderAppointmentCard = ({ item }: any) => {
    const appointmentDate = new Date(item.appointmentDate);
    const isUpcoming = appointmentDate >= new Date();

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => handleViewAppointment(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateDay}>{format(appointmentDate, 'dd')}</Text>
            <Text style={styles.dateMonth}>{format(appointmentDate, 'MMM')}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.serviceName}>{item.service.name}</Text>
            <Text style={styles.time}>
              {format(appointmentDate, 'h:mm a')}
              {item.service.price && ` • $${item.service.price}`}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
            <Text style={styles.statusIcon}>{STATUS_ICONS[item.status]}</Text>
          </View>
        </View>

        {item.customerPhone && (
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>📱</Text>
            <Text style={styles.contactText}>{item.customerPhone}</Text>
          </View>
        )}

        {item.customerEmail && (
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>✉️</Text>
            <Text style={styles.contactText}>{item.customerEmail}</Text>
          </View>
        )}

        {item.customerNotes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>📝 Customer Notes:</Text>
            <Text style={styles.notesText}>{item.customerNotes}</Text>
          </View>
        )}

        {item.internalNotes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>🔒 Internal Notes:</Text>
            <Text style={styles.notesText}>{item.internalNotes}</Text>
          </View>
        )}

        {/* Status label */}
        <View style={styles.cardFooter}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
          {isUpcoming && (
            <Text style={styles.upcomingBadge}>⏰ Upcoming</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleViewAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
    setSelectedDate(undefined);
    setShowFormModal(true);
  };

  const handleCreateAppointmentForDate = (date?: Date) => {
    setSelectedAppointment(null);
    setSelectedDate(date);
    setShowFormModal(true);
  };

  const handleEditAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(false);
    setShowFormModal(true);
  };

  const handleFormSuccess = () => {
    loadAppointments();
  };

  const renderEmpty = () => {
    if (appointmentStore.loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#1890ff" />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>No Appointments</Text>
        <Text style={styles.emptyText}>
          {appointmentStore.selectedStatus && appointmentStore.selectedStatus !== 'ALL'
            ? `No ${appointmentStore.selectedStatus.toLowerCase()} appointments found`
            : 'No appointments scheduled yet'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Appointments</Text>
          <Text style={styles.subtitle}>
            {appointmentStore.filteredAppointments.length} total
          </Text>
        </View>
        
        {/* Date Filter Button */}
        <TouchableOpacity 
          style={styles.dateFilterButton}
          onPress={handleDateFilter}
        >
          <Text style={styles.dateFilterIcon}>📅</Text>
        </TouchableOpacity>
        
        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
              📋
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'week' && styles.toggleButtonActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>
              📅
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Show filters only in list view */}
      {viewMode === 'list' && (
        <>
          {/* Status Filter Tabs */}
          <View style={styles.filterContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={STATUS_FILTERS}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => {
                const isSelected = appointmentStore.selectedStatus === item.key || 
                                 (!appointmentStore.selectedStatus && item.key === 'ALL');
                const count = appointmentStore.getStatusCount(item.key);

                return (
                  <TouchableOpacity
                    style={[styles.filterTab, isSelected && styles.filterTabActive]}
                    onPress={() => handleStatusFilter(item.key)}
                  >
                    <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                      {item.label} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Error Message */}
          {appointmentStore.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>❌ {appointmentStore.error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadAppointments}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Content based on view mode */}
      {viewMode === 'list' ? (
        <FlatList
          data={appointmentStore.filteredAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointmentCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1890ff']} />
          }
        />
      ) : (
        <WeekViewScreen
          onAppointmentPress={handleViewAppointment}
          onAddAppointment={handleCreateAppointmentForDate}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateAppointment}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Form Modal */}
      <AppointmentFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
        appointment={selectedAppointment}
        preselectedDate={selectedDate}
        onSuccess={handleFormSuccess}
      />

      {/* Details Modal */}
      <AppointmentDetailsModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        appointment={selectedAppointment}
        onEdit={handleEditAppointment}
        onSuccess={handleFormSuccess}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerLeft: {
    flex: 1,
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
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f9',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 20,
    opacity: 0.5,
  },
  toggleTextActive: {
    opacity: 1,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#1890ff',
  },
  filterText: {
    fontSize: 14,
    color: '#595959',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f5f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  dateMonth: {
    fontSize: 12,
    color: '#8c8c8c',
    textTransform: 'uppercase',
  },
  cardInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: '#595959',
    marginBottom: 2,
  },
  time: {
    fontSize: 13,
    color: '#8c8c8c',
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 20,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#595959',
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1890ff',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#595959',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  upcomingBadge: {
    fontSize: 12,
    color: '#52c41a',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8c8c8c',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  errorContainer: {
    backgroundColor: '#fff2e8',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#fa8c16',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#d4380d',
  },
  retryButton: {
    backgroundColor: '#fa8c16',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1890ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  dateFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateFilterIcon: {
    fontSize: 20,
  },
});

export default AppointmentsScreen;
