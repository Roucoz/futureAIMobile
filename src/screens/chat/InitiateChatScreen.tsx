/**
 * Initiate Chat Screen
 * Start a new WhatsApp conversation with a customer who has no existing chat.
 * Mirrors the web admin flow:
 *  - Within the 24h WhatsApp window → send a free-form message.
 *  - Outside the 24h window → the agent must pick an APPROVED template and
 *    fill in its variables before the message can be sent.
 */

import React, { useEffect, useState } from 'react';
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
import contactService, {
  WhatsAppTemplate,
} from '../../services/api/contact.service';

type InitiateChatRouteProp = RouteProp<
  { InitiateChat: { phoneNumber: string; contactName?: string } },
  'InitiateChat'
>;

const InitiateChatScreen = () => {
  const route = useRoute<InitiateChatRouteProp>();
  const navigation = useNavigation();
  const authStore = useAuth();
  const { phoneNumber, contactName } = route.params;

  const [within24Hours, setWithin24Hours] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WhatsAppTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<
    Record<string, string>
  >({});
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const eligibility = await contactService.checkEligibility(phoneNumber);
        setWithin24Hours(eligibility.within24Hours);

        // Outside the 24h window → the user must choose an approved template
        if (!eligibility.within24Hours) {
          setLoadingTemplates(true);
          try {
            const list = await contactService.getApprovedWhatsAppTemplates();
            setTemplates(list);
          } catch (error) {
            console.error('Failed to load templates:', error);
            Alert.alert('Error', 'Failed to load WhatsApp templates');
          } finally {
            setLoadingTemplates(false);
          }
        }
      } catch (error: any) {
        console.error('Failed to check eligibility:', error);
        Alert.alert(
          'Error',
          error.message || 'Failed to check conversation eligibility',
        );
      } finally {
        setChecking(false);
      }
    };
    init();
  }, [phoneNumber]);

  const selectTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    // Extract variables from bodyText like {{1}}, {{2}}, ...
    const matches = template.bodyText.match(/\{\{\d+\}\}/g) || [];
    const vars: Record<string, string> = {};
    matches.forEach((_, index) => {
      vars[`var${index + 1}`] = '';
    });
    setTemplateVariables(vars);
  };

  const handleSend = async () => {
    const agentId = authStore.memberId;
    if (!agentId) {
      Alert.alert('Error', 'No agent profile found. Please log in again.');
      return;
    }

    if (within24Hours) {
      if (!message.trim()) {
        Alert.alert('Error', 'Please enter a message');
        return;
      }
    } else {
      if (!selectedTemplate) {
        Alert.alert('Error', 'Please select a template');
        return;
      }
      const missingVars = Object.keys(templateVariables).filter(
        key => !templateVariables[key]?.trim(),
      );
      if (missingVars.length > 0) {
        Alert.alert('Error', 'Please fill in all template variables');
        return;
      }
    }

    setSending(true);
    try {
      const payload: {
        phoneNumber: string;
        agentId: string;
        message?: string;
        templateId?: string;
        templateParams?: string[];
      } = { phoneNumber, agentId };

      if (within24Hours) {
        payload.message = message.trim();
      } else if (selectedTemplate) {
        payload.templateId = selectedTemplate.id;
        payload.templateParams = Object.values(templateVariables);
      }

      const { conversationId } = await contactService.initiateConversation(
        payload,
      );

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
      console.error('Failed to initiate chat:', error);
      const requiresTemplate = error.data?.requiresTemplate;
      if (requiresTemplate) {
        Alert.alert(
          'Cannot Initiate WhatsApp Conversation',
          'WhatsApp policy: you cannot send free-form messages to start a conversation.\n\nYour options:\n• Wait for the customer to message you first\n• Use an approved WhatsApp Message Template\n• Contact the customer via phone or other channels',
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to initiate chat');
      }
    } finally {
      setSending(false);
    }
  };

  const canSend =
    !checking &&
    !loadingTemplates &&
    !sending &&
    (within24Hours === true || templates.length > 0);

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
            This will create a new WhatsApp conversation with this customer.
          </Text>
        </View>

        {checking ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color="#1890ff" />
            <Text style={styles.loadingText}>Checking eligibility...</Text>
          </View>
        ) : within24Hours ? (
          /* Free-form message (within 24 hours) */
          <>
            <View style={styles.infoBanner}>
              <Icon name="checkmark-circle" size={18} color="#52c41a" />
              <Text style={styles.infoBannerText}>
                Free-form messaging available (customer messaged within 24
                hours)
              </Text>
            </View>

            <Text style={styles.label}>Initial Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message to start the conversation..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              maxLength={2000}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.sendButton, sending && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send & Start Chat</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* Template selection (outside 24 hours) */
          <>
            <View style={styles.warningBanner}>
              <Icon name="warning" size={18} color="#fa8c16" />
              <Text style={styles.warningText}>
                WhatsApp 24-Hour Policy: after 24 hours since the customer's
                last message, you must use an approved message template to reach
                them.
              </Text>
            </View>

            {loadingTemplates ? (
              <View style={styles.centerLoader}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={styles.loadingText}>Loading templates...</Text>
              </View>
            ) : templates.length === 0 ? (
              <View style={styles.emptyTemplates}>
                <Icon name="document-text-outline" size={56} color="#d9d9d9" />
                <Text style={styles.emptyTitle}>No Approved Templates</Text>
                <Text style={styles.emptyText}>
                  Create and get a WhatsApp template approved from the admin
                  panel to message this customer.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Select Template</Text>
                {templates.map(template => {
                  const isSelected = selectedTemplate?.id === template.id;
                  return (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.templateCard,
                        isSelected && styles.templateCardSelected,
                      ]}
                      onPress={() => selectTemplate(template)}
                    >
                      <View style={styles.templateHeader}>
                        <Text style={styles.templateName}>
                          {template.name} ({template.language})
                        </Text>
                        <Icon
                          name={
                            isSelected ? 'radio-button-on' : 'radio-button-off'
                          }
                          size={20}
                          color={isSelected ? '#1890ff' : '#bbb'}
                        />
                      </View>
                      <Text style={styles.templateBody} numberOfLines={3}>
                        {template.bodyText}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {selectedTemplate && (
                  <View style={styles.previewContainer}>
                    <Text style={styles.label}>Template Preview</Text>
                    <View style={styles.previewBox}>
                      {selectedTemplate.headerText ? (
                        <Text style={styles.previewHeader}>
                          {selectedTemplate.headerText}
                        </Text>
                      ) : null}
                      <Text style={styles.previewBody}>
                        {selectedTemplate.bodyText}
                      </Text>
                      {selectedTemplate.footerText ? (
                        <Text style={styles.previewFooter}>
                          {selectedTemplate.footerText}
                        </Text>
                      ) : null}
                    </View>

                    {Object.keys(templateVariables).length > 0 && (
                      <>
                        <Text style={styles.label}>
                          Fill Template Variables
                        </Text>
                        {Object.keys(templateVariables).map((key, index) => (
                          <TextInput
                            key={key}
                            style={styles.input}
                            value={templateVariables[key]}
                            onChangeText={text =>
                              setTemplateVariables(prev => ({
                                ...prev,
                                [key]: text,
                              }))
                            }
                            placeholder={`Enter value for {{${index + 1}}}`}
                            placeholderTextColor="#999"
                          />
                        ))}
                      </>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!canSend || sending) && styles.buttonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!canSend || sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.sendButtonText}>Send & Start Chat</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}

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
  centerLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6ffed',
    borderColor: '#b7eb8f',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#389e0d',
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#fffbe6',
    borderColor: '#ffe58f',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#ad6800',
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
  templateCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  templateCardSelected: {
    borderColor: '#1890ff',
    backgroundColor: '#e6f7ff',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  templateBody: {
    fontSize: 13,
    color: '#666',
  },
  previewContainer: {
    marginTop: 8,
  },
  previewBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  previewHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  previewBody: {
    fontSize: 14,
    color: '#333',
  },
  previewFooter: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  emptyTemplates: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
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

export default InitiateChatScreen;
