/**
 * Appointments Service
 * API calls for appointment management
 */

import apiClient from './client';

export interface Appointment {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  appointmentDate: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
  serviceName: string;
  serviceId: string;
  category: string | null;
  price: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
}

export const appointmentsService = new AppointmentsService();
export default appointmentsService;
