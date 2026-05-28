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
  })
  .views((self) => ({
    /**
     * Get filtered appointments based on selected status
     */
    get filteredAppointments() {
      if (!self.selectedStatus || self.selectedStatus === 'ALL') {
        return self.appointments;
      }
      return self.appointments.filter((apt) => apt.status === self.selectedStatus);
    },

    /**
     * Get appointments grouped by date
     */
    get appointmentsByDate() {
      const grouped: { [key: string]: typeof self.appointments } = {};
      
      self.filteredAppointments.forEach((apt) => {
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
      return self.filteredAppointments.filter(
        (apt) => new Date(apt.appointmentDate) >= now
      );
    },

    /**
     * Get past appointments
     */
    get pastAppointments() {
      const now = new Date();
      return self.filteredAppointments.filter(
        (apt) => new Date(apt.appointmentDate) < now
      );
    },

    /**
     * Get today's appointments
     */
    get todayAppointments() {
      const today = new Date().toDateString();
      return self.filteredAppointments.filter(
        (apt) => new Date(apt.appointmentDate).toDateString() === today
      );
    },

    /**
     * Get appointment by ID
     */
    getAppointmentById(id: string) {
      return self.appointments.find((apt) => apt.id === id);
    },

    /**
     * Get status count
     */
    getStatusCount(status: string) {
      if (status === 'ALL') return self.appointments.length;
      return self.appointments.filter((apt) => apt.status === status).length;
    },
  }))
  .actions((self) => ({
    /**
     * Fetch all appointments
     */
    fetchAppointments: flow(function* (status?: string) {
      self.loading = true;
      self.error = null;

      try {
        const appointments: AppointmentType[] = yield appointmentsService.getAppointments(status);
        self.appointments = cast(appointments);
        self.loading = false;
      } catch (error: any) {
        console.error('❌ AppointmentStore.fetchAppointments() - ERROR:', error);
        self.error = error.message || 'Failed to load appointments';
        self.loading = false;
      }
    }),

    /**
     * Fetch today's appointments
     */
    fetchTodayAppointments: flow(function* () {
      self.loading = true;
      self.error = null;

      try {
        const appointments: AppointmentType[] = yield appointmentsService.getTodayAppointments();
        self.appointments = cast(appointments);
        self.loading = false;
      } catch (error: any) {
        console.error('❌ AppointmentStore.fetchTodayAppointments() - ERROR:', error);
        self.error = error.message || 'Failed to load appointments';
        self.loading = false;
      }
    }),

    /**
     * Update appointment status
     */
    updateAppointmentStatus: flow(function* (
      appointmentId: string,
      status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW'
    ) {
      try {
        const updated: AppointmentType = yield appointmentsService.updateAppointmentStatus(
          appointmentId,
          status
        );

        // Update local state
        const index = self.appointments.findIndex((apt) => apt.id === appointmentId);
        if (index !== -1) {
          self.appointments[index] = cast(updated);
        }
      } catch (error: any) {
        console.error('❌ AppointmentStore.updateAppointmentStatus() - ERROR:', error);
        throw error;
      }
    }),

    /**
     * Reschedule appointment
     */
    rescheduleAppointment: flow(function* (appointmentId: string, newDate: string) {
      try {
        const updated: AppointmentType = yield appointmentsService.rescheduleAppointment(
          appointmentId,
          newDate
        );

        // Update local state
        const index = self.appointments.findIndex((apt) => apt.id === appointmentId);
        if (index !== -1) {
          self.appointments[index] = cast(updated);
        }
      } catch (error: any) {
        console.error('❌ AppointmentStore.rescheduleAppointment() - ERROR:', error);
        throw error;
      }
    }),

    /**
     * Create new appointment
     */
    createAppointment: flow(function* (data: CreateAppointmentDto) {
      self.loading = true;
      self.error = null;

      try {
        const newAppointment: AppointmentType = yield appointmentsService.createAppointment(data);
        
        // Add to local state
        self.appointments.push(cast(newAppointment));
        self.loading = false;
        
        return newAppointment;
      } catch (error: any) {
        console.error('❌ AppointmentStore.createAppointment() - ERROR:', error);
        self.error = error.message || 'Failed to create appointment';
        self.loading = false;
        throw error;
      }
    }),

    /**
     * Update appointment (full update)
     */
    updateAppointment: flow(function* (appointmentId: string, data: UpdateAppointmentDto) {
      try {
        const updated: AppointmentType = yield appointmentsService.updateAppointment(
          appointmentId,
          data
        );

        // Update local state
        const index = self.appointments.findIndex((apt) => apt.id === appointmentId);
        if (index !== -1) {
          self.appointments[index] = cast(updated);
        }
        
        return updated;
      } catch (error: any) {
        console.error('❌ AppointmentStore.updateAppointment() - ERROR:', error);
        throw error;
      }
    }),

    /**
     * Fetch services
     */
    fetchServices: flow(function* () {
      try {
        const services: ServiceType[] = yield appointmentsService.getServices();
        self.services = cast(services);
      } catch (error: any) {
        console.error('❌ AppointmentStore.fetchServices() - ERROR:', error);
        throw error;
      }
    }),

    /**
     * Set status filter
     */
    setStatusFilter(status: string | null) {
      self.selectedStatus = status;
    },

    /**
     * Clear error
     */
    clearError() {
      self.error = null;
    },

    /**
     * Reset store
     */
    reset() {
      self.appointments = cast([]);
      self.services = cast([]);
      self.loading = false;
      self.error = null;
      self.selectedStatus = null;
    },
  }));

export interface IAppointmentStore extends Instance<typeof AppointmentStore> {}
