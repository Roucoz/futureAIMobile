/**
 * Chat Detail Screen
 * Displays messages and allows sending messages
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Alert,
  ActionSheetIOS,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { useChat, useAuth } from '../../stores';
import { ChatStackParamList } from '../../navigation/types';
import VoicePlayer from '../../components/audio/VoicePlayer';

type ChatDetailRouteProp = RouteProp<ChatStackParamList, 'ChatDetail'>;

const ChatDetailScreen = observer(() => {
  const route = useRoute<ChatDetailRouteProp>();
  const navigation = useNavigation();
  const chatStore = useChat();
  const authStore = useAuth();
  const { conversationId } = route.params;

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  
  const flatListRef = useRef<FlatList>(null);

  const messages = chatStore.conversationDetail?.messages || [];

  const scrollToBottom = useCallback((animated: boolean = true) => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated });
      setShowNewMessagesButton(false);
      setIsAtBottom(true);
    }
  }, [messages.length]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    
    // Check if user is at the bottom (with 50px threshold)
    const isBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 50;
    
    setIsAtBottom(isBottom);
    
    // Hide button if user scrolls to bottom
    if (isBottom) {
      setShowNewMessagesButton(false);
    }
  }, []);

  useEffect(() => {
    // Load conversation detail with messages
    chatStore.selectChat(conversationId);

    return () => {
      chatStore.selectChat(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Set header options
  useEffect(() => {
    const conversation = chatStore.selectedConversation;
    if (conversation) {
      navigation.setOptions({
        headerTitle: conversation.displayTitle || conversation.customerName,
        headerRight: () => (
          <TouchableOpacity onPress={showActionSheet} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>⋮</Text>
          </TouchableOpacity>
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, chatStore.selectedConversation?.displayTitle]);

  // Auto-scroll to bottom when messages load initially
  useEffect(() => {
    if (messages.length > 0 && previousMessageCount === 0) {
      setTimeout(() => {
        scrollToBottom(false);
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, previousMessageCount]);

  // Handle new messages
  useEffect(() => {
    if (messages.length > previousMessageCount && previousMessageCount > 0) {
      // New message arrived
      if (isAtBottom) {
        // Auto-scroll if user is at bottom
        setTimeout(() => {
          scrollToBottom(true);
        }, 100);
        setShowNewMessagesButton(false);
      } else {
        // Show "New Messages" button if user scrolled up
        setShowNewMessagesButton(true);
      }
    }
    setPreviousMessageCount(messages.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isAtBottom, scrollToBottom]);

  const showActionSheet = () => {
    const conversation = chatStore.selectedConversation;
    if (!conversation) return;

    // Check permissions
    const hasClosePermission = authStore.permissions.some(
      (p) => p.resource === 'chats' && p.actions.includes('close'),
    );
    const hasTicketPermission = authStore.permissions.some(
      (p) => p.resource === 'tickets' && p.actions.includes('create'),
    );

    const options: string[] = [];
    if (hasTicketPermission) options.push('Create Ticket');
    if (hasClosePermission) options.push('Close Chat');
    options.push('Cancel');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: hasClosePermission ? options.indexOf('Close Chat') : undefined,
        },
        (buttonIndex) => {
          if (options[buttonIndex] === 'Create Ticket') {
            handleCreateTicket();
          } else if (options[buttonIndex] === 'Close Chat') {
            handleCloseChat();
          }
        },
      );
    } else {
      // Android: Show alert with options
      Alert.alert(
        'Actions',
        'Choose an action',
        [
          ...(hasTicketPermission
            ? [{ text: 'Create Ticket', onPress: handleCreateTicket }]
            : []),
          ...(hasClosePermission
            ? [{ text: 'Close Chat', onPress: handleCloseChat, style: 'destructive' as const }]
            : []),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      );
    }
  };

  const handleCreateTicket = () => {
    // Navigate to ticket creation screen
    // @ts-ignore - Navigation types need to be extended for cross-stack navigation
    navigation.navigate('CreateTicket', { conversationId });
  };

  const handleCloseChat = () => {
    Alert.alert(
      'Close Chat',
      'Are you sure you want to close this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatStore.closeConversation(conversationId);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to close conversation');
            }
          },
        },
      ],
    );
  };

  const handleSend = async () => {
    if (!messageText.trim() || !authStore.memberId) return;

    setSending(true);
    try {
      // Use authStore.memberId (ProjectMember.id) as agentId
      await chatStore.sendReply(conversationId, messageText.trim(), authStore.memberId);
      setMessageText('');
      
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isAgent = item.senderType === 'agent' || item.senderType === 'bot';
    const time = format(new Date(item.createdAt), 'HH:mm');
    const hasAudio = item.attachmentType === 'audio' && item.attachmentUrl;
    const hasImage = item.attachmentType === 'image' && item.attachmentUrl;

    return (
      <View style={[styles.messageContainer, isAgent && styles.agentMessageContainer]}>
        <View style={[styles.messageBubble, isAgent && styles.agentBubble]}>
          {/* Text Content */}
          {item.content && (
            <Text style={[styles.messageText, isAgent && styles.agentText]}>
              {item.content}
            </Text>
          )}

          {/* Voice Message */}
          {hasAudio && (
            <VoicePlayer
              audioUrl={item.attachmentUrl}
              transcription={item.transcription || null}
            />
          )}

          {/* Image Message */}
          {hasImage && (
            <Image
              source={{ uri: item.attachmentUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          <Text style={[styles.messageTime, isAgent && styles.agentTime]}>
            {time}
          </Text>
        </View>
      </View>
    );
  };

  if (chatStore.isDetailLoading && messages.length === 0) {
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
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        }
      />

      {/* New Messages Button (floating) */}
      {showNewMessagesButton && (
        <TouchableOpacity
          style={styles.newMessagesButton}
          onPress={() => scrollToBottom(true)}>
          <Text style={styles.newMessagesButtonText}>↓ New Messages</Text>
        </TouchableOpacity>
      )}

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
  headerButton: {
    marginRight: 16,
  },
  headerButtonText: {
    fontSize: 24,
    color: '#1890ff',
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
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 4,
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
  newMessagesButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#1890ff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  newMessagesButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ChatDetailScreen;
