/**
 * Appointments Service
 * API calls for appointment management
 */

import apiClient from './client';

export interface Service {
  id: string;
  name: string;
  category?: string | null;
  price?: number | null;
  durationMinutes: number;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  appointmentDate: string;
  durationMinutes: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
  customerNotes?: string | null;
  internalNotes?: string | null;
  serviceId: string;
  service: Service;
  createdAt: string;
  updatedAt: string;
  canceledAt?: string | null;
}

export interface CreateAppointmentDto {
  serviceId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  appointmentDate: string;
  customerNotes?: string;
}

export interface UpdateAppointmentDto {
  status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
  appointmentDate?: string;
  internalNotes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

class AppointmentsService {
  /**
   * Get all appointments
   */
  async getAppointments(status?: string): Promise<Appointment[]> {
    console.log('🔄 appointmentsService.getAppointments() - status:', status);
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(`/v1/admin/appointments${params}`);
    console.log('✅ appointmentsService.getAppointments() - Count:', response.data.appointments?.length || 0);
    return response.data.appointments || [];
  }

  /**
   * Get upcoming appointments for today
   */
  async getTodayAppointments(): Promise<Appointment[]> {
    console.log('🔄 appointmentsService.getTodayAppointments()');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const response = await apiClient.get(`/v1/admin/appointments?date=${today}`);
    console.log('✅ appointmentsService.getTodayAppointments() - Count:', response.data.appointments?.length || 0);
    return response.data.appointments || [];
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<Appointment> {
    console.log('🔄 appointmentsService.getAppointmentById() - appointmentId:', appointmentId);
    const response = await apiClient.get(`/v1/admin/appointments/${appointmentId}`);
    console.log('✅ appointmentsService.getAppointmentById() - Success');
    return response.data.appointment;
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(
    appointmentId: string,
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW',
  ): Promise<Appointment> {
    console.log('📤 appointmentsService.updateAppointmentStatus() - appointmentId:', appointmentId, 'status:', status);
    const response = await apiClient.patch(`/v1/admin/appointments/${appointmentId}`, { status });
    console.log('✅ appointmentsService.updateAppointmentStatus() - Success');
    return response.data.appointment;
  }

  /**
   * Reschedule appointment
   */
  async rescheduleAppointment(appointmentId: string, newDate: string): Promise<Appointment> {
    console.log('📤 appointmentsService.rescheduleAppointment() - appointmentId:', appointmentId);
    const response = await apiClient.patch(`/v1/admin/appointments/${appointmentId}`, {
      appointmentDate: newDate,
    });
    console.log('✅ appointmentsService.rescheduleAppointment() - Success');
    return response.data.appointment;
  }

  /**
   * Create new appointment
   */
  async createAppointment(data: CreateAppointmentDto): Promise<Appointment> {
    console.log('📤 appointmentsService.createAppointment() - data:', data);
    const response = await apiClient.post('/v1/admin/appointments', data);
    console.log('✅ appointmentsService.createAppointment() - Success');
    return response.data.appointment;
  }

  /**
   * Update appointment
   */
  async updateAppointment(appointmentId: string, data: UpdateAppointmentDto): Promise<Appointment> {
    console.log('📤 appointmentsService.updateAppointment() - appointmentId:', appointmentId);
    const response = await apiClient.patch(`/v1/admin/appointments/${appointmentId}`, data);
    console.log('✅ appointmentsService.updateAppointment() - Success');
    return response.data.appointment;
  }

  /**
   * Get all services
   */
  async getServices(): Promise<Service[]> {
    console.log('🔄 appointmentsService.getServices()');
    const response = await apiClient.get('/v1/admin/services');
    console.log('✅ appointmentsService.getServices() - Count:', response.data.services?.length || 0);
    return response.data.services || [];
  }
}

export const appointmentsService = new AppointmentsService();
export default appointmentsService;
