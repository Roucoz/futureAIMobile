/**
 * Social Message Screen
 * Send a new Telegram / Instagram message to a customer who has no existing
 * conversation on that channel.
 *
 * Unlike WhatsApp, neither Telegram nor Instagram requires an approved
 * template — the agent can always send a free-form message directly to the
 * customer's native id (Telegram chat id / Instagram user id).
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
import { useAuth } from '../../stores';
import contactService from '../../services/api/contact.service';

type SocialMessageRouteProp = RouteProp<
  ContactsStackParamList,
  'SocialMessage'
>;

type SocialChannel = 'TELEGRAM' | 'INSTAGRAM';

const CHANNEL_META: Record<
  SocialChannel,
  { label: string; color: string; icon: string; hint: string }
> = {
  TELEGRAM: {
    label: 'Telegram',
    color: '#229ED9',
    icon: 'paper-plane',
    hint: 'Telegram allows free-form messages — no template required.',
  },
  INSTAGRAM: {
    label: 'Instagram',
    color: '#E4405F',
    icon: 'logo-instagram',
    hint: 'Instagram allows free-form messages — no template required. The message only fails if the customer is outside the messaging window.',
  },
};

const SocialMessageScreen = () => {
  const route = useRoute<SocialMessageRouteProp>();
  const navigation = useNavigation();
  const authStore = useAuth();
  const { channel, nativeUserId, contactName } = route.params;

  const meta = CHANNEL_META[channel];

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const agentId = authStore.memberId;
    if (!agentId) {
      Alert.alert('Error', 'No agent profile found. Please log in again.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSending(true);
    try {
      const { conversationId } =
        channel === 'TELEGRAM'
          ? await contactService.initiateTelegramConversation({
              phoneNumber: nativeUserId,
              agentId,
              message: message.trim(),
            })
          : await contactService.initiateInstagramConversation({
              phoneNumber: nativeUserId,
              agentId,
              message: message.trim(),
            });

      Alert.alert('Success', 'Message sent & chat started!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to the new conversation (cross-stack to the Chat tab)
            (navigation as any).navigate('ChatStack', {
              screen: 'ChatDetail',
              params: { conversationId },
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error(`Failed to initiate ${meta.label} chat:`, error);
      const details = error.data?.details;
      Alert.alert(
        `Failed to Send ${meta.label} Message`,
        details || error.message || `Failed to initiate ${meta.label} chat`,
      );
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
          <View
            style={[styles.avatarContainer, { backgroundColor: meta.color }]}
          >
            <Text style={styles.avatarText}>
              {(contactName || nativeUserId).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.contactName}>{contactName || nativeUserId}</Text>
          <Text style={styles.contactHandle}>
            @{contactName || nativeUserId}
          </Text>
          <Text style={styles.headerHint}>
            This will create a new {meta.label} conversation with this customer.
          </Text>
        </View>

        <View
          style={[
            styles.infoBanner,
            {
              borderColor: `${meta.color}55`,
              backgroundColor: `${meta.color}11`,
            },
          ]}
        >
          <Icon name={meta.icon} size={18} color={meta.color} />
          <Text style={[styles.infoBannerText, { color: meta.color }]}>
            {meta.hint}
          </Text>
        </View>

        <Text style={styles.label}>Message *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={message}
          onChangeText={setMessage}
          placeholder={`Type your ${meta.label} message...`}
          placeholderTextColor="#999"
          multiline
          numberOfLines={6}
          maxLength={2000}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: meta.color },
            sending && styles.buttonDisabled,
          ]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send & Start Chat</Text>
          )}
        </TouchableOpacity>

        {/* Cancel */}
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
  contactHandle: {
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  sendButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 15,
  },
});

export default SocialMessageScreen;
