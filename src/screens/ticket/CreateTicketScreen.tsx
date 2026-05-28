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
import { useChat } from '../../stores';

type CreateTicketRouteProp = RouteProp<{ CreateTicket: { conversationId: string } }, 'CreateTicket'>;

const CreateTicketScreen = () => {
  const route = useRoute<CreateTicketRouteProp>();
  const navigation = useNavigation();
  const chatStore = useChat();
  const { conversationId } = route.params;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pre-fill with conversation context
    const conversation = chatStore.conversations.find((c) => c.id === conversationId);
    if (conversation) {
      setTitle(`Support request from ${conversation.customerName || conversation.visitorId}`);
      
      // Get last few messages as context
      const lastMessages = conversation.messages
        .slice(-3)
        .map((m) => `${m.senderType}: ${m.content}`)
        .join('\n');
      setDescription(`Conversation:\n${lastMessages}`);
    }
  }, [conversationId]);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setLoading(true);
    try {
      await ticketService.createTicketFromConversation(
        conversationId,
        title.trim(),
        description.trim(),
        priority,
      );

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Create Ticket from Conversation</Text>

      {/* Title */}
      <View style={styles.field}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter ticket title"
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
          {priorities.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.priorityButton,
                priority === p.value && { backgroundColor: p.color, borderColor: p.color },
              ]}
              onPress={() => setPriority(p.value)}>
              <Text
                style={[
                  styles.priorityText,
                  priority === p.value && styles.priorityTextActive,
                ]}>
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
        disabled={loading}>
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
        disabled={loading}>
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
