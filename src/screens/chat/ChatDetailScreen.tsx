/**
 * Chat Detail Screen
 * Displays messages and allows sending messages
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { useChat } from '../../stores';
import { ChatStackParamList } from '../../navigation/types';

type ChatDetailRouteProp = RouteProp<ChatStackParamList, 'ChatDetail'>;

const ChatDetailScreen = observer(() => {
  const route = useRoute<ChatDetailRouteProp>();
  const navigation = useNavigation();
  const chatStore = useChat();
  const { conversationId } = route.params;

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Load messages for this conversation
    chatStore.loadMessages(conversationId);
    chatStore.selectConversation(conversationId);

    // Set header title to customer name
    const conversation = chatStore.selectedConversation;
    if (conversation) {
      navigation.setOptions({
        headerTitle: conversation.customerName,
      });
    }

    return () => {
      chatStore.selectConversation(null);
    };
  }, [conversationId]);

  const handleSend = async () => {
    if (!messageText.trim()) return;

    setSending(true);
    try {
      await chatStore.sendMessage(conversationId, messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isAgent = item.sender === 'AGENT' || item.sender === 'AI';
    const time = format(new Date(item.timestamp), 'HH:mm');

    return (
      <View style={[styles.messageContainer, isAgent && styles.agentMessageContainer]}>
        <View style={[styles.messageBubble, isAgent && styles.agentBubble]}>
          <Text style={[styles.messageText, isAgent && styles.agentText]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isAgent && styles.agentTime]}>
            {time}
          </Text>
        </View>
      </View>
    );
  };

  if (chatStore.loading && chatStore.selectedConversationMessages.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <FlatList
        data={chatStore.selectedConversationMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || sending}>
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  messageContainer: {
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  agentMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  agentBubble: {
    backgroundColor: '#1890ff',
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
  agentText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    alignSelf: 'flex-end',
  },
  agentTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#1890ff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ChatDetailScreen;
