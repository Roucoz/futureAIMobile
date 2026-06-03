/**
 * AppointmentStore - MobX State Tree
 * Manages appointments state
 */

import { types, flow, cast, Instance } from 'mobx-state-tree';
import {
  appointmentsService,
  Appointment as AppointmentType,
  Service as ServiceType,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from '../services/api/appointments.service';
import { websocketService } from '../services/websocket/WebSocketService';

// Service model
export const ServiceModel = types.model('Service', {
  id: types.identifier,
  name: types.string,
  category: types.maybeNull(types.string),
  price: types.maybeNull(types.number),
  durationMinutes: types.number,
});

// Appointment model
export const AppointmentModel = types.model('Appointment', {
  id: types.identifier,
  customerName: types.string,
  customerEmail: types.maybeNull(types.string),
  customerPhone: types.maybeNull(types.string),
  appointmentDate: types.string,
  durationMinutes: types.number,
  status: types.enumeration('AppointmentStatus', [
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELED',
    'NO_SHOW',
  ]),
  customerNotes: types.maybeNull(types.string),
  internalNotes: types.maybeNull(types.string),
  serviceId: types.string,
  service: ServiceModel,
  createdAt: types.string,
  updatedAt: types.string,
  canceledAt: types.maybeNull(types.string),
});

// AppointmentStore
export const AppointmentStore = types
  .model('AppointmentStore', {
    appointments: types.array(AppointmentModel),
    services: types.array(ServiceModel),
    loading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    selectedStatus: types.maybeNull(types.string), // Filter by status
    dateRangeFrom: types.maybeNull(types.string), // Date range filter start
    dateRangeTo: types.maybeNull(types.string), // Date range filter end
  })
  .views(self => ({
    /**
     * Get filtered appointments based on selected status and date range
     */
    get filteredAppointments() {
      let filtered = self.appointments.slice();

      // Filter by status
      if (self.selectedStatus && self.selectedStatus !== 'ALL') {
        filtered = filtered.filter(apt => apt.status === self.selectedStatus);
      }

      // Filter by date range
      if (self.dateRangeFrom || self.dateRangeTo) {
        filtered = filtered.filter(apt => {
          const aptDate = new Date(apt.appointmentDate);
          const fromDate = self.dateRangeFrom
            ? new Date(self.dateRangeFrom)
            : null;
          const toDate = self.dateRangeTo ? new Date(self.dateRangeTo) : null;

          if (fromDate && aptDate < fromDate) return false;
          if (toDate && aptDate > toDate) return false;
          return true;
        });
      } else {
        // Default: only show today and future appointments (not past/due)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter(apt => {
          return new Date(apt.appointmentDate) >= today;
        });
      }

      return filtered;
    },

    /**
     * Get appointments grouped by date
     */
    get appointmentsByDate() {
      const grouped: { [key: string]: any[] } = {};

      this.filteredAppointments.forEach(apt => {
        const date = new Date(apt.appointmentDate).toLocaleDateString();
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(apt);
      });

      return grouped;
    },

    /**
     * Get upcoming appointments (future dates)
     */
    get upcomingAppointments() {
      const now = new Date();
      return this.filteredAppointments.filter(
        apt => new Date(apt.appointmentDate) >= now,
      );
    },

    /**
     * Get past appointments
     */
    get pastAppointments() {
      const now = new Date();
      return this.filteredAppointments.filter(
        apt => new Date(apt.appointmentDate) < now,
      );
    },

    /**
     * Get today's appointments
     */
    get todayAppointments() {
      const today = new Date().toDateString();
      return this.filteredAppointments.filter(
        apt => new Date(apt.appointmentDate).toDateString() === today,
      );
    },

    /**
     * Get appointment by ID
     */
    getAppointmentById(id: string) {
      return self.appointments.find(apt => apt.id === id);
    },

    /**
     * Get status count
     */
    getStatusCount(status: string) {
      // Apply same default date filter (upcoming only) as filteredAppointments,
      // but without the status filter so we count by status independently
      let pool = self.appointments.slice();

      if (self.dateRangeFrom || self.dateRangeTo) {
        pool = pool.filter(apt => {
          const aptDate = new Date(apt.appointmentDate);
          const fromDate = self.dateRangeFrom
            ? new Date(self.dateRangeFrom)
            : null;
          const toDate = self.dateRangeTo ? new Date(self.dateRangeTo) : null;
          if (fromDate && aptDate < fromDate) return false;
          if (toDate && aptDate > toDate) return false;
          return true;
        });
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        pool = pool.filter(apt => new Date(apt.appointmentDate) >= today);
      }

      if (status === 'ALL') return pool.length;
      return pool.filter(apt => apt.status === status).length;
    },
  }))
  .volatile(() => ({
    websocketUnsubscribe: null as (() => void) | null,
  }))
  .actions(self => {
    /**
     * Fetch all appointments (always fetch ALL, filter locally)
     */
    const fetchAppointments = flow(function* () {
      self.loading = true;
      self.error = null;

      try {
        // Always fetch all appointments without status filter
        const appointments: AppointmentType[] =
          yield appointmentsService.getAppointments(undefined);
        self.appointments = cast(appointments);
        self.loading = false;
      } catch (error: any) {
        console.error(
          '❌ AppointmentStore.fetchAppointments() - ERROR:',
          error,
        );
        self.error = error.message || 'Failed to load appointments';
        self.loading = false;
      }
    });

    /**
     * Set status filter
     */
    const setStatusFilter = (status: string) => {
      self.selectedStatus = status;
    };

    /**
     * Set date range filter
     */
    const setDateRange = (from: string | null, to: string | null) => {
      self.dateRangeFrom = from;
      self.dateRangeTo = to;
    };

    /**
     * Clear date range filter
     */
    const clearDateRange = () => {
      self.dateRangeFrom = null;
      self.dateRangeTo = null;
    };

    /**
     * Fetch today's appointments
     */
    const fetchTodayAppointments = flow(function* () {
      self.loading = true;
      self.error = null;

      try {
        const appointments: AppointmentType[] =
          yield appointmentsService.getTodayAppointments();
        self.appointments = cast(appointments);
        self.loading = false;
      } catch (error: any) {
        console.error(
          '❌ AppointmentStore.fetchTodayAppointments() - ERROR:',
          error,
        );
        self.error = error.message || 'Failed to load appointments';
        self.loading = false;
      }
    });

    /**
     * Update appointment status
     */
    const updateAppointmentStatus = flow(function* (
      appointmentId: string,
      status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW',
    ) {
      try {
        const updated: AppointmentType =
          yield appointmentsService.updateAppointmentStatus(
            appointmentId,
            status,
          );

        // Update local state
        const index = self.appointments.findIndex(
          apt => apt.id === appointmentId,
        );
        if (index !== -1) {
          self.appointments[index] = cast(updated);
        }
      } catch (error: any) {
        console.error(
          '❌ AppointmentStore.updateAppointmentStatus() - ERROR:',
          error,
        );
        throw error;
      }
    });

    /**
     * Reschedule appointment
     */
    const rescheduleAppointment = flow(function* (
      appointmentId: string,
      newDate: string,
    ) {
      try {
        const updated: AppointmentType =
          yield appointmentsService.rescheduleAppointment(
            appointmentId,
            newDate,
          );

        // Update local state
        const index = self.appointments.findIndex(
          apt => apt.id === appointmentId,
        );
        if (index !== -1) {
          self.appointments[index] = cast(updated);
        }
      } catch (error: any) {
        console.error(
          '❌ AppointmentStore.rescheduleAppointment() - ERROR:',
          error,
        );
        throw error;
      }
    });

    /**
     * Create new appointment
     */
    const createAppointment = flow(function* (data: CreateAppointmentDto) {
      self.loading = true;
      self.error = null;

      try {
        const newAppointment: AppointmentType =
          yield appointmentsService.createAppointment(data);

        // Add to local state
        self.appointments.push(cast(newAppointment));
        self.loading = false;

        return newAppointment;
      } catch (error: any) {
        console.error(
          '❌ AppointmentStore.createAppointment() - ERROR:',
          error,
        );
        self.error = error.message || 'Failed to create appointment';
        self.loading = false;
        throw error;
      }
    });

    /**
     * Update appointment (full update)
     */
    const updateAppointment = flow(function* (
      appointmentId: string,
      data: UpdateAppointmentDto,
    ) {
      try {
        const updated: AppointmentType =
          yield appointmentsService.updateAppointment(appointmentId, data);

        // Update local state
        const index = self.appointments.findIndex(
          apt => apt.id === appointmentId,
        );
        if (index !== -1) {
          self.appointments[index] = cast(updated);
        }

        return updated;
      } catch (error: any) {
        console.error(
          '❌ AppointmentStore.updateAppointment() - ERROR:',
          error,
        );
        throw error;
      }
    });

    /**
     * Fetch services
     */
    const fetchServices = flow(function* () {
      try {
        const services: ServiceType[] = yield appointmentsService.getServices();
        self.services = cast(services);
      } catch (error: any) {
        console.error('❌ AppointmentStore.fetchServices() - ERROR:', error);
        throw error;
      }
    });

    /**
     * Handle WebSocket message for appointment events
     */
    const handleWebSocketUpdate = (message: any) => {
      if (
        message.type !== 'appointment_updated' &&
        message.type !== 'ws_reconnected'
      )
        return;


      try {
        // Reload appointments from server to get full data
        fetchAppointments().catch((err: any) =>
          console.error('Failed to reload appointments:', err),
        );
      } catch (error) {
        console.error('Error handling appointment WebSocket message:', error);
      }
    };

    /**
     * Clear error
     */
    const clearError = () => {
      self.error = null;
    };

    /**
     * Reset store
     */
    const reset = () => {
      self.appointments = cast([]);
      self.services = cast([]);
      self.loading = false;
      self.error = null;
      self.selectedStatus = null;
    };

    return {
      fetchAppointments,
      setStatusFilter,
      setDateRange,
      clearDateRange,
      fetchTodayAppointments,
      updateAppointmentStatus,
      rescheduleAppointment,
      createAppointment,
      updateAppointment,
      fetchServices,
      handleWebSocketUpdate,
      clearError,
      reset,
    };
  })
  .actions(self => ({
    /**
     * Setup WebSocket connection for appointment events
     */
    setupWebSocketConnection(apiBaseUrl: string, token: string) {
      console.log('🔌 AppointmentStore: Setting up WebSocket');

      // Disconnect any existing
      if (self.websocketUnsubscribe) {
        self.websocketUnsubscribe();
        self.websocketUnsubscribe = null;
      }

      // Subscribe to WebSocket messages (shared connection)
      const unsubscribe = websocketService.subscribe(message => {
        self.handleWebSocketUpdate(message);
      });

      self.websocketUnsubscribe = unsubscribe;
    },

    /**
     * Disconnect WebSocket
     */
    disconnectWebSocket() {
      if (self.websocketUnsubscribe) {
        self.websocketUnsubscribe();
        self.websocketUnsubscribe = null;
      }
    },
  }));

export interface IAppointmentStore extends Instance<typeof AppointmentStore> { }
