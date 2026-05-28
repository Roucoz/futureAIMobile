/**
 * Week View for Appointments
 * Calendar-style weekly view of appointments
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useAppointment } from '../../stores';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';

interface WeekViewScreenProps {
  onAppointmentPress: (appointment: any) => void;
  onAddAppointment: (date?: Date) => void;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#fa8c16',
  CONFIRMED: '#1890ff',
  COMPLETED: '#52c41a',
  CANCELED: '#f5222d',
  NO_SHOW: '#8c8c8c',
};

const WeekViewScreen = observer(({ onAppointmentPress, onAddAppointment }: WeekViewScreenProps) => {
  const appointmentStore = useAppointment();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
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

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Get appointments for a specific day
  const getAppointmentsForDay = (date: Date) => {
    return appointmentStore.filteredAppointments.filter((apt) =>
      isSameDay(parseISO(apt.appointmentDate), date)
    );
  };

  const renderDayColumn = (date: Date) => {
    const appointments = getAppointmentsForDay(date);
    const isToday = isSameDay(date, new Date());

    return (
      <View key={date.toISOString()} style={styles.dayColumn}>
        {/* Day Header */}
        <View style={[styles.dayHeader, isToday && styles.todayHeader]}>
          <Text style={[styles.dayName, isToday && styles.todayText]}>
            {format(date, 'EEE')}
          </Text>
          <Text style={[styles.dayNumber, isToday && styles.todayText]}>
            {format(date, 'd')}
          </Text>
        </View>

        {/* Appointments for this day */}
        <ScrollView style={styles.dayContent} showsVerticalScrollIndicator={false}>
          {appointments.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyDay}
              onPress={() => onAddAppointment(date)}
            >
              <Text style={styles.emptyDayText}>+</Text>
            </TouchableOpacity>
          ) : (
            appointments.map((apt) => (
              <TouchableOpacity
                key={apt.id}
                style={[
                  styles.appointmentCard,
                  { borderLeftColor: STATUS_COLORS[apt.status] },
                ]}
                onPress={() => onAppointmentPress(apt)}
              >
                <Text style={styles.appointmentTime}>
                  {format(parseISO(apt.appointmentDate), 'h:mm a')}
                </Text>
                <Text style={styles.appointmentCustomer} numberOfLines={1}>
                  {apt.customerName}
                </Text>
                <Text style={styles.appointmentService} numberOfLines={1}>
                  {apt.service.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
          
          {/* Add button for days with appointments */}
          {appointments.length > 0 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => onAddAppointment(date)}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity style={styles.navButton} onPress={goToPreviousWeek}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
          <Text style={styles.weekTitle}>
            {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton} onPress={goToNextWeek}>
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Week Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.weekScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1890ff']} />
        }
      >
        <View style={styles.weekGrid}>
          {weekDays.map(renderDayColumn)}
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f9',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#f5f5f9',
  },
  navButtonText: {
    fontSize: 24,
    color: '#1890ff',
  },
  todayButton: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  weekScroll: {
    flex: 1,
  },
  weekGrid: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  dayColumn: {
    width: 140,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f5f5f9',
    borderBottomWidth: 2,
    borderBottomColor: '#e8e8e8',
  },
  todayHeader: {
    backgroundColor: '#e6f7ff',
    borderBottomColor: '#1890ff',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8c8c8c',
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 2,
  },
  todayText: {
    color: '#1890ff',
  },
  dayContent: {
    flex: 1,
    padding: 8,
  },
  emptyDay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyDayText: {
    fontSize: 32,
    color: '#d9d9d9',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1890ff',
    marginBottom: 4,
  },
  appointmentCustomer: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  appointmentService: {
    fontSize: 11,
    color: '#8c8c8c',
  },
  addButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: '600',
  },
});

export default WeekViewScreen;
