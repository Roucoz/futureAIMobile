/**
 * RootStore - MobX State Tree
 * Root store combining all stores
 */

import { types, Instance } from 'mobx-state-tree';
import { AuthStore } from './AuthStore';
import { ChatStore } from './ChatStore';
import { AppointmentStore } from './AppointmentStore';
import { TicketStore } from './TicketStore';

export const RootStore = types.model('RootStore', {
  auth: AuthStore,
  chat: ChatStore,
  appointment: AppointmentStore,
  ticket: TicketStore,
});

// Create root store instance
export function createRootStore() {
  return RootStore.create({
    auth: {},
    chat: {},
    appointment: {},
    ticket: {},
  });
}

export type IRootStore = Instance<typeof RootStore>;
export default RootStore;
