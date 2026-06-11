/**
 * Chat Detail Screen
 * Displays messages and allows sending messages
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Keyboard,
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
  StatusBar,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';
import { useChat, useAuth } from '../../stores';
import { resolveImageUrl } from '../../utils/imageUrl';
import { ChatStackParamList } from '../../navigation/types';
import VoicePlayer from '../../components/audio/VoicePlayer';
import ScreenBackground from '../../components/common/ScreenBackground';

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  const messages = chatStore.conversationDetail?.messages || [];

  const scrollToBottom = useCallback(
    (animated: boolean = true) => {
      if (flatListRef.current && messages.length > 0) {
        flatListRef.current.scrollToEnd({ animated });
        setShowNewMessagesButton(false);
        setIsAtBottom(true);
      }
    },
    [messages.length],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;

      // Check if user is at the bottom (with 50px threshold)
      const isBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 50;

      setIsAtBottom(isBottom);

      // Hide button if user scrolls to bottom
      if (isBottom) {
        setShowNewMessagesButton(false);
      }
    },
    [],
  );

  useEffect(() => {
    // Load conversation detail with messages
    chatStore.selectChat(conversationId);

    return () => {
      chatStore.selectChat(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Track keyboard height to push input bar up on both platforms
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', e => {
      const height =
        Platform.OS === 'android'
          ? e.endCoordinates.height - (StatusBar.currentHeight ?? 24)
          : e.endCoordinates.height;
      setKeyboardHeight(height);
      setTimeout(() => scrollToBottom(true), 100);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  // Set header options
  useEffect(() => {
    const conversation = chatStore.selectedConversation;
    if (conversation) {
      navigation.setOptions({
        headerTitle: conversation.displayTitle || conversation.customerName,
        headerRight: () => (
          <TouchableOpacity
            onPress={showActionSheet}
            style={styles.headerButton}
          >
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
      p => p.resource === 'chats' && p.actions.includes('close'),
    );
    const hasTicketPermission = authStore.permissions.some(
      p => p.resource === 'tickets' && p.actions.includes('create'),
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
          destructiveButtonIndex: hasClosePermission
            ? options.indexOf('Close Chat')
            : undefined,
        },
        buttonIndex => {
          if (options[buttonIndex] === 'Create Ticket') {
            handleCreateTicket();
          } else if (options[buttonIndex] === 'Close Chat') {
            handleCloseChat();
          }
        },
      );
    } else {
      // Android: Show alert with options
      Alert.alert('Actions', 'Choose an action', [
        ...(hasTicketPermission
          ? [{ text: 'Create Ticket', onPress: handleCreateTicket }]
          : []),
        ...(hasClosePermission
          ? [
              {
                text: 'Close Chat',
                onPress: handleCloseChat,
                style: 'destructive' as const,
              },
            ]
          : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
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
      await chatStore.sendReply(
        conversationId,
        messageText.trim(),
        authStore.memberId,
      );
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
    const isAgent = item.senderType === 'agent';
    const isBot = item.senderType === 'bot';
    const isRight = isAgent || isBot; // agent + bot messages on the right
    const time = format(new Date(item.createdAt), 'HH:mm');
    const hasAudio = item.attachmentType === 'audio' && item.attachmentUrl;
    const hasImage = item.attachmentType === 'image' && item.attachmentUrl;
    const senderAvatar = item.senderAvatarUrl;

    return (
      <View
        style={[
          styles.messageContainer,
          isRight && styles.agentMessageContainer,
        ]}
      >
        {/* Visitor Avatar (left side) */}
        {!isRight && (
          <View style={[styles.avatarSmall, styles.avatarSmallLeft]}>
            <Icon name="person" size={16} color="#fff" />
          </View>
        )}

        <View style={[styles.messageBubble, isRight && styles.agentBubble]}>
          {/* Text Content */}
          {item.content && (
            <Text style={[styles.messageText, isRight && styles.agentText]}>
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

          <Text style={[styles.messageTime, isRight && styles.agentTime]}>
            {time}
          </Text>
        </View>

        {/* Agent/Bot Avatar (right side) */}
        {isRight &&
          (senderAvatar ? (
            <Image
              source={{ uri: resolveImageUrl(senderAvatar)! }}
              style={styles.avatarSmall}
            />
          ) : isBot ? (
            <View style={[styles.avatarSmall, styles.avatarSmallBot]}>
              <Icon name="flash" size={14} color="#fff" />
            </View>
          ) : (
            <View style={[styles.avatarSmall, styles.avatarSmallAgent]}>
              <Text style={styles.avatarSmallText}>
                {item.senderName?.[0]?.toUpperCase() || 'A'}
              </Text>
            </View>
          ))}
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
    <ScreenBackground>
      <View style={[styles.innerContainer, { paddingBottom: keyboardHeight }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          }
        />

        {showNewMessagesButton && (
          <TouchableOpacity
            style={[styles.newMessagesButton, { bottom: 80 + keyboardHeight }]}
            onPress={() => scrollToBottom(true)}
          >
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
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScreenBackground>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: 'transparent',
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
    flexDirection: 'row',
  },
  agentMessageContainer: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#bfbfbf',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
    marginLeft: 8,
    marginTop: 4,
  },
  avatarSmallLeft: {
    marginRight: 8,
  },
  avatarSmallAgent: {
    backgroundColor: '#1890ff',
    marginRight: 0,
    marginLeft: 8,
  },
  avatarSmallBot: {
    backgroundColor: '#722ed1',
    marginRight: 0,
    marginLeft: 8,
  },
  avatarSmallText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
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
    marginRight: 0,
    marginLeft: 8,
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
