/**
 * Appointment Details Modal
 * View appointment details and update status
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useAppointment } from '../../stores';
import { format } from 'date-fns';

interface AppointmentDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  appointment: any;
  onEdit: (appointment: any) => void;
  onSuccess?: () => void;
}

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

const STATUS_ICONS: Record<string, string> = {
  PENDING: '🟠',
  CONFIRMED: '🔵',
  COMPLETED: '🟢',
  CANCELED: '🔴',
  NO_SHOW: '⚫',
};

const STATUS_OPTIONS = [
  { key: 'PENDING', label: 'Pending', icon: '🟠' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: '🔵' },
  { key: 'COMPLETED', label: 'Completed', icon: '🟢' },
  { key: 'CANCELED', label: 'Canceled', icon: '🔴' },
  { key: 'NO_SHOW', label: 'No Show', icon: '⚫' },
];

const AppointmentDetailsModal = observer(({
  visible,
  onClose,
  appointment,
  onEdit,
  onSuccess,
}: AppointmentDetailsModalProps) => {
  const appointmentStore = useAppointment();
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!appointment) return null;

  const appointmentDate = new Date(appointment.appointmentDate);
  const isUpcoming = appointmentDate >= new Date();

  const handleStatusChange = async (newStatus: string) => {
    Alert.alert(
      'Change Status',
      `Change appointment status to ${STATUS_LABELS[newStatus]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              await appointmentStore.updateAppointmentStatus(appointment.id, newStatus as any);
              Alert.alert('Success', 'Status updated successfully');
              onSuccess?.();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update status');
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ]
    );
  };

  const handleCall = () => {
    if (appointment.customerPhone) {
      Linking.openURL(`tel:${appointment.customerPhone}`);
    }
  };

  const handleEmail = () => {
    if (appointment.customerEmail) {
      Linking.openURL(`mailto:${appointment.customerEmail}`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Appointment Details</Text>
          <TouchableOpacity onPress={() => onEdit(appointment)} style={styles.editButton}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Badge */}
          <View style={[styles.statusBanner, { backgroundColor: STATUS_COLORS[appointment.status] }]}>
            <Text style={styles.statusBannerIcon}>{STATUS_ICONS[appointment.status]}</Text>
            <Text style={styles.statusBannerText}>{STATUS_LABELS[appointment.status]}</Text>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Date & Time</Text>
            <View style={styles.dateTimeCard}>
              <Text style={styles.dateText}>{format(appointmentDate, 'EEEE, MMMM dd, yyyy')}</Text>
              <Text style={styles.timeText}>{format(appointmentDate, 'h:mm a')}</Text>
              <Text style={styles.durationText}>
                Duration: {appointment.durationMinutes} minutes
              </Text>
              {isUpcoming && (
                <View style={styles.upcomingBadge}>
                  <Text style={styles.upcomingText}>⏰ Upcoming</Text>
                </View>
              )}
            </View>
          </View>

          {/* Service */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💼 Service</Text>
            <View style={styles.infoCard}>
              <Text style={styles.serviceName}>{appointment.service.name}</Text>
              {appointment.service.category && (
                <Text style={styles.serviceCategory}>Category: {appointment.service.category}</Text>
              )}
              {appointment.service.price && (
                <Text style={styles.servicePrice}>Price: ${appointment.service.price}</Text>
              )}
            </View>
          </View>

          {/* Customer */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Customer</Text>
            <View style={styles.infoCard}>
              <Text style={styles.customerName}>{appointment.customerName}</Text>
              
              {appointment.customerPhone && (
                <TouchableOpacity style={styles.contactRow} onPress={handleCall}>
                  <Text style={styles.contactIcon}>📱</Text>
                  <Text style={styles.contactText}>{appointment.customerPhone}</Text>
                  <Text style={styles.contactAction}>Call</Text>
                </TouchableOpacity>
              )}
              
              {appointment.customerEmail && (
                <TouchableOpacity style={styles.contactRow} onPress={handleEmail}>
                  <Text style={styles.contactIcon}>✉️</Text>
                  <Text style={styles.contactText}>{appointment.customerEmail}</Text>
                  <Text style={styles.contactAction}>Email</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Customer Notes */}
          {appointment.customerNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Customer Notes</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{appointment.customerNotes}</Text>
              </View>
            </View>
          )}

          {/* Internal Notes */}
          {appointment.internalNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔒 Internal Notes</Text>
              <View style={[styles.notesCard, styles.internalNotesCard]}>
                <Text style={styles.notesText}>{appointment.internalNotes}</Text>
              </View>
            </View>
          )}

          {/* Change Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Change Status</Text>
            {updatingStatus ? (
              <ActivityIndicator size="small" color="#1890ff" />
            ) : (
              <View style={styles.statusButtons}>
                {STATUS_OPTIONS.map((status) => (
                  <TouchableOpacity
                    key={status.key}
                    style={[
                      styles.statusButton,
                      appointment.status === status.key && styles.statusButtonActive,
                    ]}
                    onPress={() => handleStatusChange(status.key)}
                    disabled={appointment.status === status.key}
                  >
                    <Text style={styles.statusButtonIcon}>{status.icon}</Text>
                    <Text style={[
                      styles.statusButtonText,
                      appointment.status === status.key && styles.statusButtonTextActive,
                    ]}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Metadata */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ℹ️ Information</Text>
            <View style={styles.metaCard}>
              <Text style={styles.metaText}>
                Created: {format(new Date(appointment.createdAt), 'MMM dd, yyyy h:mm a')}
              </Text>
              <Text style={styles.metaText}>
                Updated: {format(new Date(appointment.updatedAt), 'MMM dd, yyyy h:mm a')}
              </Text>
              {appointment.canceledAt && (
                <Text style={[styles.metaText, { color: '#f5222d' }]}>
                  Canceled: {format(new Date(appointment.canceledAt), 'MMM dd, yyyy h:mm a')}
                </Text>
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#8c8c8c',
  },
  editButton: {
    padding: 8,
  },
  editText: {
    fontSize: 16,
    color: '#1890ff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusBannerIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  statusBannerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  dateTimeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1890ff',
    marginBottom: 8,
  },
  durationText: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  upcomingBadge: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f6ffed',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  upcomingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52c41a',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  serviceCategory: {
    fontSize: 14,
    color: '#595959',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#52c41a',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    color: '#595959',
  },
  contactAction: {
    fontSize: 14,
    color: '#1890ff',
    fontWeight: '600',
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1890ff',
  },
  internalNotesCard: {
    backgroundColor: '#fffbe6',
    borderLeftColor: '#faad14',
  },
  notesText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: '48%',
  },
  statusButtonActive: {
    borderColor: '#1890ff',
    backgroundColor: '#e6f7ff',
  },
  statusButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  statusButtonText: {
    fontSize: 14,
    color: '#595959',
    fontWeight: '500',
  },
  statusButtonTextActive: {
    color: '#1890ff',
    fontWeight: '600',
  },
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#8c8c8c',
    marginBottom: 6,
  },
});

export default AppointmentDetailsModal;
