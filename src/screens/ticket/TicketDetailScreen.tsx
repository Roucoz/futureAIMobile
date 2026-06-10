/**
 * Ticket Detail Screen
 * View and edit a support ticket
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import {
  ticketService,
  TicketDetail,
  TicketStatus,
} from '../../services/api/ticket.service';
import { useTickets } from '../../stores';
import { TicketStackParamList } from '../../navigation/types';

type TicketDetailRouteProp = RouteProp<TicketStackParamList, 'TicketDetail'>;

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#52c41a',
  MEDIUM: '#1890ff',
  HIGH: '#fa8c16',
  URGENT: '#ff4d4f',
};

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: '#52c41a' },
  { value: 'MEDIUM', label: 'Medium', color: '#1890ff' },
  { value: 'HIGH', label: 'High', color: '#fa8c16' },
  { value: 'URGENT', label: 'Urgent', color: '#ff4d4f' },
] as const;

const TicketDetailScreen = observer(() => {
  const route = useRoute<TicketDetailRouteProp>();
  const navigation = useNavigation();
  const ticketStore = useTickets();
  const { ticketId } = route.params;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [editNote, setEditNote] = useState('');

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    setLoading(true);
    try {
      const data = await ticketService.getTicketById(ticketId);
      setTicket(data);
    } catch (error: any) {
      console.error('Failed to load ticket:', error);
      Alert.alert('Error', 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket || saving) return;
    setSaving(true);
    try {
      const updated = await ticketService.updateTicket(ticketId, {
        status: newStatus,
      });
      setTicket(prev => (prev ? { ...prev, ...updated } : prev));
      setEditingStatus(false);
      // Refresh the list in background
      ticketStore.fetchTickets();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityChange = async (
    newPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  ) => {
    if (!ticket || saving) return;
    setSaving(true);
    try {
      const updated = await ticketService.updateTicket(ticketId, {
        priority: newPriority,
      });
      setTicket(prev => (prev ? { ...prev, ...updated } : prev));
      setEditingPriority(false);
      ticketStore.fetchTickets();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update priority');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Loading ticket...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="alert-circle" size={48} color="#ccc" />
        <Text style={styles.loadingText}>Ticket not found</Text>
      </View>
    );
  }

  const priorityColor = PRIORITY_COLORS[ticket.priority] || '#888';
  const statusColor =
    ticketStore.statuses.find(s => s.name === ticket.status)?.color || '#888';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[styles.priorityDot, { backgroundColor: priorityColor }]}
          />
          <Text style={styles.summary}>{ticket.summary}</Text>
        </View>
      </View>

      {/* Status & Priority Row */}
      <View style={styles.metaRow}>
        {/* Status */}
        <TouchableOpacity
          style={[styles.metaChip, { borderColor: statusColor }]}
          onPress={() => setEditingStatus(!editingStatus)}
        >
          <View style={[styles.metaDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.metaLabel, { color: statusColor }]}>
            {ticket.status.toUpperCase()}
          </Text>
          <Icon name="chevron-down" size={14} color={statusColor} />
        </TouchableOpacity>

        {/* Priority */}
        <TouchableOpacity
          style={[styles.metaChip, { borderColor: priorityColor }]}
          onPress={() => setEditingPriority(!editingPriority)}
        >
          <Icon
            name="flag"
            size={14}
            color={priorityColor}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.metaLabel, { color: priorityColor }]}>
            {PRIORITY_OPTIONS.find(p => p.value === ticket.priority)?.label ||
              ticket.priority}
          </Text>
          <Icon name="chevron-down" size={14} color={priorityColor} />
        </TouchableOpacity>

        {saving && <ActivityIndicator size="small" color="#1890ff" />}
      </View>

      {/* Status Picker Dropdown */}
      {editingStatus && (
        <View style={styles.pickerContainer}>
          {ticketStore.statuses.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.pickerItem,
                ticket.status === s.name && styles.pickerItemActive,
              ]}
              onPress={() => handleStatusChange(s.name)}
            >
              <View
                style={[
                  styles.pickerDot,
                  { backgroundColor: s.color || '#888' },
                ]}
              />
              <Text
                style={[
                  styles.pickerItemText,
                  ticket.status === s.name && styles.pickerItemTextActive,
                ]}
              >
                {s.name.charAt(0).toUpperCase() + s.name.slice(1)}
              </Text>
              {ticket.status === s.name && (
                <Icon name="checkmark" size={18} color="#1890ff" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Priority Picker Dropdown */}
      {editingPriority && (
        <View style={styles.pickerContainer}>
          {PRIORITY_OPTIONS.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.pickerItem,
                ticket.priority === p.value && styles.pickerItemActive,
              ]}
              onPress={() => handlePriorityChange(p.value)}
            >
              <View style={[styles.pickerDot, { backgroundColor: p.color }]} />
              <Text
                style={[
                  styles.pickerItemText,
                  ticket.priority === p.value && styles.pickerItemTextActive,
                ]}
              >
                {p.label}
              </Text>
              {ticket.priority === p.value && (
                <Icon name="checkmark" size={18} color="#1890ff" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Details Card */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.description}>
          {ticket.description || 'No description provided'}
        </Text>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <InfoRow
          icon="person"
          label="Assignee"
          value={ticket.assignedToMember?.displayName || 'Unassigned'}
        />
        <InfoRow
          icon="people"
          label="Customer"
          value={
            ticket.customer?.name || ticket.customer?.phoneNumber || 'Unknown'
          }
        />
        {ticket.customer?.email && (
          <InfoRow icon="mail" label="Email" value={ticket.customer.email} />
        )}
        <InfoRow
          icon="calendar"
          label="Created"
          value={format(new Date(ticket.createdAt), 'MMM dd, yyyy h:mm a')}
        />
        <InfoRow
          icon="time"
          label="Updated"
          value={format(new Date(ticket.updatedAt), 'MMM dd, yyyy h:mm a')}
        />
        {ticket.closedAt && (
          <InfoRow
            icon="close-circle"
            label="Closed"
            value={format(new Date(ticket.closedAt), 'MMM dd, yyyy h:mm a')}
          />
        )}
      </View>

      {/* Notes Section */}
      {ticket.notes && ticket.notes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Notes ({ticket.notes.length})</Text>
          {ticket.notes.map(note => (
            <View key={note.id} style={styles.noteItem}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteAuthor}>
                  {note.author?.displayName ||
                    note.author?.user?.email ||
                    'Unknown'}
                </Text>
                <Text style={styles.noteDate}>
                  {format(new Date(note.createdAt), 'MMM dd, h:mm a')}
                </Text>
              </View>
              <Text style={styles.noteContent}>{note.content}</Text>
              {note.isInternal && (
                <View style={styles.internalBadge}>
                  <Icon name="lock-closed" size={10} color="#fa8c16" />
                  <Text style={styles.internalBadgeText}>Internal</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Status History */}
      {ticket.statusHistory && ticket.statusHistory.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Status History</Text>
          {ticket.statusHistory.map(h => (
            <View key={h.id} style={styles.historyItem}>
              <Icon
                name="arrow-forward-circle"
                size={16}
                color="#888"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.historyText}>
                <Text style={styles.historyStatus}>{h.fromStatus}</Text>
                {' → '}
                <Text style={styles.historyStatus}>{h.toStatus}</Text>
              </Text>
              <Text style={styles.historyDate}>
                {format(new Date(h.createdAt), 'MMM dd, h:mm a')}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
});

// Info row component
const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | null;
}) => (
  <View style={styles.infoRow}>
    <Icon
      name={icon}
      size={16}
      color="#888"
      style={{ marginRight: 8, width: 20 }}
    />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>
      {value || '-'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  header: {
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 10,
    flexShrink: 0,
  },
  summary: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  metaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerItemActive: {
    backgroundColor: '#e6f7ff',
  },
  pickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  pickerItemText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  pickerItemTextActive: {
    color: '#1890ff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
    width: 80,
  },
  infoValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  noteItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  noteDate: {
    fontSize: 11,
    color: '#aaa',
  },
  noteContent: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  internalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  internalBadgeText: {
    fontSize: 11,
    color: '#fa8c16',
    fontWeight: '500',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  historyText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  historyStatus: {
    fontWeight: '600',
    color: '#333',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  historyDate: {
    fontSize: 11,
    color: '#aaa',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default TicketDetailScreen;
