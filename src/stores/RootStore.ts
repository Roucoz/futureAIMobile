/**
 * RootStore - MobX State Tree
 * Root store combining all stores
 */

import { types, Instance } from 'mobx-state-tree';
import { AuthStore } from './AuthStore';
import { ChatStore } from './ChatStore';

export const RootStore = types.model('RootStore', {
  auth: AuthStore,
  chat: ChatStore,
  // TODO: Add AppointmentStore, NotificationStore
});

// Create root store instance
export function createRootStore() {
  return RootStore.create({
    auth: {},
    chat: {},
  });
}

export type IRootStore = Instance<typeof RootStore>;
export default RootStore;
