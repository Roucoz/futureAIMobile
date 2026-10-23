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
  Switch,
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
import { useModule, useAuth } from '../../stores';
import { useWhatsAppCalling } from '../../hooks/useWhatsAppCalling';
import callManager from '../../services/calls/callManager';

interface RouteParams {
  contact: Contact;
}

type NavigationProp = StackNavigationProp<
  ContactsStackParamList,
  'ContactDetail'
>;

type Props = {
  /**
   * Supplied when the profile is shown in the modal (see `useContactProfile`).
   * Omitted when the screen is used inside the Contacts stack, where the same
   * record arrives as a route param.
   */
  contact?: Contact;
  /** Present only in modal mode: shows a Close button and no stack header. */
  onClose?: () => void;
};

const ContactDetailScreen = ({ contact: contactProp, onClose }: Props = {}) => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const routeContact = (route.params as RouteParams | undefined)?.contact;
  const contact = (contactProp ?? routeContact) as Contact;
  const moduleStore = useModule();
  const authStore = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isStaff, setIsStaff] = useState(!!contact?.isStaff);
  const [staffSaving, setStaffSaving] = useState(false);

  /**
   * Leaves this screen before navigating.
   *
   * In modal mode the profile sits above the whole app, so opening a chat or a
   * history screen underneath it would leave the modal covering the result — the
   * modal is dismissed first, then the destination opens.
   */
  const navigateAway = (action: () => void) => {
    if (!onClose) {
      action();
      return;
    }
    onClose();
    setTimeout(action, 60);
  };

  /**
   * Screens that live in the Contacts stack are opened through the tab
   * navigator, so they also work when this profile is a modal on another tab.
   */
  const openContactsScreen = (screen: string, params?: object) =>
    navigateAway(() =>
      (navigation as any).navigate('ContactsStack', { screen, params }),
    );

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

  // Calling goes through WhatsApp, exactly like the web dashboard, so it is
  // only offered for a verified number. Widget visitors keep a synthetic `v_…`
  // id in the phone field and can never be called.
  const callingEnabled = useWhatsAppCalling();
  const callableNumber = (contact.phoneNumber || '').replace(/[^\d+]/g, '');
  const canWhatsAppCall =
    contact.phoneVerified &&
    callingEnabled &&
    /^\+?\d{8,15}$/.test(callableNumber);

  const smsEnabled = moduleStore.isLoaded && moduleStore.sms;
  const ticketingEnabled = moduleStore.isLoaded && moduleStore.ticketing;

  /**
   * Places a WhatsApp call to the customer the same way the web dashboard does:
   * the phone builds the SDP offer, the API relays it to Meta, and the answer
   * completes the audio path inside `callManager`.
   */
  const handleCallCustomer = async () => {
    if (!canWhatsAppCall) return;

    const result = await callManager.startOutbound({
      phone: callableNumber,
      name: contact.name,
    });

    if (!result.ok) {
      Alert.alert(
        result.requiresPermission
          ? 'Call permission needed'
          : 'Cannot start the call',
        result.message,
      );
    }
  };

  // Start new conversation
  const handleStartChat = async () => {
    try {
      setIsLoading(true);
      const { conversationId } = await contactService.startConversation(
        contact.phoneNumber,
      );
      if (conversationId) {
        // Existing open conversation → open it directly
        navigateAway(() =>
          (navigation as any).navigate('ChatStack', {
            screen: 'ChatDetail',
            params: { conversationId },
          }),
        );
      } else {
        // No existing conversation → let the agent start one (message/template)
        openContactsScreen('InitiateChat', {
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
        openContactsScreen('ContactConversations', {
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
        openContactsScreen('ContactTickets', {
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
        openContactsScreen('ContactOrders', {
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
        openContactsScreen('ContactAppointments', {
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
      openContactsScreen('CreateTicket', { customerId: contact.id });
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      Alert.alert('Error', 'Failed to create ticket');
    }
  };

  // Send SMS to contact
  const handleSendSms = () => {
    openContactsScreen('SendSms', {
      contactId: contact.id,
      phoneNumber: contact.phoneNumber,
      contactName: displayName,
    });
  };

  const handleToggleStaff = async (next: boolean) => {
    setStaffSaving(true);
    try {
      await contactService.updateContact(contact.id, { isStaff: next });
      setIsStaff(next);
    } catch (error) {
      console.error('Failed to update team-member flag:', error);
      Alert.alert('Error', 'Failed to update team member status');
    } finally {
      setStaffSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Modal mode has no navigation header, so it carries its own way out.
          Closing returns to the exact screen the profile was opened from. */}
      {onClose ? (
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.modalClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="chevron-down" size={22} color="#1890ff" />
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Customer</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>
      ) : null}
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

        {/* Team member (owner/staff) — owner only. Marking a contact as one of
            the business's own people makes the assistant treat their messages as
            internal (short replies, no sales flow) and lets them block time off
            by chatting. */}
        {authStore.isOwner && (
          <View style={styles.staffCard}>
            <View style={styles.staffTextBlock}>
              <Text style={styles.staffTitle}>Team member</Text>
              <Text style={styles.staffHint}>
                Your own owner/staff, not a customer. They can block time off by
                messaging you and get short internal replies.
              </Text>
            </View>
            <Switch
              value={isStaff}
              disabled={staffSaving}
              onValueChange={handleToggleStaff}
            />
          </View>
        )}

        {/*
         * Actions wrap into a grid instead of one row: four buttons in a single
         * row were cramped and the labels started colliding. Each tile keeps a
         * fixed width and simply flows onto the next line.
         *
         * Send SMS / Create Ticket stay visible but disabled when their module is
         * off — hiding them made the screen look like the feature never existed.
         */}
        <View style={styles.actionsContainer}>
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

          {/* WhatsApp call. Shown only for a verified number and when calling
              is switched on for the workspace — the same gate as the web. */}
          {canWhatsAppCall && (
            <TouchableOpacity
              style={[styles.actionButton, styles.whatsappButton]}
              onPress={() => navigateAway(() => void handleCallCustomer())}
              disabled={isLoading}
            >
              <Icon
                name="logo-whatsapp"
                size={20}
                color="#fff"
                style={styles.actionButtonIcon}
              />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.secondaryButton,
              (!contact.phoneVerified || !smsEnabled) &&
                styles.actionButtonDisabled,
            ]}
            onPress={handleSendSms}
            disabled={isLoading || !contact.phoneVerified || !smsEnabled}
          >
            <Icon
              name="chatbox-ellipses"
              size={20}
              color={contact.phoneVerified && smsEnabled ? '#fff' : '#bfbfbf'}
              style={styles.actionButtonIcon}
            />
            <Text
              style={[
                styles.actionButtonText,
                (!contact.phoneVerified || !smsEnabled) &&
                  styles.actionButtonTextDisabled,
              ]}
            >
              Send SMS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.secondaryButton,
              !ticketingEnabled && styles.actionButtonDisabled,
            ]}
            onPress={handleCreateTicket}
            disabled={isLoading || !ticketingEnabled}
          >
            <Icon
              name="ticket"
              size={20}
              color={ticketingEnabled ? '#fff' : '#bfbfbf'}
              style={styles.actionButtonIcon}
            />
            <Text
              style={[
                styles.actionButtonText,
                !ticketingEnabled && styles.actionButtonTextDisabled,
              ]}
            >
              Create Ticket
            </Text>
          </TouchableOpacity>
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalClose: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  modalCloseText: {
    fontSize: 15,
    color: '#1890ff',
    marginLeft: 2,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalHeaderSpacer: {
    width: 80,
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
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  staffTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  staffTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  staffHint: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 2,
  },
  vipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fa8c16',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  actionButtonTextDisabled: {
    color: '#bfbfbf',
  },
  primaryButton: {
    backgroundColor: '#1890ff',
  },
  secondaryButton: {
    backgroundColor: '#52c41a',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
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
