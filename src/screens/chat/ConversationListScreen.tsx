/**
 * Conversation List Screen
 * Shows all customer conversations with filter tabs
 */

import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useNavigation } from '@react-navigation/native';
import { useChat } from '../../stores';
import ConversationCard from '../../components/chat/ConversationCard';

const ConversationListScreen = observer(() => {
  const navigation = useNavigation();
  const chatStore = useChat();
  const [activeTab, setActiveTab] = useState<'OPEN' | 'CLOSED' | 'CLAIMED'>('OPEN');

  useEffect(() => {
    // Load conversations based on tab (CLAIMED uses OPEN status)
    const statusToLoad = activeTab === 'CLAIMED' ? 'OPEN' : activeTab;
    chatStore.loadConversations(statusToLoad);
  }, [activeTab]);

  const handleRefresh = () => {
    const statusToLoad = activeTab === 'CLAIMED' ? 'OPEN' : activeTab;
    chatStore.loadConversations(statusToLoad);
  };

  const handleConversationPress = (conversationId: string) => {
    chatStore.selectChat(conversationId);
    navigation.navigate('ChatDetail', { conversationId });
  };

  const handleTabChange = (tab: 'OPEN' | 'CLOSED' | 'CLAIMED') => {
    setActiveTab(tab);
  };

  // Get counts for all tabs
  const openCount = chatStore.conversations.filter((c) => c.status === 'OPEN').length;
  const closedCount = chatStore.conversations.filter((c) => c.status === 'CLOSED').length;
  const claimedCount = chatStore.conversations.filter((c) => c.assignedToMemberId !== null && c.status === 'OPEN').length;

  // Filter conversations based on active tab
  const filteredConversations = activeTab === 'CLAIMED' 
    ? chatStore.sortedConversations.filter((c) => c.assignedToMemberId !== null && c.status === 'OPEN')
    : chatStore.sortedConversations;

  if (chatStore.isLoading && chatStore.conversations.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Conversations</Text>
            <Text style={styles.headerSubtitle}>Manage customer chats</Text>
          </View>

          {/* Filter Tabs */}
          <View style={styles.tabsContainer}>
            {([{ key: 'OPEN', count: openCount }, { key: 'CLOSED', count: closedCount }, { key: 'CLAIMED', count: claimedCount }] as const).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => handleTabChange(tab.key as any)}>
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.key === 'CLAIMED' ? 'BY ME' : tab.key}
                </Text>
                <View style={[styles.countBadge, activeTab === tab.key && styles.countBadgeActive]}>
                  <Text style={[styles.countText, activeTab === tab.key && styles.countTextActive]}>{tab.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
        </View>
      </SafeAreaView>
    );
  }

  if (chatStore.conversations.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Conversations</Text>
            <Text style={styles.headerSubtitle}>Manage customer chats</Text>
          </View>

          {/* Filter Tabs */}
          <View style={styles.tabsContainer}>
            {([{ key: 'OPEN', count: openCount }, { key: 'CLOSED', count: closedCount }, { key: 'CLAIMED', count: claimedCount }] as const).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => handleTabChange(tab.key as any)}>
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.key === 'CLAIMED' ? 'BY ME' : tab.key}
                </Text>
                <View style={[styles.countBadge, activeTab === tab.key && styles.countBadgeActive]}>
                  <Text style={[styles.countText, activeTab === tab.key && styles.countTextActive]}>{tab.count}</Text>
                </View>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Conversations</Text>
          <Text style={styles.headerSubtitle}>{chatStore.conversations.length} conversation{chatStore.conversations.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsContainer}>
          {([{ key: 'OPEN', count: openCount }, { key: 'CLOSED', count: closedCount }, { key: 'CLAIMED', count: claimedCount }] as const).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => handleTabChange(tab.key as any)}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.key === 'CLAIMED' ? 'BY ME' : tab.key}
              </Text>
              <View style={[styles.countBadge, activeTab === tab.key && styles.countBadgeActive]}>
                <Text style={[styles.countText, activeTab === tab.key && styles.countTextActive]}>{tab.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      {/* Conversation List */}
      <FlatList
        data={filteredConversations}
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
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f9',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  countTextActive: {
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
