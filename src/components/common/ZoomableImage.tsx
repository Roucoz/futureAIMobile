/**
 * ZoomableImage
 *
 * Renders a thumbnail <Image> that, when tapped, opens the same image in a
 * full-screen viewer modal (tap anywhere or the close button to dismiss).
 * Used for profile pictures / avatars that should preview full screen.
 *
 * `style` is applied to the tappable thumbnail wrapper so the existing size,
 * rounding, and margins stay exactly the same; the thumbnail is clipped to the
 * wrapper's border radius via `overflow: hidden`.
 */
import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { ImageResizeMode, StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface ZoomableImageProps {
  uri: string;
  /** Applied to the tappable thumbnail (keeps existing size/rounding/margins). */
  style?: StyleProp<ViewStyle>;
  /** How the thumbnail fills its box. Defaults to 'cover'. */
  thumbnailResizeMode?: ImageResizeMode;
  /** Optional callback fired when the thumbnail is tapped. */
  onPress?: () => void;
  /** Optional accessibility label for the thumbnail. */
  accessibilityLabel?: string;
}

export const ZoomableImage: React.FC<ZoomableImageProps> = ({
  uri,
  style,
  thumbnailResizeMode = 'cover',
  onPress,
  accessibilityLabel,
}) => {
  const [visible, setVisible] = useState(false);

  const open = () => {
    setVisible(true);
    onPress?.();
  };

  const close = () => setVisible(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="imagebutton"
        accessibilityLabel={accessibilityLabel || 'View full screen'}
        onPress={open}
        style={[style, styles.clip]}
      >
        <Image
          source={{ uri }}
          style={styles.thumbnailFill}
          resizeMode={thumbnailResizeMode}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.overlay} onPress={close}>
          <Image
            source={{ uri }}
            style={styles.fullImage}
            resizeMode="contain"
          />

          {/* Close button */}
          <Pressable
            style={styles.closeButton}
            onPress={close}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close image viewer"
          >
            <Icon name="close" size={28} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  thumbnailFill: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 44,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
