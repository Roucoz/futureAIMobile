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
  StyleProp,
  TextStyle,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';
import { useChat, useAuth, useModule } from '../../stores';
import { resolveImageUrl } from '../../utils/imageUrl';
import { getConversationChannel } from '../../utils/channel';
import { useContactProfile } from '../../hooks/useContactProfile';
import { leadService } from '../../services/api/lead.service';
import { ChatStackParamList } from '../../navigation/types';
import VoicePlayer from '../../components/audio/VoicePlayer';
import ScreenBackground from '../../components/common/ScreenBackground';

type ChatDetailRouteProp = RouteProp<ChatStackParamList, 'ChatDetail'>;

/**
 * Visitor avatar per channel.
 *
 * A chat used to show a generic person icon, which told the agent nothing and
 * looked like a photo that failed to load. The channel's own emoji answers the
 * question an agent actually asks ("where does this person write from?") and
 * doubles as the button that opens their customer file.
 */
const CHANNEL_AVATARS: Record<string, { emoji: string; bg: string }> = {
  WHATSAPP: { emoji: '💬', bg: '#25D366' },
  WIDGET: { emoji: '🌐', bg: '#1890ff' },
  TELEGRAM: { emoji: '✈️', bg: '#0088cc' },
  INSTAGRAM: { emoji: '📸', bg: '#E4405F' },
  FACEBOOK_MESSENGER: { emoji: '💬', bg: '#9146FF' },
  SMS: { emoji: '✉️', bg: '#52c41a' },
  EMAIL: { emoji: '📧', bg: '#8c8c8c' },
};

const avatarForChannel = (channel?: string | null) =>
  CHANNEL_AVATARS[(channel || 'WIDGET').toUpperCase()] ??
  CHANNEL_AVATARS.WIDGET;

/**
 * Parses **bold** markers in text and returns a single <Text> with nested children.
 * Android requires all children inside <Text> to also be <Text> elements.
 */
