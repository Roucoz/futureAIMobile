/**
 * Conversation List Screen
 * Shows all customer conversations with filter tabs
 */

import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useNavigation } from '@react-navigation/native';
import { useChat } from '../../stores';
import ConversationCard from '../../components/chat/ConversationCard';

const ConversationListScreen = observer(() => {
  const navigation = useNavigation();
  const chatStore = useChat();
  const [activeTab, setActiveTab] = useState<'OPEN' | 'CLOSED' | 'ARCHIVED'>('OPEN');

  useEffect(() => {
    chatStore.loadConversations(activeTab);
  }, [activeTab]);

  const handleRefresh = () => {
    chatStore.loadConversations(activeTab);
  };

  const handleConversationPress = (conversationId: string) => {
    chatStore.selectChat(conversationId);
    navigation.navigate('ChatDetail', { conversationId });
  };

  const handleTabChange = (tab: 'OPEN' | 'CLOSED' | 'ARCHIVED') => {
    setActiveTab(tab);
    chatStore.setChatStatus(tab);
  };

  if (chatStore.isLoading && chatStore.conversations.length === 0) {
    return (
      <View style={styles.container}>
        {/* Filter Tabs */}
        <View style={styles.tabsContainer}>
          {(['OPEN', 'CLOSED', 'ARCHIVED'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => handleTabChange(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </View>
    );
  }

  if (chatStore.conversations.length === 0) {
    return (
      <View style={styles.container}>
        {/* Filter Tabs */}
        <View style={styles.tabsContainer}>
          {(['OPEN', 'CLOSED', 'ARCHIVED'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => handleTabChange(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} conversations</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'OPEN'
              ? 'Conversations will appear here when customers contact you'
              : `No ${activeTab.toLowerCase()} conversations found`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {(['OPEN', 'CLOSED', 'ARCHIVED'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {/* Show count badge */}
            {activeTab === tab && chatStore.conversations.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{chatStore.conversations.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Conversation List */}
      <FlatList
        data={chatStore.sortedConversations}
        renderItem={({ item }) => (
          <ConversationCard
            conversation={item}
            onPress={() => handleConversationPress(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={chatStore.isLoading}
            onRefresh={handleRefresh}
            tintColor="#1890ff"
          />
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f9',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#1890ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  countBadge: {
    marginLeft: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f9',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default ConversationListScreen;
