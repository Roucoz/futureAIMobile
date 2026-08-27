/**
 * Contact Detail Screen
 * Shows detailed contact information with action buttons
 */

import React, { useEffect, useState } from 'react';
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
import Icon from 'react-native-vector-icons/Ionicons';
import { ContactsStackParamList } from '../../navigation/types';
import { Contact } from '../../services/api/contact.service';
import contactService from '../../services/api/contact.service';
import { ordersService } from '../../services/api/orders.service';
import { appointmentsService } from '../../services/api/appointments.service';
import { useModule } from '../../stores';

interface RouteParams {
  contact: Contact;
}

type NavigationProp = StackNavigationProp<
  ContactsStackParamList,
  'ContactDetail'
>;

const ContactDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { contact } = route.params as RouteParams;
  const moduleStore = useModule();
  const [isLoading, setIsLoading] = useState(false);

  // Make sure module statuses are loaded so module-gated buttons render
  // correctly (hidden when the corresponding module is disabled).
  useEffect(() => {
    moduleStore.ensureLoaded();
  }, [moduleStore]);

  const displayName = contact.name || contact.phoneNumber;
  const lastContactDate = new Date(
    contact.lastContactedAt,
  ).toLocaleDateString();
  const firstContactDate = new Date(
    contact.firstContactedAt,
  ).toLocaleDateString();

  // Only offer Chat when reachable via WhatsApp/Telegram or the phone is verified
  const canChat =
    contact.phoneVerified ||
    contact.channels.includes('WHATSAPP') ||
    contact.channels.includes('TELEGRAM');

  // Start new conversation
  const handleStartChat = async () => {
    try {
      setIsLoading(true);
      const { conversationId } = await contactService.startConversation(
        contact.phoneNumber,
      );
      if (conversationId) {
        // Existing open conversation → open it directly
        (navigation as any).navigate('ChatStack', {
          screen: 'ChatDetail',
          params: { conversationId },
        });
      } else {
        // No existing conversation → let the agent start one (message/template)
        navigation.navigate('InitiateChat', {
          phoneNumber: contact.phoneNumber,
          contactName: displayName,
        });
      }
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to start conversation',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // View conversations
  const handleViewChats = async () => {
    try {
      setIsLoading(true);
      const conversations = await contactService.getContactConversations(
        contact.id,
        contact.phoneNumber,
      );

      if (conversations.length === 0) {
        Alert.alert(
          'No Conversations',
          'This contact has no conversation history.',
        );
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
      await moduleStore.ensureLoaded();
      if (!moduleStore.ticketing) {
        Alert.alert(
          'Module Not Enabled',
          'The Tickets module is not enabled for your account.',
        );
        return;
      }

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

  // View orders
  const handleViewOrders = async () => {
    try {
      await moduleStore.ensureLoaded();
      if (!moduleStore.orders) {
        Alert.alert(
          'Module Not Enabled',
          'The Orders module is not enabled for your account.',
        );
        return;
      }

      setIsLoading(true);
      const orders = await ordersService.getOrdersByContact(
        contact.id,
        contact.phoneNumber,
        contact.email || undefined,
      );

      if (orders.length === 0) {
        Alert.alert('No Orders', 'This contact has no orders.');
      } else {
        navigation.navigate('ContactOrders', {
          contactName: displayName,
          orders,
        });
      }
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  // View appointments
  const handleViewAppointments = async () => {
    try {
      await moduleStore.ensureLoaded();
      if (!moduleStore.appointments) {
        Alert.alert(
          'Module Not Enabled',
          'The Appointments module is not enabled for your account.',
        );
        return;
      }

      setIsLoading(true);
      const appointments = await appointmentsService.getAppointmentsByContact(
        contact.id,
      );

      if (appointments.length === 0) {
        Alert.alert('No Appointments', 'This contact has no appointments.');
      } else {
        navigation.navigate('ContactAppointments', {
          contactName: displayName,
          appointments,
        });
      }
    } catch (error: any) {
      console.error('Failed to load appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  // Create ticket
  const handleCreateTicket = async () => {
    try {
      await moduleStore.ensureLoaded();
      if (!moduleStore.ticketing) {
        Alert.alert(
          'Module Not Enabled',
          'The Tickets module is not enabled for your account.\n\nYou can enable it from the admin panel on the website (Configuration → Modules).',
        );
        return;
      }

      // Navigate to create ticket screen for this customer
      navigation.navigate('CreateTicket', { customerId: contact.id });
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      Alert.alert('Error', 'Failed to create ticket');
    }
  };

  // Send SMS to contact
  const handleSendSms = () => {
    navigation.navigate('SendSms', {
      contactId: contact.id,
      phoneNumber: contact.phoneNumber,
      contactName: displayName,
    });
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
          {contact.email && (
            <Text style={styles.contactEmail}>{contact.email}</Text>
          )}

          {contact.isVip && (
            <View style={styles.vipBadge}>
              <Icon
                name="star"
                size={16}
                color="#faad14"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.vipText}>VIP Customer</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Only show Start Chat when reachable via WhatsApp/Telegram or phone is verified */}
          {canChat && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleStartChat}
              disabled={isLoading}
            >
              <Icon
                name="chatbubbles"
                size={20}
                color="#fff"
                style={styles.actionButtonIcon}
              />
              <Text style={styles.actionButtonText}>Start Chat</Text>
            </TouchableOpacity>
          )}

          {/* Only show Send SMS when the phone number is verified */}
          {contact.phoneVerified && (
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleSendSms}
              disabled={isLoading}
            >
              <Icon
                name="chatbox-ellipses"
                size={20}
                color="#fff"
                style={styles.actionButtonIcon}
              />
              <Text style={styles.actionButtonText}>Send SMS</Text>
            </TouchableOpacity>
          )}

          {/* Only show Create Ticket when the ticketing module is enabled */}
          {moduleStore.isLoaded && moduleStore.ticketing && (
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleCreateTicket}
              disabled={isLoading}
            >
              <Icon
                name="ticket"
                size={20}
                color="#fff"
                style={styles.actionButtonIcon}
              />
              <Text style={styles.actionButtonText}>Create Ticket</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* History Buttons */}
        <View style={styles.historyContainer}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={handleViewChats}
            disabled={isLoading}
          >
            <View style={styles.historyButtonHeader}>
              <Icon
                name="chatbubbles"
                size={24}
                color="#1890ff"
                style={styles.historyButtonIcon}
              />
              <View style={styles.historyButtonInfo}>
                <Text style={styles.historyButtonTitle}>Chat History</Text>
                <Text style={styles.historyButtonSubtitle}>
                  {contact.totalConversations} conversation
                  {contact.totalConversations !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Text style={styles.historyButtonArrow}>›</Text>
          </TouchableOpacity>

          {/* Only show Ticket History when the ticketing module is enabled */}
          {moduleStore.isLoaded && moduleStore.ticketing && (
            <TouchableOpacity
              style={styles.historyButton}
              onPress={handleViewTickets}
              disabled={isLoading}
            >
              <View style={styles.historyButtonHeader}>
                <Icon
                  name="ticket"
                  size={24}
                  color="#1890ff"
                  style={styles.historyButtonIcon}
                />
                <View style={styles.historyButtonInfo}>
                  <Text style={styles.historyButtonTitle}>Ticket History</Text>
                  <Text style={styles.historyButtonSubtitle}>
                    {contact.totalTickets} ticket
                    {contact.totalTickets !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyButtonArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* Only show Orders history when the orders module is enabled */}
          {moduleStore.isLoaded && moduleStore.orders && (
            <TouchableOpacity
              style={styles.historyButton}
              onPress={handleViewOrders}
              disabled={isLoading}
            >
              <View style={styles.historyButtonHeader}>
                <Icon
                  name="cube"
                  size={24}
                  color="#1890ff"
                  style={styles.historyButtonIcon}
                />
                <View style={styles.historyButtonInfo}>
                  <Text style={styles.historyButtonTitle}>Order History</Text>
                  <Text style={styles.historyButtonSubtitle}>
                    {contact.totalOrders} order
                    {contact.totalOrders !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyButtonArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* Only show Appointments history when the appointments module is enabled */}
          {moduleStore.isLoaded && moduleStore.appointments && (
            <TouchableOpacity
              style={styles.historyButton}
              onPress={handleViewAppointments}
              disabled={isLoading}
            >
              <View style={styles.historyButtonHeader}>
                <Icon
                  name="calendar"
                  size={24}
                  color="#1890ff"
                  style={styles.historyButtonIcon}
                />
                <View style={styles.historyButtonInfo}>
                  <Text style={styles.historyButtonTitle}>
                    Appointment History
                  </Text>
                  <Text style={styles.historyButtonSubtitle}>
                    {contact.totalAppointments} appointment
                    {contact.totalAppointments !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyButtonArrow}>›</Text>
            </TouchableOpacity>
          )}
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
            <Text style={styles.detailValue}>
              {contact.channels.join(', ')}
            </Text>
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
              <Text style={styles.detailValue}>
                {contact.preferredLanguage}
              </Text>
            </View>
          )}

          {contact.totalSpent !== null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Spent:</Text>
              <Text style={styles.detailValue}>
                ${contact.totalSpent.toFixed(2)}
              </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
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
  historyButtonIcon: {},
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
