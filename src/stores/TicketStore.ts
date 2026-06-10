/**
 * TicketStore - MobX State Tree
 * Manages ticket list state with pagination
 */

import { types, flow, cast, Instance } from 'mobx-state-tree';
import {
    ticketService,
    Ticket as TicketType,
    TicketStatus,
} from '../services/api/ticket.service';

// Ticket model
export const TicketModel = types.model('Ticket', {
    id: types.identifier,
    summary: types.string,
    description: types.maybeNull(types.string),
    status: types.string,
    priority: types.string,
    category: types.maybeNull(types.string),
    conversationId: types.maybeNull(types.string),
    createdAt: types.string,
    updatedAt: types.string,
    closedAt: types.maybeNull(types.string),
    // Assigned member (simplified)
    assigneeName: types.maybeNull(types.string),
    // Customer (simplified)
    customerName: types.maybeNull(types.string),
});

// Ticket status model (from custom statuses API)
export const TicketStatusModel = types.model('TicketStatus', {
    id: types.identifier,
    name: types.string,
    color: types.maybeNull(types.string),
    sortOrder: types.optional(types.number, 0),
    isDefault: types.optional(types.boolean, false),
    isActive: types.optional(types.boolean, true),
});

// TicketStore
export const TicketStore = types
    .model('TicketStore', {
        tickets: types.array(TicketModel),
        statuses: types.array(TicketStatusModel),
        loading: types.optional(types.boolean, false),
        refreshing: types.optional(types.boolean, false),
        loadingMore: types.optional(types.boolean, false),
        error: types.maybeNull(types.string),
        statusFilter: types.optional(types.string, 'open'), // Default: open tickets
        currentPage: types.optional(types.number, 1),
        totalPages: types.optional(types.number, 0),
        totalCount: types.optional(types.number, 0),
        hasMore: types.optional(types.boolean, false),
    })
    .views(self => ({
        /**
         * Get filtered tickets (server-side filtering, so just return all)
         */
        get filteredTickets() {
            return self.tickets;
        },

        /**
         * Get active status for UI
         */
        get activeStatusFilter() {
            return self.statusFilter;
        },

        /**
         * Build dynamic status filters from custom statuses
         */
        get statusFilters(): Array<{ key: string; label: string; color: string }> {
            if (self.statuses.length === 0) {
                return [{ key: 'ALL', label: 'All', color: '#888' }];
            }
            const filters = self.statuses.map(s => ({
                key: s.name,
                label: s.name.charAt(0).toUpperCase() + s.name.slice(1),
                color: s.color || '#888',
            }));
            filters.push({ key: 'ALL', label: 'All', color: '#888' });
            return filters;
        },
    }))
    .actions(self => {
        /**
         * Fetch custom statuses from backend
         */
        const fetchCustomStatuses = flow(function* () {
            try {
                const statuses: TicketStatus[] = yield ticketService.getCustomStatuses();
                self.statuses = cast(statuses);
            } catch (error: any) {
                console.error('❌ TicketStore.fetchCustomStatuses() - ERROR:', error);
            }
        });

        /**
         * Fetch first page of tickets (replaces existing list)
         * Also loads custom statuses in parallel
         */
        const fetchTickets = flow(function* () {
            self.loading = true;
            self.error = null;

            try {
                const statusParam =
                    self.statusFilter === 'ALL' ? undefined : self.statusFilter;

                // Fetch tickets and statuses in parallel
                const [result, statusesResult]: [
                    { tickets: TicketType[]; pagination: any },
                    TicketStatus[],
                ] = yield Promise.all([
                    ticketService.getTickets({
                        status: statusParam,
                        page: 1,
                        limit: 20,
                    }),
                    ticketService.getCustomStatuses(),
                ]);

                // Store statuses
                self.statuses = cast(statusesResult);

                // Map backend response to TicketModel
                self.tickets = cast(
                    result.tickets.map(t => ({
                        id: t.id,
                        summary: t.summary,
                        description: t.description,
                        status: t.status,
                        priority: t.priority,
                        category: t.category,
                        conversationId: t.conversationId,
                        createdAt: t.createdAt,
                        updatedAt: t.updatedAt,
                        closedAt: t.closedAt,
                        assigneeName: t.assignedToMember?.displayName || null,
                        customerName: t.customer?.name || null,
                    })),
                );

                self.currentPage = result.pagination.page;
                self.totalPages = result.pagination.totalPages;
                self.totalCount = result.pagination.total;
                self.hasMore = result.pagination.page < result.pagination.totalPages;
                self.loading = false;
            } catch (error: any) {
                console.error('❌ TicketStore.fetchTickets() - ERROR:', error);
                self.error = error.message || 'Failed to load tickets';
                self.loading = false;
            }
        });

        /**
         * Load next page (appends to existing list)
         */
        const loadMore = flow(function* () {
            if (self.loadingMore || !self.hasMore) return;

            self.loadingMore = true;
            const nextPage = self.currentPage + 1;

            try {
                const statusParam =
                    self.statusFilter === 'ALL' ? undefined : self.statusFilter;
                const result: { tickets: TicketType[]; pagination: any } =
                    yield ticketService.getTickets({
                        status: statusParam,
                        page: nextPage,
                        limit: 20,
                    });

                // Append mapped tickets
                const newTickets = result.tickets.map(t => ({
                    id: t.id,
                    summary: t.summary,
                    description: t.description,
                    status: t.status,
                    priority: t.priority,
                    category: t.category,
                    conversationId: t.conversationId,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt,
                    closedAt: t.closedAt,
                    assigneeName: t.assignedToMember?.displayName || null,
                    customerName: t.customer?.name || null,
                }));

                self.tickets.push(...(cast(newTickets) as any));
                self.currentPage = result.pagination.page;
                self.hasMore = result.pagination.page < result.pagination.totalPages;
                self.loadingMore = false;
            } catch (error: any) {
                console.error('❌ TicketStore.loadMore() - ERROR:', error);
                self.loadingMore = false;
            }
        });

        /**
         * Pull-to-refresh
         */
        const refresh = flow(function* () {
            self.refreshing = true;
            try {
                yield fetchTickets();
            } finally {
                self.refreshing = false;
            }
        });

        /**
         * Set status filter and reload
         */
        const setStatusFilter = (status: string) => {
            self.statusFilter = status;
            // Reset pagination
            self.currentPage = 1;
            self.hasMore = false;
        };

        return {
            fetchCustomStatuses,
            fetchTickets,
            loadMore,
            refresh,
            setStatusFilter,
        };
    });

export type ITicketStore = Instance<typeof TicketStore>;
export default TicketStore;
