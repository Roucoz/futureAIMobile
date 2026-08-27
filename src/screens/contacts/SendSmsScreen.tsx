/**
 * Send SMS Screen
 * Compose and send a direct SMS to a contact.
 * Mirrors the web admin: POST /v1/admin/sms/send-to-contact
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ContactsStackParamList } from '../../navigation/types';
import contactService from '../../services/api/contact.service';

type SendSmsRouteProp = RouteProp<
  { SendSms: { contactId: string; phoneNumber: string; contactName?: string } },
  'SendSms'
>;

const SendSmsScreen = () => {
  const route = useRoute<SendSmsRouteProp>();
  const navigation = useNavigation();
  const { contactId, phoneNumber, contactName } = route.params;

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSending(true);
    try {
      const result = await contactService.sendSmsToContact(
        contactId,
        message.trim(),
      );
      const segmentInfo =
        result && result.segmentCount
          ? `\n\nSegments: ${result.segmentCount}`
          : '';
      Alert.alert('Success', `SMS sent successfully!${segmentInfo}`, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      Alert.alert('Error', error.message || 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Customer info */}
        <View style={styles.headerCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(contactName || phoneNumber).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.contactName}>{contactName || phoneNumber}</Text>
          <Text style={styles.contactPhone}>{phoneNumber}</Text>
          <Text style={styles.headerHint}>
            This will send a text message (SMS) to this customer's phone number.
          </Text>
        </View>

        <Text style={styles.label}>Message *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your SMS message..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={8}
          maxLength={1600}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{message.length}/1600</Text>

        <TouchableOpacity
          style={[styles.sendButton, sending && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send SMS</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={sending}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f9',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f9',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1890ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  contactPhone: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  headerHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 160,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 4,
  },
  sendButton: {
    backgroundColor: '#1890ff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});

export default SendSmsScreen;
