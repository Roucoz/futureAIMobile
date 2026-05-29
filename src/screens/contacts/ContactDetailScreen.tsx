/**
 * Contact Detail Screen
 * Shows detailed contact information with action buttons
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ContactsStackParamList } from '../../navigation/types';
import { Contact } from '../../services/api/contact.service';
import contactService from '../../services/api/contact.service';

interface RouteParams {
  contact: Contact;
}

type NavigationProp = StackNavigationProp<ContactsStackParamList, 'ContactDetail'>;

const ContactDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { contact } = route.params as RouteParams;
  const [isLoading, setIsLoading] = useState(false);

  const displayName = contact.name || contact.phoneNumber;
  const lastContactDate = new Date(contact.lastContactedAt).toLocaleDateString();
  const firstContactDate = new Date(contact.firstContactedAt).toLocaleDateString();

  // Start new conversation
  const handleStartChat = async () => {
    try {
      setIsLoading(true);
      const { conversationId } = await contactService.startConversation(contact.phoneNumber);
      // Navigate to ChatStack in parent navigator
      (navigation as any).navigate('ChatStack', {
        screen: 'ChatDetail',
        params: { conversationId },
      });
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to start conversation');
    } finally {
      setIsLoading(false);
    }
  };

  // View conversations
  const handleViewChats = async () => {
    try {
      setIsLoading(true);
      const conversations = await contactService.getContactConversations(contact.id, contact.phoneNumber);
      
      if (conversations.length === 0) {
        Alert.alert('No Conversations', 'This contact has no conversation history.');
      } else {
        // Navigate to conversation list with filter
        navigation.navigate('ContactConversations', {
          contactId: contact.id,
          contactName: displayName,
          conversations,
        });
      }
    } catch (error: any) {
      console.error('Failed to load conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  // View tickets
  const handleViewTickets = async () => {
    try {
      setIsLoading(true);
      const tickets = await contactService.getContactTickets(contact.id);
      
      if (tickets.length === 0) {
        Alert.alert('No Tickets', 'This contact has no tickets.');
      } else {
        // Navigate to ticket history
        navigation.navigate('ContactTickets', {
          contactId: contact.id,
          contactName: displayName,
          tickets,
        });
      }
    } catch (error: any) {
      console.error('Failed to load tickets:', error);
      Alert.alert('Error', 'Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  // Create ticket
  const handleCreateTicket = () => {
    // TODO: Navigate to create ticket screen
    Alert.alert('Coming Soon', 'Create ticket functionality will be available soon');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.contactName}>{displayName}</Text>
          <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
          {contact.email && <Text style={styles.contactEmail}>{contact.email}</Text>}
          
          {contact.isVip && (
            <View style={styles.vipBadge}>
              <Text style={styles.vipText}>⭐ VIP Customer</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleStartChat}
            disabled={isLoading}>
            <Text style={styles.actionButtonIcon}>💬</Text>
            <Text style={styles.actionButtonText}>Start Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleCreateTicket}
            disabled={isLoading}>
            <Text style={styles.actionButtonIcon}>🎫</Text>
            <Text style={styles.actionButtonText}>Create Ticket</Text>
          </TouchableOpacity>
        </View>

        {/* History Buttons */}
        <View style={styles.historyContainer}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={handleViewChats}
            disabled={isLoading}>
            <View style={styles.historyButtonHeader}>
              <Text style={styles.historyButtonIcon}>💬</Text>
              <View style={styles.historyButtonInfo}>
                <Text style={styles.historyButtonTitle}>Chat History</Text>
                <Text style={styles.historyButtonSubtitle}>
                  {contact.totalConversations} conversation{contact.totalConversations !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Text style={styles.historyButtonArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={handleViewTickets}
            disabled={isLoading}>
            <View style={styles.historyButtonHeader}>
              <Text style={styles.historyButtonIcon}>🎫</Text>
              <View style={styles.historyButtonInfo}>
                <Text style={styles.historyButtonTitle}>Ticket History</Text>
                <Text style={styles.historyButtonSubtitle}>View all tickets</Text>
              </View>
            </View>
            <Text style={styles.historyButtonArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{contact.customerType}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Channels:</Text>
            <Text style={styles.detailValue}>{contact.channels.join(', ')}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>First Contact:</Text>
            <Text style={styles.detailValue}>{firstContactDate}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Contact:</Text>
            <Text style={styles.detailValue}>{lastContactDate}</Text>
          </View>

          {contact.preferredLanguage && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Language:</Text>
              <Text style={styles.detailValue}>{contact.preferredLanguage}</Text>
            </View>
          )}

          {contact.totalSpent !== null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Spent:</Text>
              <Text style={styles.detailValue}>${contact.totalSpent.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <View style={styles.tagsCard}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {contact.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* AI Summary */}
        {contact.aiSummary && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>AI Summary</Text>
            <Text style={styles.summaryText}>{contact.aiSummary}</Text>
          </View>
        )}

        {/* Notes */}
        {contact.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{contact.notes}</Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1890ff" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f9',
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
  },
  contactName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: '#666',
  },
  vipBadge: {
    backgroundColor: '#fff4e6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  vipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fa8c16',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#1890ff',
  },
  secondaryButton: {
    backgroundColor: '#52c41a',
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  historyContainer: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  historyButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyButtonIcon: {
    fontSize: 24,
  },
  historyButtonInfo: {
    flex: 1,
  },
  historyButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  historyButtonSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  historyButtonArrow: {
    fontSize: 24,
    color: '#999',
  },
  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  tagsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    color: '#1890ff',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  notesCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  loadingOverlay: {
    padding: 20,
    alignItems: 'center',
  },
});

export default ContactDetailScreen;
