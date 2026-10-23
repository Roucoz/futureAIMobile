/**
 * Dashboard Screen
 * Shows KPI cards for agent metrics + upcoming appointments
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
  AppState,
  AppStateStatus,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth, useChat, useModule } from '../../stores';
import { resolveImageUrl } from '../../utils/imageUrl';
import ScreenBackground from '../../components/common/ScreenBackground';
import { ZoomableImage } from '../../components/common/ZoomableImage';
import BillingBanner from '../../components/common/BillingBanner';
import {
  appointmentsService,
  Appointment,
} from '../../services/api/appointments.service';
import { ordersService, OrderStatus } from '../../services/api/orders.service';
import { callsService, CallStats } from '../../services/api/calls.service';
import { ringtone } from '../../services/calls/ringtone';
import { websocketService } from '../../services/websocket/WebSocketService';

/**
 * Small red dot that keeps flashing, mirroring the red dots on the web
 * dashboard and in the sidebar. The dot itself stays 8px; only the halo behind
 * it expands and fades, so it reads as "something is happening" instead of a
 * shrinking shape.
 */
const PulseDot = () => {
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(halo, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [halo]);

  return (
    <View style={styles.pulseDotWrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.pulseDotHalo,
          {
            opacity: halo.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [0.55, 0, 0],
            }),
            transform: [
              {
                scale: halo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 3.2],
                }),
              },
            ],
          },
        ]}
      />
      <View style={styles.pulseDotCore} />
    </View>
  );
};

type DashboardNavigationProp = BottomTabNavigationProp<
  AppTabParamList,
  'Dashboard'
>;

