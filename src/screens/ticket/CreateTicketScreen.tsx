/**
 * Create Ticket Screen
 * Create a ticket from a conversation
 */

import React, { useState, useEffect } from 'react';
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
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { ticketService } from '../../services/api/ticket.service';
import { useChat, useModule } from '../../stores';
import ModuleNotEnabled from '../../components/common/ModuleNotEnabled';

type CreateTicketRouteProp = RouteProp<
  { CreateTicket: { customerId?: string; conversationId?: string } },
  'CreateTicket'
>;

const CreateTicketScreen = () => {
  const route = useRoute<CreateTicketRouteProp>();
  const navigation = useNavigation();
  const chatStore = useChat();
  const moduleStore = useModule();
  const { conversationId, customerId } = route.params;

  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<
    'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  >('MEDIUM');
  const [loading, setLoading] = useState(false);

  // Ensure the ticketing module status is loaded before gating the screen
  useEffect(() => {
    moduleStore.ensureLoaded();
  }, [moduleStore]);

  useEffect(() => {
    // Pre-fill with conversation context (conversation-based tickets only)
    if (!conversationId) return;

    const conversation = chatStore.conversations.find(
      c => c.id === conversationId,
    );
    if (conversation) {
      setSummary(
        `Support request from ${
          conversation.customerName || conversation.visitorId
        }`,
      );

      // Get last few messages as context
      const lastMessages = conversation.messages
        .slice(-3)
        .map(m => `${m.senderType}: ${m.content}`)
        .join('\n');
      setDescription(`Conversation:\n${lastMessages}`);
    }
  }, [conversationId, chatStore.conversations]);

  const handleCreate = async () => {
    await moduleStore.ensureLoaded();
    if (!moduleStore.ticketing) {
      Alert.alert(
        'Module Not Enabled',
        'The Tickets module is not enabled for your account.\n\nYou can enable it from the admin panel on the website (Configuration → Modules).',
      );
      return;
    }

    if (!summary.trim()) {
      Alert.alert('Error', 'Please enter a summary');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setLoading(true);
    try {
      if (customerId) {
        // Ticket created directly for the customer (no conversation required)
        await ticketService.createTicket({
          summary: summary.trim(),
          description: description.trim(),
          priority,
          customerId,
        });
      } else if (conversationId) {
        await ticketService.createTicketFromConversation(
          conversationId,
          summary.trim(),
          description.trim(),
          priority,
        );
      }

      Alert.alert('Success', 'Ticket created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const priorities = [
    { value: 'LOW', label: 'Low', color: '#52c41a' },
    { value: 'MEDIUM', label: 'Medium', color: '#1890ff' },
    { value: 'HIGH', label: 'High', color: '#fa8c16' },
    { value: 'URGENT', label: 'Urgent', color: '#ff4d4f' },
  ] as const;

  // Ticketing module disabled → show friendly placeholder instead of the form
  if (moduleStore.isLoaded && !moduleStore.ticketing) {
    return <ModuleNotEnabled iconName="ticket-outline" moduleName="Tickets" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Create New Ticket</Text>

      {/* Summary */}
      <View style={styles.field}>
        <Text style={styles.label}>Summary *</Text>
        <TextInput
          style={styles.input}
          value={summary}
          onChangeText={setSummary}
          placeholder="Enter ticket summary"
          placeholderTextColor="#999"
        />
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter ticket description"
          placeholderTextColor="#999"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      {/* Priority */}
      <View style={styles.field}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityButtons}>
          {priorities.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.priorityButton,
                priority === p.value && {
                  backgroundColor: p.color,
                  borderColor: p.color,
                },
              ]}
              onPress={() => setPriority(p.value)}
            >
              <Text
                style={[
                  styles.priorityText,
                  priority === p.value && styles.priorityTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Create Button */}
      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>Create Ticket</Text>
        )}
      </TouchableOpacity>

      {/* Cancel Button */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f9',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  field: {
    marginBottom: 20,
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
    minHeight: 120,
    paddingTop: 12,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  priorityTextActive: {
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#1890ff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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

export default CreateTicketScreen;
