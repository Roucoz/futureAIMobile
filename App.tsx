/**
 * Tuxon Mobile App
 * React Native mobile application for customer support management
 */

import 'react-native-gesture-handler'; // MUST be at the top!
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from './src/stores';
import RootNavigator from './src/navigation/RootNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar barStyle="dark-content" />
        <RootNavigator />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

export default App;
