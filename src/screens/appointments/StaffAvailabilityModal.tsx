/**
 * Staff Availability Modal (mobile)
 *
 * The Appointments module's "Team availability" screen:
 *  - lists the business's own people (owner/staff) and their time off,
 *  - lets an OWNER add a team member (search an existing customer, or type a
 *    new name/phone),
 *  - lets an owner or anyone with edit rights block time off, warning when
 *    customer appointments already sit inside the window.
 *
 * Mirrors the web `StaffAvailabilitySection`.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';
import { observer } from 'mobx-react-lite';
import { useAuth } from '../../stores';
import contactService, { Contact } from '../../services/api/contact.service';
import appointmentsService, {
  StaffMember,
  TimeOffBlock,
} from '../../services/api/appointments.service';

interface StaffAvailabilityModalProps {
  visible: boolean;
  onClose: () => void;
}

type Mode = 'list' | 'add' | 'block';

const formatBlockWindow = (block: TimeOffBlock): string => {
  const start = new Date(block.startAt);
  const end = new Date(block.endAt);
  if (block.allDay) return `${format(start, 'EEE dd MMM yyyy')} · all day`;
  return `${format(start, 'EEE dd MMM, HH:mm')} → ${format(end, 'HH:mm')}`;
};

const StaffAvailabilityModal = observer(
  ({ visible, onClose }: StaffAvailabilityModalProps) => {
    const authStore = useAuth();
    const isOwner = authStore.isOwner;
    const canEdit = authStore.canAccessResource('appointments');

    const [mode, setMode] = useState<Mode>('list');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [blocks, setBlocks] = useState<TimeOffBlock[]>([]);

    // ── Add team member ────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Contact[]>([]);
    const [searching, setSearching] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');

    // ── Block time off ─────────────────────────────────────────────────
    const [blockFor, setBlockFor] = useState<StaffMember | null>(null);
    const [date, setDate] = useState(new Date());
    const [fromTime, setFromTime] = useState(() => {
      const d = new Date();
      d.setHours(13, 0, 0, 0);
      return d;
    });
    const [toTime, setToTime] = useState(() => {
      const d = new Date();
      d.setHours(15, 0, 0, 0);
      return d;
    });
    const [allDay, setAllDay] = useState(false);
    const [reason, setReason] = useState('');
    const [picker, setPicker] = useState<null | 'date' | 'from' | 'to'>(null);

    const load = useCallback(async () => {
      setLoading(true);
      try {
        const now = new Date();
        const to = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
        const [members, timeOff] = await Promise.all([
          appointmentsService.getStaff(),
          appointmentsService.getTimeOff(now.toISOString(), to.toISOString()),
        ]);
        setStaff(members);
        setBlocks(timeOff);
      } catch (error) {
        console.error('Failed to load team availability:', error);
        Alert.alert('Error', 'Failed to load team availability');
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      if (visible) {
        setMode('list');
        void load();
      }
    }, [visible, load]);

    const runSearch = async (query: string) => {
      setSearch(query);
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await contactService.getContacts({
          search: query.trim(),
          pageSize: 20,
        });
        setResults(res.contacts || []);
      } catch (error) {
        console.error('Customer search failed:', error);
        setResults([]);
      } finally {
        setSearching(false);
      }
    };

    const handleAddFromSearch = async (contact: Contact) => {
      setSaving(true);
      try {
        await appointmentsService.addStaff({ contactId: contact.id });
        setSearch('');
        setResults([]);
        setMode('list');
        await load();
      } catch (error: any) {
        console.error('Failed to add team member:', error);
        Alert.alert(
          'Error',
          error?.response?.data?.error || 'Failed to add team member',
        );
      } finally {
        setSaving(false);
      }
    };

    const handleCreateAndAdd = async () => {
      if (!newName.trim() && !newPhone.trim()) {
        Alert.alert('Add a name or phone number');
        return;
      }
      setSaving(true);
      try {
        // The API creates the contact (or links an existing one by phone/email)
        // and flags it in a single call — same behaviour as the web picker.
        await appointmentsService.addStaff({
          name: newName.trim() || undefined,
          phoneNumber: newPhone.trim() || undefined,
        });
        setNewName('');
        setNewPhone('');
        setMode('list');
        await load();
      } catch (error: any) {
        console.error('Failed to create team member:', error);
        Alert.alert(
          'Error',
          error?.response?.data?.error || 'Failed to create team member',
        );
      } finally {
        setSaving(false);
      }
    };

    const handleRemove = (member: StaffMember) => {
      Alert.alert(
        'Remove from team?',
        'They will be treated as a normal customer again. Their existing time off stays.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await appointmentsService.removeStaff(member.id);
                await load();
              } catch {
                Alert.alert('Error', 'Failed to remove team member');
              }
            },
          },
        ],
      );
    };

    const openBlock = (member: StaffMember) => {
      setBlockFor(member);
      setDate(new Date());
      setAllDay(false);
      setReason('');
      setMode('block');
    };

    const handleCreateBlock = async () => {
      if (!blockFor) return;

      let startAt: Date;
      let endAt: Date;
      if (allDay) {
        startAt = new Date(date);
        startAt.setHours(0, 0, 0, 0);
        endAt = new Date(startAt);
        endAt.setDate(endAt.getDate() + 1);
      } else {
        startAt = new Date(date);
        startAt.setHours(fromTime.getHours(), fromTime.getMinutes(), 0, 0);
        endAt = new Date(date);
        endAt.setHours(toTime.getHours(), toTime.getMinutes(), 0, 0);
      }

      if (endAt <= startAt) {
        Alert.alert('The end time must be after the start time');
        return;
      }

      setSaving(true);
      try {
        const conflicts = await appointmentsService.createTimeOff({
          contactId: blockFor.id,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          allDay,
          reason: reason.trim() || null,
        });

        setMode('list');
        await load();

        if (conflicts.length > 0) {
          Alert.alert(
            'Saved — heads up',
            `${conflicts.length} customer appointment(s) fall inside this window:\n\n` +
              conflicts
                .map(
                  c =>
                    `• ${c.customerName} — ${format(
                      new Date(c.appointmentDate),
                      'HH:mm',
                    )}${c.serviceName ? ` (${c.serviceName})` : ''}`,
                )
                .join('\n'),
          );
        } else {
          Alert.alert('Saved', 'Unavailability saved');
        }
      } catch (error: any) {
        console.error('Failed to save unavailability:', error);
        Alert.alert(
          'Error',
          error?.response?.data?.error || 'Failed to save unavailability',
        );
      } finally {
        setSaving(false);
      }
    };

    const handleDeleteBlock = (block: TimeOffBlock) => {
      Alert.alert('Remove this unavailability?', undefined, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await appointmentsService.deleteTimeOff(block.id);
              await load();
            } catch {
              Alert.alert('Error', 'Failed to remove unavailability');
            }
          },
        },
      ]);
    };

    const renderList = () => (
      <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Team members</Text>
          {isOwner && (
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => setMode('add')}
            >
              <Icon name="add" size={16} color="#1890ff" />
              <Text style={styles.smallButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isOwner && (
          <Text style={styles.hint}>
            Only the project owner can add or remove team members. You can still
            block time off below.
          </Text>
        )}

        {staff.length === 0 && !loading && (
          <Text style={styles.empty}>No team members yet</Text>
        )}

        {staff.map(member => (
          <View key={member.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {member.name || member.phoneNumber}
              </Text>
              <Text style={styles.cardSubtitle}>{member.phoneNumber}</Text>
              {member.upcomingBlocks > 0 && (
                <Text style={styles.badge}>
                  {member.upcomingBlocks} upcoming block
                  {member.upcomingBlocks === 1 ? '' : 's'}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.rowAction}
              disabled={!canEdit}
              onPress={() => openBlock(member)}
            >
              <Icon name="time-outline" size={18} color="#1890ff" />
              <Text style={styles.rowActionText}>Block</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity
                style={styles.rowAction}
                onPress={() => handleRemove(member)}
              >
                <Icon name="trash-outline" size={18} color="#ff4d4f" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          Upcoming time off
        </Text>
        {blocks.length === 0 && !loading && (
          <Text style={styles.empty}>No upcoming unavailability</Text>
        )}
        {blocks.map(block => (
          <View key={block.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{formatBlockWindow(block)}</Text>
              <Text style={styles.cardSubtitle}>
                {block.staffName}
                {block.reason ? ` · ${block.reason}` : ''}
                {block.source === 'CHAT' ? ' · added from chat' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.rowAction}
              disabled={!canEdit}
              onPress={() => handleDeleteBlock(block)}
            >
              <Icon name="trash-outline" size={18} color="#ff4d4f" />
            </TouchableOpacity>
          </View>
        ))}
      </>
    );

    const renderAdd = () => (
      <>
        <Text style={styles.sectionTitle}>Search an existing customer</Text>
        <TextInput
          style={styles.input}
          placeholder="Name, phone or email"
          value={search}
          onChangeText={q => void runSearch(q)}
          autoCorrect={false}
        />
        {searching && <ActivityIndicator style={{ marginTop: 8 }} />}
        {results.map(contact => (
          <TouchableOpacity
            key={contact.id}
            style={styles.card}
            onPress={() => void handleAddFromSearch(contact)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {contact.name || contact.phoneNumber}
              </Text>
              <Text style={styles.cardSubtitle}>{contact.phoneNumber}</Text>
            </View>
            <Icon name="add-circle" size={22} color="#1890ff" />
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          Or create a new one
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={newName}
          onChangeText={setNewName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone number (e.g. 9613xxxxxx)"
          value={newPhone}
          onChangeText={setNewPhone}
          keyboardType="phone-pad"
        />
        <TouchableOpacity
          style={styles.primaryButton}
          disabled={saving}
          onPress={() => void handleCreateAndAdd()}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Add team member</Text>
          )}
        </TouchableOpacity>
      </>
    );

    const renderBlock = () => (
      <>
        <Text style={styles.sectionTitle}>
          Block time off — {blockFor?.name || blockFor?.phoneNumber}
        </Text>

        <TouchableOpacity
          style={styles.input}
          onPress={() => setPicker('date')}
        >
          <Text style={styles.inputText}>
            {format(date, 'EEE dd MMM yyyy')}
          </Text>
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Whole day</Text>
          <Switch value={allDay} onValueChange={setAllDay} />
        </View>

        {!allDay && (
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={[styles.input, { flex: 1 }]}
              onPress={() => setPicker('from')}
            >
              <Text style={styles.inputText}>
                From {format(fromTime, 'HH:mm')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              onPress={() => setPicker('to')}
            >
              <Text style={styles.inputText}>To {format(toTime, 'HH:mm')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Reason (optional)"
          value={reason}
          onChangeText={setReason}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          disabled={saving}
          onPress={() => void handleCreateBlock()}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Save unavailability</Text>
          )}
        </TouchableOpacity>

        {picker && (
          <DateTimePicker
            value={
              picker === 'date' ? date : picker === 'from' ? fromTime : toTime
            }
            mode={picker === 'date' ? 'date' : 'time'}
            display="default"
            onChange={(_, selected) => {
              const which = picker;
              setPicker(null);
              if (!selected) return;
              if (which === 'date') setDate(selected);
              if (which === 'from') setFromTime(selected);
              if (which === 'to') setToTime(selected);
            }}
          />
        )}
      </>
    );

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => (mode === 'list' ? onClose() : setMode('list'))}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            {mode !== 'list' ? (
              <TouchableOpacity onPress={() => setMode('list')}>
                <Icon name="arrow-back" size={22} color="#1890ff" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 22 }} />
            )}
            <Text style={styles.headerTitle}>Team availability</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {loading && mode === 'list' && (
              <ActivityIndicator style={{ marginVertical: 20 }} />
            )}
            {mode === 'list' && renderList()}
            {mode === 'add' && renderAdd()}
            {mode === 'block' && renderBlock()}
          </ScrollView>
        </View>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a' },
  content: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  smallButton: { flexDirection: 'row', alignItems: 'center' },
  smallButtonText: { color: '#1890ff', marginLeft: 4 },
  hint: { fontSize: 12, color: '#8c8c8c', marginBottom: 8 },
  empty: { fontSize: 13, color: '#999', marginVertical: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  cardSubtitle: { fontSize: 12, color: '#8c8c8c', marginTop: 2 },
  badge: {
    marginTop: 4,
    fontSize: 11,
    color: '#d46b08',
    backgroundColor: '#fff7e6',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  rowAction: { paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row' },
  rowActionText: { color: '#1890ff', marginLeft: 4, fontSize: 13 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    justifyContent: 'center',
  },
  inputText: { fontSize: 14, color: '#1a1a1a' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  switchLabel: { fontSize: 14, color: '#1a1a1a' },
  timeRow: { flexDirection: 'row' },
  primaryButton: {
    backgroundColor: '#1890ff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});

export default StaffAvailabilityModal;
