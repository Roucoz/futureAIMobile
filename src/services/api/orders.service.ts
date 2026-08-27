/**
 * Orders Service
 * API calls for order management (mobile)
 */

import apiClient from './client';

export interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number | null;
    totalPrice: number | null;
    notes: string | null;
}

export interface Order {
    id: string;
    conversationId: string | null;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    address: string | null;
    status: string;
    totalAmount: number | null;
    deliveryMethod: string;
    paymentMethod: string | null;
    isPaid: boolean;
    customerNotes: string | null;
    internalNotes: string | null;
    createdAt: string;
    items: OrderItem[];
}

export type OrderStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'PREPARING'
    | 'READY'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'COMPLETED'
    | 'CANCELED';

export interface UpdateOrderDto {
    status?: OrderStatus;
    isPaid?: boolean;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    address?: string;
    deliveryMethod?: string;
    paymentMethod?: string;
    customerNotes?: string;
    internalNotes?: string;
}

class OrdersService {
    /**
     * Get orders (optionally filtered by status, comma-separated)
     */
    async getOrders(statuses?: string[]): Promise<Order[]> {
        const params =
            statuses && statuses.length > 0
                ? `?status=${statuses.join(',')}`
                : '';
        const response = await apiClient.get(`/v1/admin/orders${params}`);
        return response.data.data || [];
    }

    /**
     * Get a contact's orders. Matches by the linked contactId AND the contact's
     * phone/email (same logic as the customer count on the admin contacts page).
     */
    async getOrdersByContact(
        contactId: string,
        phone?: string,
        email?: string,
    ): Promise<Order[]> {
        const params = new URLSearchParams({ limit: '50' });
        if (contactId) params.set('contactId', contactId);
        if (phone) params.set('customerPhone', phone);
        if (email) params.set('customerEmail', email);
        const response = await apiClient.get(
            `/v1/admin/orders/query?${params.toString()}`,
        );
        return response.data.data?.orders || [];
    }

    /**
     * Update an order's status or payment flag
     */
    async updateOrder(id: string, dto: UpdateOrderDto): Promise<Order> {
        const response = await apiClient.patch(`/v1/admin/orders/${id}`, dto);
        return response.data.data;
    }
}

export const ordersService = new OrdersService();