const renderFormattedText = (
  content: string,
  style: StyleProp<TextStyle>,
): React.ReactNode => {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return (
            <Text key={index} style={{ fontWeight: 'bold' }}>
              {boldText}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

const ChatDetailScreen = observer(() => {
  const route = useRoute<ChatDetailRouteProp>();
  const navigation = useNavigation();
  const chatStore = useChat();
  const { openContact, contactProfileModal } = useContactProfile();
  const authStore = useAuth();
  const moduleStore = useModule();
  const { conversationId } = route.params;

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  // Guards against double-navigation when the viewed chat gets closed.
  const leftScreenRef = useRef(false);

  const messages = chatStore.conversationDetail?.messages || [];

  // Channel drives the visitor avatar and the message-sending rules below.
  const activeConversation =
    chatStore.conversationDetail ?? chatStore.selectedConversation;
  const conversationChannel = activeConversation
    ? getConversationChannel(
        activeConversation.channel,
        activeConversation.domain,
      )
    : 'WIDGET';

  // AI on/off for this conversation. "Human in control" is the same state the
  // web dashboard uses to pause the assistant.
  const conversationMode = activeConversation?.mode ?? 'AI_ACTIVE';
  const aiIsOn = conversationMode === 'AI_ACTIVE';
  // Closed conversations are read-only in the app (claim/close stay available).
  const isClosedConversation = activeConversation?.status === 'CLOSED';
  const [aiToggling, setAiToggling] = useState(false);

  const handleToggleAi = async () => {
    if (aiToggling) return;
    const conversationId = chatStore.conversationDetail?.id;
    if (!conversationId) return;

    setAiToggling(true);
    try {
      await chatStore.updateConversationMode(
        conversationId,
        aiIsOn ? 'HUMAN_TAKEOVER' : 'AI_ACTIVE',
      );
    } catch {
      Alert.alert('Error', 'Failed to change the AI mode');
    } finally {
      setAiToggling(false);
    }
  };

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

  // Tracks that this conversation's detail has loaded at least once, so the
  // guard below never fires before we actually have something on screen.
  const detailLoadedRef = useRef(false);

  useEffect(() => {
    if (
      chatStore.conversationDetail &&
      chatStore.conversationDetail.id === conversationId
    ) {
      detailLoadedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatStore.conversationDetail, conversationId]);

  // Whether the viewed conversation still exists in the loaded list.
  const conversationExists = chatStore.conversations.some(
    c => c.id === conversationId,
  );

  // When the currently-viewed conversation is closed (by the AI auto-close,
  // another agent, or this user), the store clears its details — leave the
  // detail screen so the closed chat is no longer shown and can't be closed
  // again.
  useEffect(() => {
    if (
      !leftScreenRef.current &&
      detailLoadedRef.current &&
      !chatStore.isDetailLoading &&
      chatStore.conversationDetail === null &&
      chatStore.selectedChatId === null &&
      !conversationExists
    ) {
      leftScreenRef.current = true;
      navigation.goBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    conversationId,
    chatStore.isDetailLoading,
    chatStore.conversationDetail,
    chatStore.selectedChatId,
    conversationExists,
    navigation,
  ]);

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

  /**
   * Everything an agent can do with the conversation they are reading. The list
   * is built per chat: module- and permission-gated actions only appear when they
   * can actually be used, and "Claim chat" only when nobody owns it yet.
   */
  const showActionSheet = async () => {
    const conversation =
      chatStore.conversationDetail ?? chatStore.selectedConversation;
    if (!conversation) return;

    // Module flags drive which actions exist at all
    await moduleStore.ensureLoaded();

    const isOwner =
      !!conversation.assignedToMemberId &&
      conversation.assignedToMemberId === authStore.memberId;

    // Check permissions
    const hasClosePermission = authStore.permissions.some(
      p => p.resource === 'chats' && p.actions.includes('close'),
    );
    const hasTicketPermission = authStore.permissions.some(
      p => p.resource === 'tickets' && p.actions.includes('create'),
    );
    const hasLeadPermission = authStore.permissions.some(
      p => p.resource === 'leads' && p.actions.includes('create'),
    );

    const ticketEnabled = moduleStore.isLoaded && moduleStore.ticketing;
    const leadEnabled = moduleStore.isLoaded && moduleStore.leads;

    // Menu, in the order an agent is likely to need it.
    const actions: Array<{ label: string; run: () => void; danger?: boolean }> =
      [
        {
          label: 'Open customer profile',
          run: () => void handleOpenCustomer(),
        },
      ];

    if (leadEnabled && hasLeadPermission) {
      actions.push({
        label: 'Create Lead',
        run: () => void handleCreateLead(),
      });
    }
    if (ticketEnabled && hasTicketPermission) {
      actions.push({
        label: 'Create Ticket',
        run: () => void handleCreateTicket(),
      });
    }
    if (!isOwner && conversation.status !== 'CLOSED') {
      actions.push({ label: 'Claim Chat', run: () => void handleClaimChat() });
    }
    // Nothing to close on a closed conversation.
    if (hasClosePermission && conversation.status !== 'CLOSED') {
      actions.push({
        label: 'Close Chat',
        run: () => handleCloseChat(),
        danger: true,
      });
    }

    const options = [...actions.map(action => action.label), 'Cancel'];
    const cancelIndex = options.length - 1;
    const destructiveIndex = actions.findIndex(action => action.danger);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex:
            destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        buttonIndex => {
          const action = actions[buttonIndex];
          if (action && buttonIndex !== cancelIndex) action.run();
        },
      );
    } else {
      // Android: Alert supports at most three buttons, so the same list is shown
      // as a scrollable sheet-like Alert is not available — fall back to a menu.
      Alert.alert(
        'Chat actions',
        'Choose an action',
        [
          ...actions.map(action => ({
            text: action.label,
            onPress: action.run,
            style: action.danger ? ('destructive' as const) : undefined,
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
        { cancelable: true },
      );
    }
  };

  /** Opens the customer file for this conversation (website visitors have none). */
  const handleOpenCustomer = async () => {
    const conversation =
      chatStore.conversationDetail ?? chatStore.selectedConversation;
    if (!conversation) return;
    // `displayTitle` only exists on the list preview; the detail model carries
    // the raw visitor id.
    const displayName =
      chatStore.selectedConversation?.displayTitle ?? conversation.visitorId;
    await openContact(conversation.visitorId, displayName);
  };

  /** Turns the current conversation into a sales lead. */
  const handleCreateLead = async () => {
    const conversation = chatStore.conversationDetail;
    if (!conversation) return;

    try {
      await leadService.createLead({
        conversationId: conversation.id,
        summary: chatStore.selectedConversation?.displayTitle ?? null,
      });
      Alert.alert(
        'Lead created',
        'This chat now appears in the sales pipeline.',
      );
    } catch (error: any) {
      console.error('Failed to create lead:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.error || 'Failed to create the lead',
      );
    }
  };

  /** Takes ownership of an unassigned conversation. */
  const handleClaimChat = async () => {
    const conversationId = chatStore.conversationDetail?.id;
    if (!conversationId) return;

    try {
      await chatStore.claimConversation(conversationId);
      Alert.alert('Chat claimed', 'This conversation is now assigned to you.');
    } catch {
      Alert.alert('Error', 'Failed to claim the conversation');
    }
  };

  const handleCreateTicket = async () => {
    await moduleStore.ensureLoaded();
    if (!moduleStore.ticketing) {
      Alert.alert(
        'Module Not Enabled',
        'The Tickets module is not enabled for your account.\n\nYou can enable it from the admin panel on the website (Configuration → Modules).',
      );
      return;
    }

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
              // Navigate away unless the reactive guard already did (e.g. the
              // close was also broadcast over WebSocket first).
              if (!leftScreenRef.current) {
                leftScreenRef.current = true;
                navigation.goBack();
              }
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

    // Channel + status gating for sending on mobile:
    // - Facebook/Instagram replies aren't supported yet → inform "coming soon".
    // - Closed widget chats can no longer receive messages → block.
    // - WhatsApp/Telegram still deliver even when closed → allowed.
    const conversation =
      chatStore.conversationDetail ?? chatStore.selectedConversation;
    if (conversation) {
      const channel = getConversationChannel(
        conversation.channel,
        conversation.domain,
      );
      const status = conversation.status || 'OPEN';

      if (channel === 'FACEBOOK_MESSENGER' || channel === 'INSTAGRAM') {
        Alert.alert(
          'Coming Soon',
          'Sending messages to Facebook and Instagram chats is coming soon.',
        );
        return;
      }

      if (
        channel === 'WIDGET' &&
        (status === 'CLOSED' || status === 'ARCHIVED')
      ) {
        Alert.alert(
          'This chat is closed',
          'You can only send messages to WhatsApp and Telegram chats once they are closed.',
        );
        return;
      }
    }

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
    const visitorAvatar = avatarForChannel(conversationChannel);
    return (
      <View
        style={[
          styles.messageContainer,
          isRight && styles.agentMessageContainer,
        ]}
      >
        {/* Visitor avatar: the emoji of the channel they wrote from, so a chat
            is recognisable at a glance. Tapping it opens their customer file. */}
        {!isRight && (
          <TouchableOpacity
            style={[
              styles.avatarSmall,
              styles.avatarSmallLeft,
              { backgroundColor: visitorAvatar.bg },
            ]}
            onPress={() => void handleOpenCustomer()}
            accessibilityLabel="Open customer profile"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.avatarEmoji}>{visitorAvatar.emoji}</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.messageBubble, isRight && styles.agentBubble]}>
          {/* Text Content */}
          {item.content &&
            renderFormattedText(item.content, [
              styles.messageText,
              isRight && styles.agentText,
            ])}

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
            <Image
              source={require('../../assets/images/sparkles.png')}
              style={[styles.avatarSmall, styles.avatarSmallAi]}
              resizeMode="contain"
            />
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

        {isClosedConversation ? (
          // A closed chat is read-only: show why, instead of an input that the
          // server would reject anyway.
          <View style={styles.closedNotice}>
            <Icon name="lock-closed-outline" size={16} color="#8c8c8c" />
            <Text style={styles.closedNoticeText}>
              This conversation is closed. Reopen it from the web dashboard to
              reply.
            </Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            {/* AI switch: same meaning as the web "AI Active / Human" toggle —
                pausing the assistant hands the chat to a person. */}
            <TouchableOpacity
              style={[
                styles.aiButton,
                aiIsOn ? styles.aiButtonOn : styles.aiButtonOff,
              ]}
              onPress={() => void handleToggleAi()}
              disabled={aiToggling || chatStore.isUpdatingMode}
              accessibilityLabel={
                aiIsOn
                  ? 'Pause the AI for this chat'
                  : 'Let the AI answer again'
              }
            >
              {aiToggling || chatStore.isUpdatingMode ? (
                <ActivityIndicator
                  size="small"
                  color={aiIsOn ? '#fff' : '#8c8c8c'}
                />
              ) : (
                <Icon
                  name={aiIsOn ? 'sparkles' : 'pause'}
                  size={18}
                  color={aiIsOn ? '#fff' : '#8c8c8c'}
                />
              )}
            </TouchableOpacity>

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
        )}
      </View>

      {/* Customer profile opened from the chat; closing it returns to the chat. */}
      {contactProfileModal}
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
  avatarEmoji: {
    fontSize: 14,
    lineHeight: 18,
  },
  avatarSmallAgent: {
    backgroundColor: '#1890ff',
    marginRight: 0,
    marginLeft: 8,
  },
  avatarSmallAi: {
    // The AI mark is a bundled bitmap with a white background, so it is clipped
    // to the same circle as the other avatars.
    backgroundColor: '#ffffff',
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
  aiButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiButtonOn: {
    backgroundColor: '#722ed1',
  },
  aiButtonOff: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  closedNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#8c8c8c',
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
