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
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(`/v1/admin/appointments${params}`);
    return response.data.appointments || [];
  }

  /**
   * Get upcoming appointments for today
   */
  async getTodayAppointments(): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const response = await apiClient.get(
      `/v1/admin/appointments?date=${today}`,
    );
    return response.data.appointments || [];
  }

  /**
   * Get future appointments (next 30 days, limited to 5)
   * Optimized for dashboard display - shows the nearest 5 upcoming appointments
   */
  async getFutureAppointments(limit: number = 5): Promise<Appointment[]> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1); // Tomorrow onwards
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30); // Next 30 days

    const response = await apiClient.get(
      `/v1/admin/appointments?startDate=${
        startDate.toISOString().split('T')[0]
      }&endDate=${endDate.toISOString().split('T')[0]}`,
    );

    const appointments = response.data.appointments || [];
    // Sort by date ascending and limit results
    const sorted = appointments
      .sort(
        (a: Appointment, b: Appointment) =>
          new Date(a.appointmentDate).getTime() -
          new Date(b.appointmentDate).getTime(),
      )
      .slice(0, limit);

    return sorted;
  }

  /**
   * Get past incomplete appointments (last 30 days, limited to 5)
   * Only returns PENDING and CONFIRMED appointments from the past
   */
  async getPastIncompleteAppointments(
    limit: number = 5,
  ): Promise<Appointment[]> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30); // Last 30 days
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - 1); // Up to yesterday

    const response = await apiClient.get(
      `/v1/admin/appointments?startDate=${
        startDate.toISOString().split('T')[0]
      }&endDate=${endDate.toISOString().split('T')[0]}`,
    );

    const appointments = response.data.appointments || [];
    // Filter incomplete (not COMPLETED or CANCELED) and sort by date descending
    const incomplete = appointments
      .filter(
        (apt: Appointment) =>
          apt.status !== 'COMPLETED' && apt.status !== 'CANCELED',
      )
      .sort(
        (a: Appointment, b: Appointment) =>
          new Date(b.appointmentDate).getTime() -
          new Date(a.appointmentDate).getTime(),
      )
      .slice(0, limit);

    return incomplete;
  }

  /**
   * Get count of PAST incomplete appointments only
   * Returns count of PENDING and CONFIRMED appointments from before today
   */
  async getIncompleteAppointmentsCount(): Promise<number> {
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 90); // Last 90 days
      const endDate = new Date(today);
      endDate.setDate(today.getDate() - 1); // Up to yesterday

      const response = await apiClient.get(
        `/v1/admin/appointments?startDate=${
          startDate.toISOString().split('T')[0]
        }&endDate=${endDate.toISOString().split('T')[0]}`,
      );

      const appointments = response.data.appointments || [];
      // Count only incomplete appointments (not COMPLETED or CANCELED)
      const incompleteCount = appointments.filter(
        (apt: Appointment) =>
          apt.status !== 'COMPLETED' && apt.status !== 'CANCELED',
      ).length;

      return incompleteCount;
    } catch (error) {
      console.error(
        '❌ appointmentsService.getIncompleteAppointmentsCount() - Error:',
        error,
      );
      return 0;
    }
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<Appointment> {
    const response = await apiClient.get(
      `/v1/admin/appointments/${appointmentId}`,
    );
    return response.data.appointment;
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(
    appointmentId: string,
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW',
  ): Promise<Appointment> {
    const response = await apiClient.patch(
      `/v1/admin/appointments/${appointmentId}`,
      { status },
    );
    return response.data.appointment;
  }

  /**
   * Reschedule appointment
   */
  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
  ): Promise<Appointment> {
    const response = await apiClient.patch(
      `/v1/admin/appointments/${appointmentId}`,
      {
        appointmentDate: newDate,
      },
    );
    return response.data.appointment;
  }

  /**
   * Create new appointment
   */
  async createAppointment(data: CreateAppointmentDto): Promise<Appointment> {
    const response = await apiClient.post('/v1/admin/appointments', data);
    return response.data.appointment;
  }

  /**
   * Update appointment
   */
  async updateAppointment(
    appointmentId: string,
    data: UpdateAppointmentDto,
  ): Promise<Appointment> {
    const response = await apiClient.patch(
      `/v1/admin/appointments/${appointmentId}`,
      data,
    );
    return response.data.appointment;
  }

  /**
   * Get all services
   */
  async getServices(): Promise<Service[]> {
    const response = await apiClient.get('/v1/admin/services');
    return response.data.services || [];
  }
}

export const appointmentsService = new AppointmentsService();
export default appointmentsService;
