/**
 * Appointment Form Modal
 * Create or edit appointments
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useAppointment } from '../../stores';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

interface AppointmentFormModalProps {
  visible: boolean;
  onClose: () => void;
  appointment?: any; // Existing appointment for editing
  preselectedDate?: Date; // Preselected date for new appointments
  onSuccess?: () => void;
}

const AppointmentFormModal = observer(({
  visible,
  onClose,
  appointment,
  preselectedDate,
  onSuccess,
}: AppointmentFormModalProps) => {
  const appointmentStore = useAppointment();
  const isEditing = !!appointment;

  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load services when modal opens
  useEffect(() => {
    if (visible && appointmentStore.services.length === 0) {
      appointmentStore.fetchServices();
    }
  }, [visible]);

  // Populate form when editing
  useEffect(() => {
    if (appointment && visible) {
      setSelectedServiceId(appointment.serviceId);
      setCustomerName(appointment.customerName);
      setCustomerPhone(appointment.customerPhone || '');
      setCustomerEmail(appointment.customerEmail || '');
      setCustomerNotes(appointment.customerNotes || '');
      setInternalNotes(appointment.internalNotes || '');
      setAppointmentDate(new Date(appointment.appointmentDate));
    } else if (visible) {
      // Reset form for new appointment
      resetForm();
      // Set preselected date if provided
      if (preselectedDate) {
        setAppointmentDate(preselectedDate);
      }
    }
  }, [appointment, visible, preselectedDate]);

  const resetForm = () => {
    setSelectedServiceId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerNotes('');
    setInternalNotes('');
    setAppointmentDate(new Date());
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedServiceId) {
      Alert.alert('Error', 'Please select a service');
      return;
    }
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    setSubmitting(true);

    try {
      if (isEditing) {
        // Update existing appointment
        await appointmentStore.updateAppointment(appointment.id, {
          appointmentDate: appointmentDate.toISOString(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          customerEmail: customerEmail.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined,
        });
        Alert.alert('Success', 'Appointment updated successfully');
      } else {
        // Create new appointment
        await appointmentStore.createAppointment({
          serviceId: selectedServiceId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          customerEmail: customerEmail.trim() || undefined,
          appointmentDate: appointmentDate.toISOString(),
          customerNotes: customerNotes.trim() || undefined,
        });
        Alert.alert('Success', 'Appointment created successfully');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setAppointmentDate(selectedDate);
    }
  };

  const onTimeChange = (_event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setAppointmentDate(selectedDate);
    }
  };

  const selectedService = appointmentStore.services.find(s => s.id === selectedServiceId);

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
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEditing ? 'Edit Appointment' : 'New Appointment'}
          </Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.saveButton} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#1890ff" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Service Selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Service *</Text>
            {appointmentStore.services.length === 0 ? (
              <ActivityIndicator size="small" color="#1890ff" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceList}>
                {appointmentStore.services.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.serviceCard,
                      selectedServiceId === service.id && styles.serviceCardSelected,
                    ]}
                    onPress={() => setSelectedServiceId(service.id)}
                  >
                    <Text style={[
                      styles.serviceName,
                      selectedServiceId === service.id && styles.serviceNameSelected,
                    ]}>
                      {service.name}
                    </Text>
                    <Text style={styles.serviceDuration}>{service.durationMinutes} min</Text>
                    {service.price && (
                      <Text style={styles.servicePrice}>${service.price}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {selectedService && (
              <View style={styles.selectedServiceInfo}>
                <Text style={styles.selectedServiceText}>
                  ✓ {selectedService.name} ({selectedService.durationMinutes} minutes)
                </Text>
              </View>
            )}
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.label}>Date & Time *</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateTimeIcon}>📅</Text>
                <Text style={styles.dateTimeText}>{format(appointmentDate, 'MMM dd, yyyy')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeIcon}>🕐</Text>
                <Text style={styles.dateTimeText}>{format(appointmentDate, 'h:mm a')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Customer Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="John Doe"
              placeholderTextColor="#bfbfbf"
            />
          </View>

          {/* Customer Phone */}
          <View style={styles.section}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="+1234567890"
              placeholderTextColor="#bfbfbf"
              keyboardType="phone-pad"
            />
          </View>

          {/* Customer Email */}
          <View style={styles.section}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              placeholder="customer@example.com"
              placeholderTextColor="#bfbfbf"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Customer Notes */}
          {!isEditing && (
            <View style={styles.section}>
              <Text style={styles.label}>Customer Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={customerNotes}
                onChangeText={setCustomerNotes}
                placeholder="Notes from customer..."
                placeholderTextColor="#bfbfbf"
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {/* Internal Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Internal Notes 🔒</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={internalNotes}
              onChangeText={setInternalNotes}
              placeholder="Internal notes (not visible to customer)..."
              placeholderTextColor="#bfbfbf"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={appointmentDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={appointmentDate}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}
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
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#8c8c8c',
  },
  saveButton: {
    padding: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    color: '#1890ff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  serviceList: {
    marginVertical: 8,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d9d9d9',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
  },
  serviceCardSelected: {
    borderColor: '#1890ff',
    backgroundColor: '#e6f7ff',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  serviceNameSelected: {
    color: '#1890ff',
  },
  serviceDuration: {
    fontSize: 12,
    color: '#8c8c8c',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#52c41a',
  },
  selectedServiceInfo: {
    backgroundColor: '#f6ffed',
    borderLeftWidth: 3,
    borderLeftColor: '#52c41a',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  selectedServiceText: {
    fontSize: 14,
    color: '#389e0d',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 12,
  },
  dateTimeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
});

export default AppointmentFormModal;
