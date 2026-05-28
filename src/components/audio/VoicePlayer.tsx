/**
 * VoicePlayer Component
 * Plays voice messages (audio attachments)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface VoicePlayerProps {
  audioUrl: string;
  duration?: number; // Duration in seconds (if available)
  transcription?: string | null;
  onError?: (error: Error) => void;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({ audioUrl, transcription }) => {

  return (
    <View style={styles.container}>
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderIcon}>🎤</Text>
        <Text style={styles.placeholderText}>Voice Message</Text>
        <Text style={styles.placeholderSubtext}>
          Audio playback coming soon
        </Text>
      </View>

      {/* Transcription (if available) */}
      {transcription && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionLabel}>📝 Transcription:</Text>
          <Text style={styles.transcriptionText}>{transcription}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  placeholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#999',
  },
  transcriptionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#d9d9d9',
  },
  transcriptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 13,
    color: '#333',
    fontStyle: 'italic',
  },
});

export default VoicePlayer;
