/**
 * Custom Back Button
 * Consistent back button for all navigators
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

interface CustomBackButtonProps {
  tintColor?: string;
  onPress?: () => void;
}

const CustomBackButton: React.FC<CustomBackButtonProps> = ({
  tintColor = '#1890ff',
  onPress,
}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Icon name="chevron-back" size={28} color={tintColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 5,
  },
});

export default CustomBackButton;