// Active order statuses (excludes COMPLETED and CANCELED)
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const DashboardScreen = observer(() => {
  const navigation = useNavigation<DashboardNavigationProp>();
  const authStore = useAuth();
  const chatStore = useChat();
  const moduleStore = useModule();
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsEnabled, setAppointmentsEnabled] = useState(false);
  const [appointmentsSectionTitle, setAppointmentsSectionTitle] = useState(
    "Today's Appointments",
  );
  const [appointmentsSubtitle, setAppointmentsSubtitle] = useState<
    string | null
  >(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [callStats, setCallStats] = useState<CallStats | null>(null);
  // Voice calling is opt-in: no card at all when the workspace has it off.
  const [callingEnabled, setCallingEnabled] = useState(false);
  // TEMPORARY: state for the dev-only ringtone test button.
  const [ringing, setRinging] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      // Make sure module status is known before deciding what to fetch
      await moduleStore.ensureLoaded();

      // Fetch current agent status first
      await chatStore.fetchAgentStatus();

      // Load conversations
      await chatStore.loadConversations('OPEN');

      // Load ACTIVE orders count (only when module enabled AND user has permission)
      if (moduleStore.orders && authStore.canAccessResource('orders')) {
        try {
          const orders = await ordersService.getOrders(ACTIVE_ORDER_STATUSES);
          setTotalOrders(orders.length);
        } catch {
          setTotalOrders(0);
        }
      } else {
        setTotalOrders(0);
      }

      // WhatsApp calls (total + live). Cheap counters endpoint.
      if (moduleStore.whatsapp) {
        const stats = await callsService.getStats();
        setCallStats(stats?.counts ?? null);
        setCallingEnabled(stats?.enabled === true);
      } else {
        setCallStats(null);
        setCallingEnabled(false);
      }

      // Load appointments (only if module enabled AND user has permission) - OPTIMIZED
      if (
        moduleStore.appointments &&
        authStore.canAccessResource('appointments')
      ) {
        try {
          // Fetch only today's appointments first
          const todayAppointmentsRaw =
            await appointmentsService.getTodayAppointments();

          // CLIENT-SIDE VALIDATION: Filter to ensure we only show today's appointments
          const now = new Date();
          const startOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          const endOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
          );

          const todayAppointments = todayAppointmentsRaw.filter(apt => {
            const aptDate = new Date(apt.appointmentDate);
            return aptDate >= startOfToday && aptDate < endOfToday;
          });

          // Decide what to show based on today's appointments
          if (todayAppointments.length > 0) {
            setAppointments(todayAppointments);
            setAppointmentsSectionTitle(`Today's Appointments`);
            setAppointmentsSubtitle(null);
          } else {
            // No appointments today, check for future appointments (limited to 5)
            const futureAppointmentsRaw =
              await appointmentsService.getFutureAppointments(5);

            // CLIENT-SIDE VALIDATION: Filter to ensure only future appointments (after today)
            const futureAppointments = futureAppointmentsRaw.filter(apt => {
              const aptDate = new Date(apt.appointmentDate);
              return aptDate >= endOfToday; // Must be tomorrow or later
            });

            if (futureAppointments.length > 0) {
              setAppointments(futureAppointments);
              setAppointmentsSectionTitle('Next Appointments');
              // Show when the next appointment is
              const nextApt = futureAppointments[0];
              const nextDate = new Date(nextApt.appointmentDate);
              const daysUntil = Math.ceil(
                (nextDate.getTime() - startOfToday.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              const dateStr = formatNextAppointmentDate(nextDate, daysUntil);
              setAppointmentsSubtitle(`Next appointment: ${dateStr}`);
            } else {
              // No future appointments, check for past incomplete (limited to 5)
              const pastIncompleteAppointmentsRaw =
                await appointmentsService.getPastIncompleteAppointments(5);

              // CLIENT-SIDE VALIDATION: Filter to ensure only past incomplete appointments (before today, not COMPLETED/CANCELED)
              const pastIncompleteAppointments =
                pastIncompleteAppointmentsRaw.filter(apt => {
                  const aptDate = new Date(apt.appointmentDate);
                  return (
                    aptDate < startOfToday &&
                    apt.status !== 'COMPLETED' &&
                    apt.status !== 'CANCELED'
                  );
                });

              if (pastIncompleteAppointments.length > 0) {
                // Get total count of incomplete appointments
                const totalIncomplete =
                  await appointmentsService.getIncompleteAppointmentsCount();
                setAppointments(pastIncompleteAppointments);
                setAppointmentsSectionTitle('Previous Appointments');
                setAppointmentsSubtitle(
                  `${totalIncomplete} incomplete appointment${
                    totalIncomplete > 1 ? 's' : ''
                  }`,
                );
              } else {
                // No appointments at all
                setAppointments([]);
                setAppointmentsSectionTitle("Today's Appointments");
                setAppointmentsSubtitle(null);
              }
            }
          }

          setAppointmentsEnabled(true);
        } catch (_error: any) {
          // Module might not be enabled - this is OK
          if (_error.message?.includes('MODULE_APPOINTMENTS')) {
            setAppointmentsEnabled(false);
          }
        }
      } else {
        // Appointments module not enabled or no permission - clear and hide the section
        setAppointmentsEnabled(false);
        setAppointments([]);
        setAppointmentsSectionTitle("Today's Appointments");
        setAppointmentsSubtitle(null);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }, [chatStore, moduleStore, authStore]);

  // Keep a ref to loadDashboardData so WebSocket subscription is stable
  const loadDashboardDataRef = useRef(loadDashboardData);
  loadDashboardDataRef.current = loadDashboardData;

  // Reload dashboard data every time the tab gets focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardDataRef.current();
    }, []),
  );

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // WebSocket: listen for order, appointment & agent status updates to refresh dashboard
  useEffect(() => {
    const unsubscribe = websocketService.subscribe(message => {
      if (
        message.type === 'order_updated' ||
        message.type === 'appointment_updated' ||
        message.type === 'agent_status_changed' ||
        message.type === 'whatsapp_call_incoming' ||
        message.type === 'whatsapp_call_update' ||
        message.type === 'ws_reconnected'
      ) {
        loadDashboardDataRef.current();
      }
    });
    return unsubscribe;
  }, []); // Stable subscription - uses ref for callback

  // Reload data when app returns to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        loadDashboardDataRef.current();
      }
    };
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleStatusToggle = async (value: boolean) => {
    try {
      const newStatus = value ? 'ONLINE' : 'OFFLINE';
      await chatStore.updateAgentStatus(newStatus);
    } catch {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const isOnline = chatStore.currentAgentStatus === 'ONLINE';
  const openChatsCount = chatStore.conversations.filter(
    c => c.status === 'OPEN',
  ).length;
  const claimedChatsCount = chatStore.claimedChatsCount;
  const requiresAttentionCount = chatStore.escalationCount;

  // The two "business" cards share a row when both exist (so both are fully
  // visible on a phone), and each takes the full width when it is the only one.
  const showOrdersCard =
    !!moduleStore.orders && authStore.canAccessResource('orders');
  const showCallsCard = !!moduleStore.whatsapp && callingEnabled;
  const bothBusinessCards = showOrdersCard && showCallsCard;

  const handleAppointmentPress = () => {
    // Navigate to Appointments tab
    navigation.navigate('Appointments');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <BillingBanner />
      <ScreenBackground>
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerRow}
              onPress={() => (navigation as any).navigate('Profile')}
              activeOpacity={0.7}
            >
              {authStore.user?.avatarUrl ? (
                <ZoomableImage
                  uri={resolveImageUrl(authStore.user.avatarUrl)!}
                  style={styles.headerAvatar}
                />
              ) : (
                <View style={styles.headerAvatarPlaceholder}>
                  <Text style={styles.headerAvatarText}>
                    {authStore.user?.firstName?.[0]?.toUpperCase()}
                    {authStore.user?.lastName?.[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.headerTextBlock}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={styles.headerTitle}
                >
                  {authStore.projectName || 'Dashboard'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  Welcome, {authStore.user?.fullName}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Status Card */}
          <View style={[styles.card, styles.statusCard]}>
            <View style={styles.statusHeader}>
              <View>
                <Text style={styles.cardTitle}>Agent Status</Text>
                <Text style={styles.statusText}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={handleStatusToggle}
                trackColor={{ false: '#d9d9d9', true: '#52c41a' }}
                thumbColor="#fff"
                ios_backgroundColor="#d9d9d9"
                disabled={chatStore.isStatusLoading}
              />
            </View>
            <Text style={styles.statusDescription}>
              {isOnline
                ? 'You are available to receive chats'
                : 'You will not receive new chats'}
            </Text>
          </View>

          {/*
           * TEMPORARY dev-only control: plays the incoming-call ringtone on
           * demand, so the sound can be checked without ringing the workspace.
           * Delete this block (and the `ringtone` import) once the ring is
           * confirmed on both platforms.
           */}
          {__DEV__ && (
            <TouchableOpacity
              style={[styles.card, styles.ringtoneTestCard]}
              onPress={() => {
                if (ringtone.isRinging()) {
                  ringtone.stop();
                  setRinging(false);
                  return;
                }
                ringtone.start(0.8);
                setRinging(true);

                // Say out loud what happened: "no audio engine" means the open
                // binary predates the native audio module, so nothing can play.
                const mode = ringtone.getMode();
                if (mode === 'vibration') {
                  Alert.alert(
                    'No audio engine in this build',
                    'The app fell back to vibration, so nothing plays on a simulator. The installed binary does not contain react-native-audio-api — it needs one native rebuild (pod install is already done).',
                  );
                } else if (mode === 'idle') {
                  Alert.alert(
                    'Ringtone did not start',
                    'Neither audio nor vibration started. Check the Metro logs for a [Ringtone] warning.',
                  );
                }

                // The melody loops; stop it after one pass so a forgotten
                // button cannot ring forever.
                setTimeout(() => {
                  ringtone.stop();
                  setRinging(false);
                }, 4600);
              }}
            >
              <View style={styles.ringtoneTestRow}>
                <Icon
                  name={ringing ? 'stop-circle' : 'musical-notes'}
                  size={20}
                  color="#25D366"
                />
                <Text style={styles.ringtoneTestTitle}>
                  {ringing ? 'Stop ringtone' : 'Test ringtone'}
                </Text>
              </View>
              <Text style={styles.ringtoneTestHint}>
                Development only — plays the incoming-call sound
              </Text>
            </TouchableOpacity>
          )}

          {/* KPI Cards Grid */}
          <View style={styles.kpiGrid}>
            {/* Open Chats */}
            <TouchableOpacity
              style={[styles.kpiCard, styles.kpiCardBlue]}
              onPress={() =>
                (navigation as any).navigate('ChatStack', {
                  screen: 'ConversationList',
                })
              }
            >
              <Text style={styles.kpiValue}>{openChatsCount}</Text>
              <Text style={styles.kpiLabel}>Open Chats</Text>
              <Icon
                name="chatbubbles"
                size={32}
                color="#fff"
                style={styles.kpiIcon}
              />
            </TouchableOpacity>

            {/* Claimed Chats */}
            <TouchableOpacity
              style={[styles.kpiCard, styles.kpiCardGreen]}
              onPress={() =>
                (navigation as any).navigate('ChatStack', {
                  screen: 'ConversationList',
                })
              }
            >
              <Text style={styles.kpiValue}>{claimedChatsCount}</Text>
              <Text style={styles.kpiLabel}>Claimed by You</Text>
              <Icon
                name="person"
                size={32}
                color="#fff"
                style={styles.kpiIcon}
              />
            </TouchableOpacity>

            {/* Requires Attention */}
            <TouchableOpacity
              style={[styles.kpiCard, styles.kpiCardOrange]}
              onPress={() =>
                (navigation as any).navigate('ChatStack', {
                  screen: 'ConversationList',
                })
              }
            >
              <Text style={styles.kpiValue}>{requiresAttentionCount}</Text>
              <Text style={styles.kpiLabel}>Needs Attention</Text>
              <Icon
                name="warning"
                size={32}
                color="#fff"
                style={styles.kpiIcon}
              />
            </TouchableOpacity>

            {/* AI Disabled */}
            <TouchableOpacity style={[styles.kpiCard, styles.kpiCardPurple]}>
              <Text style={styles.kpiValue}>{chatStore.aiDisabledCount}</Text>
              <Text style={styles.kpiLabel}>AI Disabled</Text>
              <Icon
                name="pause-circle"
                size={32}
                color="#fff"
                style={styles.kpiIcon}
              />
            </TouchableOpacity>

            {/* Orders (only shown when the Orders module is enabled AND user has permission) */}
            {showOrdersCard && (
              <TouchableOpacity
                style={[
                  styles.kpiCard,
                  styles.kpiCardOrders,
                  bothBusinessCards && styles.kpiCardHalf,
                ]}
                onPress={() => (navigation as any).navigate('Orders')}
              >
                <Text
                  style={[
                    styles.kpiValue,
                    bothBusinessCards && styles.kpiValueHalf,
                  ]}
                >
                  {totalOrders}
                </Text>
                <Text style={styles.kpiLabel}>Active Orders</Text>
                <Icon
                  name="cart"
                  size={32}
                  color="#fff"
                  style={styles.kpiIcon}
                />
              </TouchableOpacity>
            )}

            {/* WhatsApp calls — only on the WhatsApp plan AND when voice calling
                is switched on: the total count, with a flashing red dot while a
                call is ringing or live. */}
            {showCallsCard && (
              <TouchableOpacity
                style={[
                  styles.kpiCard,
                  styles.kpiCardCalls,
                  bothBusinessCards && styles.kpiCardHalf,
                ]}
                onPress={() =>
                  (navigation as any).navigate('ChatStack', {
                    screen: 'ConversationList',
                  })
                }
              >
                <View style={styles.kpiHeaderRow}>
                  <Text
                    style={[
                      styles.kpiValue,
                      bothBusinessCards && styles.kpiValueHalf,
                    ]}
                  >
                    {callStats?.total ?? 0}
                  </Text>
                  {(callStats?.active ?? 0) > 0 && <PulseDot />}
                </View>
                <Text style={styles.kpiLabel}>WhatsApp Calls</Text>
                <Text style={styles.kpiSubLabel} numberOfLines={1}>
                  {`${callStats?.active ?? 0} live · ${
                    callStats?.today ?? 0
                  } today`}
                </Text>
                <Icon
                  name="call"
                  size={32}
                  color="#fff"
                  style={styles.kpiIcon}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Upcoming Appointments */}
          {appointmentsEnabled && (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Icon
                  name="calendar"
                  size={20}
                  color="#1890ff"
                  style={styles.cardTitleIcon}
                />
                <Text style={styles.cardTitle}>
                  {appointmentsSectionTitle} ({appointments.length})
                </Text>
              </View>
              {appointmentsSubtitle && (
                <Text style={styles.appointmentsSectionSubtitle}>
                  {appointmentsSubtitle}
                </Text>
              )}
              {appointments.length === 0 ? (
                <>
                  <Text style={styles.placeholderText}>
                    No appointments scheduled
                  </Text>
                  <Text style={styles.placeholderSubtext}>
                    Appointments will appear here when customers book through AI
                  </Text>
                </>
              ) : (
                <View style={styles.appointmentsList}>
                  {/* Show max 5 appointments on dashboard for overview */}
                  {appointments.slice(0, 5).map(apt => (
                    <TouchableOpacity
                      key={apt.id}
                      style={styles.appointmentItem}
                      onPress={handleAppointmentPress}
                      activeOpacity={0.7}
                    >
                      <View style={styles.appointmentHeader}>
                        <Text style={styles.appointmentCustomer}>
                          {apt.customerName}
                        </Text>
                        <View
                          style={[
                            styles.appointmentStatusBadge,
                            { backgroundColor: getStatusColor(apt.status) },
                          ]}
                        >
                          <Text style={styles.appointmentStatusText}>
                            {apt.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.appointmentService}>
                        {apt.service?.name || 'N/A'}{' '}
                        {apt.service?.price ? `- $${apt.service.price}` : ''}
                      </Text>
                      <View style={styles.appointmentTimeRow}>
                        <Icon name="calendar-outline" size={16} color="#666" />
                        <Text style={styles.appointmentTime}>
                          {formatAppointmentDateTime(apt.appointmentDate)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() =>
                (navigation as any).navigate('ChatStack', {
                  screen: 'ConversationList',
                })
              }
            >
              <Icon
                name="chatbubbles"
                size={24}
                color="#1890ff"
                style={styles.quickActionIcon}
              />
              <View style={styles.quickActionContent}>
                <Text style={styles.quickActionTitle}>View All Chats</Text>
                <Text style={styles.quickActionSubtitle}>
                  Manage customer conversations
                </Text>
              </View>
              <Text style={styles.quickActionArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
});

/**
 * Get status color
 */
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return '#faad14';
    case 'CONFIRMED':
      return '#1890ff';
    case 'COMPLETED':
      return '#52c41a';
    case 'CANCELED':
      return '#ff4d4f';
    case 'NO_SHOW':
      return '#8c8c8c';
    default:
      return '#d9d9d9';
  }
};

/**
 * Format appointment date and time
 */
const formatAppointmentDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return `${dateStr} at ${timeStr}`;
  }
};

/**
 * Format next appointment date for subtitle
 */
const formatNextAppointmentDate = (date: Date, daysUntil: number): string => {
  if (daysUntil === 1) {
    return 'Tomorrow';
  } else if (daysUntil <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextBlock: {
    flex: 1,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  headerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1890ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusCard: {
    marginTop: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitleIcon: {
    marginRight: 8,
    marginTop: -2,
  },
  appointmentsSectionSubtitle: {
    fontSize: 13,
    color: '#1890ff',
    marginTop: 4,
    marginBottom: 8,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#52c41a',
    marginTop: 4,
  },
  statusDescription: {
    fontSize: 13,
    color: '#666',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    marginTop: 8,
  },
  kpiCard: {
    width: '47%',
    margin: '1.5%',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  kpiCardBlue: {
    backgroundColor: '#1890ff',
  },
  kpiCardGreen: {
    backgroundColor: '#52c41a',
  },
  kpiCardOrange: {
    backgroundColor: '#fa8c16',
  },
  kpiCardPurple: {
    backgroundColor: '#722ed1',
  },
  kpiCardOrders: {
    backgroundColor: '#eb2f96',
    width: '97%',
  },
  kpiCardCalls: {
    backgroundColor: '#25D366',
    width: '97%',
  },
  /**
   * When Orders AND Calls are both on screen they sit in one row, so the second
   * card is not pushed to a row of its own (with 97% width it used to be the
   * only thing the agent saw while scrolling).
   */
  kpiCardHalf: {
    width: '47%',
    padding: 16,
    // Both cards carry a different number of text lines; the taller one sets
    // the row height so the pair never looks ragged.
    minHeight: 124,
  },
  kpiValueHalf: {
    fontSize: 28,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kpiSubLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.85,
    marginTop: 4,
  },
  ringtoneTestCard: {
    paddingVertical: 14,
  },
  ringtoneTestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ringtoneTestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f1f1f',
  },
  ringtoneTestHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  pulseDotWrap: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotHalo: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4d4f',
  },
  pulseDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4d4f',
  },
  kpiValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  kpiIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    opacity: 0.3,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quickActionIcon: {
    marginRight: 16,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  quickActionArrow: {
    fontSize: 28,
    color: '#d9d9d9',
  },
  appointmentsList: {
    marginTop: 12,
  },
  appointmentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appointmentCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  appointmentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appointmentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  appointmentService: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  appointmentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appointmentTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
});

export default DashboardScreen;
