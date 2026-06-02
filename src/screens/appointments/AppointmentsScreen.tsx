/**
 * Appointments Screen
 * View and manage appointments
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppointment } from '../../stores';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
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

// Status icons
const STATUS_ICON_NAMES: Record<string, string> = {
  PENDING: 'time',
  CONFIRMED: 'checkmark-circle',
  COMPLETED: 'checkmark-done-circle',
  CANCELED: 'close-circle',
  NO_SHOW: 'alert-circle',
};

const STATUS_FILTERS = [
  { key: 'date', label: 'History', iconName: 'time' },
  { key: 'ALL', label: 'All', iconName: 'list' },
  { key: 'PENDING', label: 'Pending', iconName: 'time' },
  { key: 'CONFIRMED', label: 'Confirmed', iconName: 'checkmark-circle' },
  { key: 'COMPLETED', label: 'Completed', iconName: 'checkmark-done-circle' },
  { key: 'CANCELED', label: 'Canceled', iconName: 'close-circle' },
  { key: 'NO_SHOW', label: 'No Show', iconName: 'alert-circle' },
];

const AppointmentsScreen = observer(() => {
  const appointmentStore = useAppointment();
  const [refreshing, setRefreshing] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [tempFromDate, setTempFromDate] = useState<Date>(new Date());
  const [tempToDate, setTempToDate] = useState<Date>(new Date());
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);

  const loadAppointments = useCallback(async () => {
    try {
      // Always fetch all appointments, filtering happens in the store
      await appointmentStore.fetchAppointments();
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  }, [appointmentStore]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const handleStatusFilter = (status: string) => {
    if (status === 'date') {
      handleDateFilter();
      return;
    }
    appointmentStore.setStatusFilter(status);
  };

  const handleDateFilter = () => {
    // Initialize with current filter or defaults
    if (appointmentStore.dateRangeFrom) {
      setTempFromDate(new Date(appointmentStore.dateRangeFrom));
    } else {
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - 30);
      setTempFromDate(defaultFrom);
    }
    if (appointmentStore.dateRangeTo) {
      setTempToDate(new Date(appointmentStore.dateRangeTo));
    } else {
      setTempToDate(new Date());
    }
    setActivePicker(null);
    setShowDateFilterModal(true);
  };

  const applyDateFilter = () => {
    // Ensure from <= to
    const from = tempFromDate <= tempToDate ? tempFromDate : tempToDate;
    const to = tempFromDate <= tempToDate ? tempToDate : tempFromDate;
    appointmentStore.setDateRange(
      from.toISOString().split('T')[0],
      to.toISOString().split('T')[0],
    );
    setShowDateFilterModal(false);
  };

  const clearDateFilter = () => {
    appointmentStore.clearDateRange();
    setShowDateFilterModal(false);
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
            <Text style={styles.dateMonth}>
              {format(appointmentDate, 'MMM')}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.serviceName}>{item.service.name}</Text>
            <Text style={styles.time}>
              {format(appointmentDate, 'h:mm a')}
              {item.service.price && ` • $${item.service.price}`}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[item.status] },
            ]}
          >
            <Icon
              name={STATUS_ICON_NAMES[item.status]}
              size={20}
              color="#fff"
            />
          </View>
        </View>

        {item.customerPhone && (
          <View style={styles.contactInfo}>
            <Icon
              name="call"
              size={16}
              color="#1890ff"
              style={styles.contactIcon}
            />
            <Text style={styles.contactText}>{item.customerPhone}</Text>
          </View>
        )}

        {item.customerEmail && (
          <View style={styles.contactInfo}>
            <Icon
              name="mail"
              size={16}
              color="#1890ff"
              style={styles.contactIcon}
            />
            <Text style={styles.contactText}>{item.customerEmail}</Text>
          </View>
        )}

        {item.customerNotes && (
          <View style={styles.notesContainer}>
            <View style={styles.notesLabelRow}>
              <Icon name="document-text" size={16} color="#666" />
              <Text style={styles.notesLabel}>Customer Notes:</Text>
            </View>
            <Text style={styles.notesText}>{item.customerNotes}</Text>
          </View>
        )}

        {item.internalNotes && (
          <View style={styles.notesContainer}>
            <View style={styles.notesLabelRow}>
              <Icon name="lock-closed" size={16} color="#666" />
              <Text style={styles.notesLabel}>Internal Notes:</Text>
            </View>
            <Text style={styles.notesText}>{item.internalNotes}</Text>
          </View>
        )}

        {/* Status label */}
        <View style={styles.cardFooter}>
          <Text
            style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}
          >
            {STATUS_LABELS[item.status]}
          </Text>
          {isUpcoming && (
            <View style={styles.upcomingBadge}>
              <Icon name="time" size={14} color="#fa8c16" />
              <Text style={styles.upcomingText}>Upcoming</Text>
            </View>
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
        <Icon
          name="calendar"
          size={64}
          color="#d9d9d9"
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyTitle}>No Appointments</Text>
        <Text style={styles.emptyText}>
          {appointmentStore.selectedStatus &&
          appointmentStore.selectedStatus !== 'ALL'
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
            {appointmentStore.dateRangeFrom
              ? `${appointmentStore.filteredAppointments.length} in range`
              : `${appointmentStore.filteredAppointments.length} upcoming`}
          </Text>
        </View>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'list' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('list')}
          >
            <Icon
              name="list"
              size={24}
              color={viewMode === 'list' ? '#1890ff' : '#999'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'week' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('week')}
          >
            <Icon
              name="calendar"
              size={24}
              color={viewMode === 'week' ? '#1890ff' : '#999'}
            />
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
              keyExtractor={item => item.key}
              renderItem={({ item }) => {
                const isDateFilter = item.key === 'date';
                const isDateActive =
                  isDateFilter &&
                  !!(
                    appointmentStore.dateRangeFrom &&
                    appointmentStore.dateRangeTo
                  );
                const isSelected =
                  isDateActive ||
                  appointmentStore.selectedStatus === item.key ||
                  (!appointmentStore.selectedStatus && item.key === 'ALL');
                const count = isDateFilter
                  ? ''
                  : appointmentStore.getStatusCount(item.key);
                const statusColor = isDateFilter
                  ? '#1890ff'
                  : item.key === 'ALL'
                  ? '#595959'
                  : STATUS_COLORS[item.key] || '#595959';
                const isGraySelected = isDateActive;

                return (
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      isSelected && !isGraySelected && styles.filterTabActive,
                      isSelected &&
                        !isGraySelected && {
                          backgroundColor: STATUS_COLORS[item.key] || '#1890ff',
                        },
                      isGraySelected && styles.filterTabGrayActive,
                    ]}
                    onPress={() => handleStatusFilter(item.key)}
                  >
                    <Icon
                      name={item.iconName || 'calendar'}
                      size={14}
                      color={
                        isSelected && !isGraySelected ? '#fff' : statusColor
                      }
                    />
                    <Text
                      style={[
                        styles.filterText,
                        isSelected &&
                          !isGraySelected &&
                          styles.filterTextActive,
                        isGraySelected && styles.filterTextGrayActive,
                      ]}
                    >
                      {item.label} {count !== '' && `(${count})`}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Error Message */}
          {appointmentStore.error && (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={20} color="#d4380d" />
              <Text style={styles.errorText}>{appointmentStore.error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadAppointments}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Active Date Filter Indicator */}
          {appointmentStore.dateRangeFrom && appointmentStore.dateRangeTo && (
            <View style={styles.dateFilterActiveBanner}>
              <View style={styles.dateFilterActiveLeft}>
                <Icon name="time" size={16} color="#1890ff" />
                <Text style={styles.dateFilterActiveText}>
                  Appointments history from{' '}
                  {format(new Date(appointmentStore.dateRangeFrom), 'MMM dd')}{' '}
                  to{' '}
                  {format(
                    new Date(appointmentStore.dateRangeTo),
                    'MMM dd, yyyy',
                  )}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => appointmentStore.clearDateRange()}
                style={styles.dateFilterClearBtn}
              >
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Content based on view mode */}
      {viewMode === 'list' ? (
        <FlatList
          data={appointmentStore.filteredAppointments}
          keyExtractor={item => item.id}
          renderItem={renderAppointmentCard}
          ListEmptyComponent={renderEmpty}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Icon
                name={appointmentStore.dateRangeFrom ? 'time' : 'calendar'}
                size={18}
                color={appointmentStore.dateRangeFrom ? '#595959' : '#1890ff'}
              />
              <Text style={styles.sectionTitle}>
                {appointmentStore.dateRangeFrom
                  ? 'Appointments History'
                  : 'My Next Appointments'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1890ff']}
            />
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

      {/* Date Filter Modal */}
      <Modal
        visible={showDateFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDateFilterModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDateFilterModal(false)}>
          <View style={styles.dateFilterOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.dateFilterModal}>
                {/* Header */}
                <View style={styles.dateFilterHeader}>
                  <Text style={styles.dateFilterTitle}>
                    Appointments History
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDateFilterModal(false)}
                  >
                    <Icon name="close" size={24} color="#999" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.dateFilterBody}
                  showsVerticalScrollIndicator={false}
                >
                  {/* From Date */}
                  <Text style={styles.dateFilterLabel}>From</Text>
                  <TouchableOpacity
                    style={[
                      styles.dateField,
                      activePicker === 'from' && styles.dateFieldActive,
                    ]}
                    onPress={() =>
                      setActivePicker(activePicker === 'from' ? null : 'from')
                    }
                  >
                    <Icon name="calendar" size={20} color="#1890ff" />
                    <Text style={styles.dateFieldText}>
                      {format(tempFromDate, 'MMM dd, yyyy')}
                    </Text>
                    <Icon
                      name={
                        activePicker === 'from' ? 'chevron-up' : 'chevron-down'
                      }
                      size={18}
                      color="#999"
                      style={styles.dateFieldChevron}
                    />
                  </TouchableOpacity>
                  {activePicker === 'from' && (
                    <View style={styles.pickerContainer}>
                      <DateTimePicker
                        value={tempFromDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_event, pickedDate) => {
                          if (pickedDate) {
                            setTempFromDate(pickedDate);
                            if (pickedDate > tempToDate) {
                              setTempToDate(pickedDate);
                            }
                          }
                          if (Platform.OS === 'android') {
                            setActivePicker(null);
                          }
                        }}
                        themeVariant="light"
                      />
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={styles.pickerDoneBtn}
                          onPress={() => setActivePicker(null)}
                        >
                          <Text style={styles.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* To Date */}
                  <Text
                    style={[
                      styles.dateFilterLabel,
                      styles.dateFilterLabelSpaced,
                    ]}
                  >
                    To
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dateField,
                      activePicker === 'to' && styles.dateFieldActive,
                    ]}
                    onPress={() =>
                      setActivePicker(activePicker === 'to' ? null : 'to')
                    }
                  >
                    <Icon name="calendar" size={20} color="#1890ff" />
                    <Text style={styles.dateFieldText}>
                      {format(tempToDate, 'MMM dd, yyyy')}
                    </Text>
                    <Icon
                      name={
                        activePicker === 'to' ? 'chevron-up' : 'chevron-down'
                      }
                      size={18}
                      color="#999"
                      style={styles.dateFieldChevron}
                    />
                  </TouchableOpacity>
                  {activePicker === 'to' && (
                    <View style={styles.pickerContainer}>
                      <DateTimePicker
                        value={tempToDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_event, pickedDate) => {
                          if (pickedDate) {
                            setTempToDate(pickedDate);
                          }
                          if (Platform.OS === 'android') {
                            setActivePicker(null);
                          }
                        }}
                        minimumDate={tempFromDate}
                        themeVariant="light"
                      />
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={styles.pickerDoneBtn}
                          onPress={() => setActivePicker(null)}
                        >
                          <Text style={styles.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Current Active Filter Info */}
                  {appointmentStore.dateRangeFrom &&
                    appointmentStore.dateRangeTo && (
                      <View style={styles.currentFilterInfo}>
                        <Icon
                          name="information-circle"
                          size={16}
                          color="#fa8c16"
                        />
                        <Text style={styles.currentFilterText}>
                          Current history:{' '}
                          {format(
                            new Date(appointmentStore.dateRangeFrom),
                            'MMM dd',
                          )}{' '}
                          —{' '}
                          {format(
                            new Date(appointmentStore.dateRangeTo),
                            'MMM dd, yyyy',
                          )}
                        </Text>
                      </View>
                    )}
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.dateFilterActions}>
                  <TouchableOpacity
                    style={styles.dateFilterClearButton}
                    onPress={clearDateFilter}
                  >
                    <Text style={styles.dateFilterClearText}>Clear Filter</Text>
                  </TouchableOpacity>
                  <View style={styles.dateFilterActionRight}>
                    <TouchableOpacity
                      style={styles.dateFilterCancelButton}
                      onPress={() => setShowDateFilterModal(false)}
                    >
                      <Text style={styles.dateFilterCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dateFilterApplyButton}
                      onPress={applyDateFilter}
                    >
                      <Text style={styles.dateFilterApplyText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterTabActive: {
    backgroundColor: '#1890ff',
  },
  filterTabGrayActive: {
    backgroundColor: '#f0f0f0',
  },
  filterTabOutline: {
    borderWidth: 0,
  },
  filterText: {
    fontSize: 14,
    color: '#595959',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterTextGrayActive: {
    color: '#1a1a1a',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
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
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactIcon: {
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
  notesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#595959',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7e6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  upcomingText: {
    fontSize: 12,
    color: '#fa8c16',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
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
    gap: 8,
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
  // Date Filter Active Banner
  dateFilterActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#91d5ff',
  },
  dateFilterActiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  dateFilterActiveText: {
    fontSize: 13,
    color: '#1890ff',
    fontWeight: '500',
  },
  dateFilterClearBtn: {
    padding: 4,
  },
  // Date Filter Modal
  dateFilterOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  dateFilterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34, // Safe area for home indicator
  },
  dateFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateFilterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  dateFilterBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dateFilterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8c8c8c',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateFilterLabelSpaced: {
    marginTop: 20,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 10,
  },
  dateFieldActive: {
    borderColor: '#1890ff',
    backgroundColor: '#e6f7ff',
  },
  dateFieldText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 1,
  },
  dateFieldChevron: {
    marginLeft: 'auto' as any,
  },
  pickerContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerDoneBtn: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  pickerDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1890ff',
  },
  currentFilterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7e6',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#fa8c16',
    gap: 6,
  },
  currentFilterText: {
    fontSize: 13,
    color: '#595959',
    flex: 1,
  },
  dateFilterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dateFilterClearButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dateFilterClearText: {
    fontSize: 15,
    color: '#f5222d',
    fontWeight: '600',
  },
  dateFilterActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateFilterCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dateFilterCancelText: {
    fontSize: 15,
    color: '#8c8c8c',
    fontWeight: '500',
  },
  dateFilterApplyButton: {
    backgroundColor: '#1890ff',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  dateFilterApplyText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});

export default AppointmentsScreen;
