/**
 * Store Provider & Context
 * Provides stores to React components
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { IRootStore, createRootStore } from './RootStore';

// Create root store instance
const rootStore = createRootStore();

// Create context
const StoreContext = createContext<IRootStore>(rootStore);

/**
 * Store Provider Component
 */
export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <StoreContext.Provider value={rootStore}>{children}</StoreContext.Provider>;
};

/**
 * Hook to access root store
 */
export const useStore = () => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return store;
};

/**
 * Hook to access auth store
 */
export const useAuth = () => {
  const { auth } = useStore();
  return auth;
};

/**
 * Hook to access chat store
 */
export const useChat = () => {
  const { chat } = useStore();
  return chat;
};

export default StoreProvider;
