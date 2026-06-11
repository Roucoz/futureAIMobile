/**
 * ScreenBackground
 * Reusable background image wrapper for all screens.
 * Change the image here once and it updates everywhere.
 */

import React from 'react';
import { ImageBackground, StyleSheet, ViewStyle } from 'react-native';

const backgroundImage = require('../../assets/images/screenbackground.jpeg');

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

const ScreenBackground: React.FC<ScreenBackgroundProps> = ({
  children,
  style,
}) => {
  return (
    <ImageBackground
      source={backgroundImage}
      style={[styles.container, style]}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenBackground;
