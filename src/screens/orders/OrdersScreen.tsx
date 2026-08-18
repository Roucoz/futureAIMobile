/**
 * Orders Screen
 * View and manage customer orders.
 * Design matches the Appointments screen (cards, empty state, history filter).
 */

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import ScreenBackground from '../../components/common/ScreenBackground';
import ModuleNotEnabled from '../../components/common/ModuleNotEnabled';
import PermissionDenied from '../../components/common/PermissionDenied';
import { useModule, useAuth } from '../../stores';
import { isPermissionDeniedError } from '../../utils/errors';
import {
  ordersService,
  Order,
  OrderStatus,
} from '../../services/api/orders.service';
import { websocketService } from '../../services/websocket/WebSocketService';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#fa8c16',
  CONFIRMED: '#1890ff',
  PREPARING: '#13c2c2',
  READY: '#2f54eb',
  OUT_FOR_DELIVERY: '#722ed1',
  DELIVERED: '#52c41a',
  COMPLETED: '#52c41a',
  CANCELED: '#f5222d',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELED: 'Canceled',
};

const STATUS_ICON_NAMES: Record<string, string> = {
  PENDING: 'time',
  CONFIRMED: 'checkmark-circle',
  PREPARING: 'restaurant',
  READY: 'checkmark-done-circle',
  OUT_FOR_DELIVERY: 'car',
  DELIVERED: 'checkmark-done',
  COMPLETED: 'checkmark-done-circle',
  CANCELED: 'close-circle',
};

const STATUS_FILTERS = [
  { key: 'date', label: 'History', iconName: 'time' },
  { key: 'ACTIVE', label: 'Active', iconName: 'pulse' },
  { key: 'ALL', label: 'All', iconName: 'list' },
  { key: 'PENDING', label: 'Pending', iconName: 'time' },
  { key: 'CONFIRMED', label: 'Confirmed', iconName: 'checkmark-circle' },
  { key: 'PREPARING', label: 'Preparing', iconName: 'restaurant' },
  { key: 'READY', label: 'Ready', iconName: 'checkmark-done-circle' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', iconName: 'car' },
  { key: 'DELIVERED', label: 'Delivered', iconName: 'checkmark-done' },
  { key: 'COMPLETED', label: 'Completed', iconName: 'checkmark-done-circle' },
  { key: 'CANCELED', label: 'Canceled', iconName: 'close-circle' },
];

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELED',
];

const OrdersScreen = observer(() => {
  const moduleStore = useModule();
  const authStore = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [dateRangeFrom, setDateRangeFrom] = useState<Date | null>(null);
  const [dateRangeTo, setDateRangeTo] = useState<Date | null>(null);
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [tempFromDate, setTempFromDate] = useState<Date>(new Date());
  const [tempToDate, setTempToDate] = useState<Date>(new Date());
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      // Make sure module status is known before deciding to fetch
      await moduleStore.ensureLoaded();
      if (!moduleStore.orders) {
        // Module disabled - skip API call, show nothing
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        setPermissionDenied(false);
        return;
      }
      // No group permission - skip API call (backend enforces orders:view too)
      if (!authStore.canAccessResource('orders')) {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        setPermissionDenied(true);
        return;
      }

      isRefresh ? setRefreshing(true) : setLoading(true);
      try {
        const data = await ordersService.getOrders();
        setOrders(data);
        setPermissionDenied(false);
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          // User was rejected by the API - show a friendly message
          setOrders([]);
          setPermissionDenied(true);
        } else {
          console.error('Failed to load orders:', error);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [moduleStore, authStore],
  );

  const loadOrdersRef = useRef(loadOrders);
  loadOrdersRef.current = loadOrders;

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  // Reload when app returns to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void loadOrders();
      }
    };
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [loadOrders]);

  // WebSocket: refresh on order changes
  useEffect(() => {
    const unsubscribe = websocketService.subscribe(message => {
      if (message.type === 'order_updated') {
        void loadOrders();
      }
    });
    return unsubscribe;
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (selectedStatus === 'ACTIVE') {
      list = list.filter(
        o => o.status !== 'COMPLETED' && o.status !== 'CANCELED',
      );
    } else if (selectedStatus && selectedStatus !== 'ALL') {
      list = list.filter(o => o.status === selectedStatus);
    }
    if (dateRangeFrom && dateRangeTo) {
      const start = new Date(dateRangeFrom);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRangeTo);
      end.setHours(23, 59, 59, 999);
      list = list.filter(o => {
        const d = new Date(o.createdAt);
        return d >= start && d <= end;
      });
    }
    return list;
  }, [orders, selectedStatus, dateRangeFrom, dateRangeTo]);

  const handleStatusFilter = (key: string) => {
    if (key === 'date') {
      setShowDateFilterModal(true);
      return;
    }
    setSelectedStatus(key);
  };

  const applyDateFilter = () => {
    setDateRangeFrom(tempFromDate);
    setDateRangeTo(tempToDate);
    setShowDateFilterModal(false);
  };

  const clearDateFilter = () => {
    setDateRangeFrom(null);
    setDateRangeTo(null);
    setShowDateFilterModal(false);
  };

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    setUpdatingId(order.id);
    try {
      await ordersService.updateOrder(order.id, { status });
      setSelected(prev =>
        prev && prev.id === order.id ? { ...prev, status } : prev,
      );
      await loadOrders();
    } catch (error) {
      console.error('Failed to update order:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTogglePaid = async (order: Order) => {
    setUpdatingId(order.id);
    try {
      await ordersService.updateOrder(order.id, { isPaid: !order.isPaid });
      setSelected(prev =>
        prev && prev.id === order.id ? { ...prev, isPaid: !prev.isPaid } : prev,
      );
      await loadOrders();
    } catch (error) {
      console.error('Failed to update payment:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    const createdAt = new Date(item.createdAt);
    const statusColor = STATUS_COLORS[item.status] || '#8c8c8c';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => setSelected(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateDay}>{format(createdAt, 'dd')}</Text>
            <Text style={styles.dateMonth}>{format(createdAt, 'MMM')}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.serviceName}>
              {item.items.length} item(s) ·{' '}
              {item.deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'}
            </Text>
            <Text style={styles.time}>
              {format(createdAt, 'h:mm a')} · $
              {(item.totalAmount ?? 0).toFixed(2)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Icon
              name={STATUS_ICON_NAMES[item.status] || 'ellipse'}
              size={20}
              color="#fff"
            />
          </View>
        </View>

        {item.customerPhone && (
          <View style={styles.contactInfo}>
            <Icon
              name="call"
              size={16}
              color="#1890ff"
              style={styles.contactIcon}
            />
            <Text style={styles.contactText}>{item.customerPhone}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABELS[item.status] || item.status}
          </Text>
          <View style={styles.footerRight}>
            <Icon
              name={item.isPaid ? 'card' : 'card-outline'}
              size={14}
              color={item.isPaid ? '#52c41a' : '#fa8c16'}
            />
            <Text
              style={[
                styles.paidText,
                { color: item.isPaid ? '#52c41a' : '#fa8c16' },
              ]}
            >
              {item.isPaid ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#1890ff" />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="cart" size={64} color="#d9d9d9" style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>No Orders</Text>
        <Text style={styles.emptyText}>
          {dateRangeFrom && dateRangeTo
            ? 'No orders found in the selected range'
            : selectedStatus && selectedStatus !== 'ALL'
            ? `No ${
                STATUS_LABELS[selectedStatus]?.toLowerCase() || 'matching'
              } orders found`
            : 'Orders will appear here when customers place them through AI'}
        </Text>
      </View>
    );
  };

  const renderStatusOptions = () => {
    return selected ? ALL_STATUSES.filter(s => s !== 'CANCELED') : [];
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {moduleStore.isLoaded && !moduleStore.orders ? (
        <ModuleNotEnabled iconName="cart" moduleName="Orders" />
      ) : !authStore.canAccessResource('orders') || permissionDenied ? (
        <PermissionDenied iconName="cart" featureName="Orders" />
      ) : (
        <ScreenBackground>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Orders</Text>
                <Text style={styles.subtitle}>
                  {dateRangeFrom && dateRangeTo
                    ? `${filteredOrders.length} in range`
                    : `${filteredOrders.length} active`}
                </Text>
              </View>
            </View>

            {/* Status Filter Tabs */}
            <View style={styles.filterContainer}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={STATUS_FILTERS}
                keyExtractor={item => item.key}
                renderItem={({ item }) => {
                  const isDateFilter = item.key === 'date';
                  const isDateActive =
                    isDateFilter && !!(dateRangeFrom && dateRangeTo);
                  const isSelected =
                    isDateActive || selectedStatus === item.key;
                  const statusColor = isDateFilter
                    ? '#1890ff'
                    : item.key === 'ALL' || item.key === 'ACTIVE'
                    ? '#595959'
                    : STATUS_COLORS[item.key] || '#595959';

                  return (
                    <TouchableOpacity
                      style={[
                        styles.filterTab,
                        isSelected && !isDateActive && styles.filterTabActive,
                        isSelected &&
                          !isDateActive && {
                            backgroundColor:
                              STATUS_COLORS[item.key] || '#1890ff',
                          },
                        isDateActive && styles.filterTabGrayActive,
                      ]}
                      onPress={() => handleStatusFilter(item.key)}
                    >
                      <Icon
                        name={item.iconName || 'list'}
                        size={14}
                        color={
                          isSelected && !isDateActive ? '#fff' : statusColor
                        }
                      />
                      <Text
                        style={[
                          styles.filterText,
                          isSelected &&
                            !isDateActive &&
                            styles.filterTextActive,
                          isDateActive && styles.filterTextGrayActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            {/* Active Date Filter Indicator */}
            {dateRangeFrom && dateRangeTo && (
              <View style={styles.dateFilterActiveBanner}>
                <View style={styles.dateFilterActiveLeft}>
                  <Icon name="time" size={16} color="#1890ff" />
                  <Text style={styles.dateFilterActiveText}>
                    Orders history from{' '}
                    {format(new Date(dateRangeFrom), 'MMM dd')} to{' '}
                    {format(new Date(dateRangeTo), 'MMM dd, yyyy')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={clearDateFilter}
                  style={styles.dateFilterClearBtn}
                >
                  <Icon name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            )}

            {/* Orders List */}
            <FlatList
              data={filteredOrders}
              keyExtractor={item => item.id}
              renderItem={renderOrderCard}
              ListEmptyComponent={renderEmpty}
              ListHeaderComponent={
                <View style={styles.sectionHeader}>
                  <Icon
                    name={dateRangeFrom ? 'time' : 'cart'}
                    size={18}
                    color={dateRangeFrom ? '#595959' : '#1890ff'}
                  />
                  <Text style={styles.sectionTitle}>
                    {dateRangeFrom && dateRangeTo
                      ? 'Orders History'
                      : selectedStatus === 'ALL'
                      ? 'All Orders'
                      : 'Active Orders'}
                  </Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadOrders(true)}
                  colors={['#1890ff']}
                />
              }
            />

            {/* Date Filter Modal */}
            <Modal
              visible={showDateFilterModal}
              animationType="slide"
              transparent
              onRequestClose={() => setShowDateFilterModal(false)}
            >
              <TouchableWithoutFeedback
                onPress={() => setShowDateFilterModal(false)}
              >
                <View style={styles.dateFilterOverlay}>
                  <TouchableWithoutFeedback onPress={() => {}}>
                    <View style={styles.dateFilterModal}>
                      <View style={styles.dateFilterHeader}>
                        <Text style={styles.dateFilterTitle}>
                          Orders History
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowDateFilterModal(false)}
                        >
                          <Icon name="close" size={24} color="#999" />
                        </TouchableOpacity>
                      </View>

                      <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.dateFilterLabel}>From</Text>
                        <TouchableOpacity
                          style={[
                            styles.dateField,
                            activePicker === 'from' && styles.dateFieldActive,
                          ]}
                          onPress={() =>
                            setActivePicker(
                              activePicker === 'from' ? null : 'from',
                            )
                          }
                        >
                          <Icon name="calendar" size={20} color="#1890ff" />
                          <Text style={styles.dateFieldText}>
                            {format(tempFromDate, 'MMM dd, yyyy')}
                          </Text>
                          <Icon
                            name={
                              activePicker === 'from'
                                ? 'chevron-up'
                                : 'chevron-down'
                            }
                            size={18}
                            color="#999"
                          />
                        </TouchableOpacity>
                        {activePicker === 'from' && (
                          <View style={styles.pickerContainer}>
                            <DateTimePicker
                              value={tempFromDate}
                              mode="date"
                              display={
                                Platform.OS === 'ios' ? 'spinner' : 'default'
                              }
                              onChange={(_event, pickedDate) => {
                                if (pickedDate) {
                                  setTempFromDate(pickedDate);
                                  if (pickedDate > tempToDate) {
                                    setTempToDate(pickedDate);
                                  }
                                }
                                if (Platform.OS === 'android') {
                                  setActivePicker(null);
                                }
                              }}
                              themeVariant="light"
                            />
                            {Platform.OS === 'ios' && (
                              <TouchableOpacity
                                style={styles.pickerDoneBtn}
                                onPress={() => setActivePicker(null)}
                              >
                                <Text style={styles.pickerDoneText}>Done</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}

                        <Text
                          style={[
                            styles.dateFilterLabel,
                            styles.dateFilterLabelSpaced,
                          ]}
                        >
                          To
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.dateField,
                            activePicker === 'to' && styles.dateFieldActive,
                          ]}
                          onPress={() =>
                            setActivePicker(activePicker === 'to' ? null : 'to')
                          }
                        >
                          <Icon name="calendar" size={20} color="#1890ff" />
                          <Text style={styles.dateFieldText}>
                            {format(tempToDate, 'MMM dd, yyyy')}
                          </Text>
                          <Icon
                            name={
                              activePicker === 'to'
                                ? 'chevron-up'
                                : 'chevron-down'
                            }
                            size={18}
                            color="#999"
                          />
                        </TouchableOpacity>
                        {activePicker === 'to' && (
                          <View style={styles.pickerContainer}>
                            <DateTimePicker
                              value={tempToDate}
                              mode="date"
                              display={
                                Platform.OS === 'ios' ? 'spinner' : 'default'
                              }
                              onChange={(_event, pickedDate) => {
                                if (pickedDate) {
                                  setTempToDate(pickedDate);
                                }
                                if (Platform.OS === 'android') {
                                  setActivePicker(null);
                                }
                              }}
                              minimumDate={tempFromDate}
                              themeVariant="light"
                            />
                            {Platform.OS === 'ios' && (
                              <TouchableOpacity
                                style={styles.pickerDoneBtn}
                                onPress={() => setActivePicker(null)}
                              >
                                <Text style={styles.pickerDoneText}>Done</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </ScrollView>

                      <View style={styles.dateFilterActions}>
                        <TouchableOpacity
                          style={styles.dateFilterClearButton}
                          onPress={clearDateFilter}
                        >
                          <Text style={styles.dateFilterClearText}>
                            Clear Filter
                          </Text>
                        </TouchableOpacity>
                        <View style={styles.dateFilterActionRight}>
                          <TouchableOpacity
                            style={styles.dateFilterCancelButton}
                            onPress={() => setShowDateFilterModal(false)}
                          >
                            <Text style={styles.dateFilterCancelText}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.dateFilterApplyButton}
                            onPress={applyDateFilter}
                          >
                            <Text style={styles.dateFilterApplyText}>
                              Apply
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>

            {/* Order Details Modal */}
            <Modal
              visible={!!selected}
              animationType="slide"
              transparent
              onRequestClose={() => setSelected(null)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Order Details</Text>
                    <TouchableOpacity onPress={() => setSelected(null)}>
                      <Icon name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>

                  {selected && (
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Customer</Text>
                        <Text style={styles.detailValue}>
                          {selected.customerName}
                        </Text>
                      </View>
                      {selected.customerPhone && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Phone</Text>
                          <Text style={styles.detailValue}>
                            {selected.customerPhone}
                          </Text>
                        </View>
                      )}
                      {selected.address && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Address</Text>
                          <Text style={styles.detailValue}>
                            {selected.address}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Method</Text>
                        <Text style={styles.detailValue}>
                          {selected.deliveryMethod === 'pickup'
                            ? 'Pickup'
                            : 'Delivery'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total</Text>
                        <Text style={styles.detailValue}>
                          ${(selected.totalAmount ?? 0).toFixed(2)}
                        </Text>
                      </View>

                      <Text style={styles.itemsTitle}>Items</Text>
                      {selected.items.map(item => (
                        <View key={item.id} style={styles.itemRow}>
                          <Text style={styles.itemName}>
                            {item.quantity}× {item.productName}
                          </Text>
                          <Text style={styles.itemPrice}>
                            ${(item.totalPrice ?? 0).toFixed(2)}
                          </Text>
                        </View>
                      ))}

                      {selected.customerNotes && (
                        <View style={styles.notesBlock}>
                          <Text style={styles.detailLabel}>Notes</Text>
                          <Text style={styles.detailValue}>
                            {selected.customerNotes}
                          </Text>
                        </View>
                      )}

                      <Text style={styles.itemsTitle}>Status</Text>
                      <View style={styles.statusOptions}>
                        {renderStatusOptions().map(status => (
                          <TouchableOpacity
                            key={status}
                            style={[
                              styles.statusOption,
                              selected.status === status &&
                                styles.statusOptionActive,
                            ]}
                            onPress={() => handleStatusChange(selected, status)}
                            disabled={updatingId === selected.id}
                          >
                            <Text
                              style={[
                                styles.statusOptionText,
                                selected.status === status &&
                                  styles.statusOptionTextActive,
                              ]}
                            >
                              {STATUS_LABELS[status]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.paidButton,
                          selected.isPaid && styles.paidButtonActive,
                        ]}
                        onPress={() => handleTogglePaid(selected)}
                        disabled={updatingId === selected.id}
                      >
                        <Icon
                          name={
                            selected.isPaid
                              ? 'checkmark-circle'
                              : 'card-outline'
                          }
                          size={18}
                          color={selected.isPaid ? '#fff' : '#1890ff'}
                        />
                        <Text
                          style={[
                            styles.paidButtonText,
                            selected.isPaid && styles.paidButtonTextActive,
                          ]}
                        >
                          {selected.isPaid ? 'Marked as Paid' : 'Mark as Paid'}
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  )}
                </View>
              </View>
            </Modal>
          </View>
        </ScreenBackground>
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f6fa' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerLeft: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle: { fontSize: 14, color: '#8c8c8c', marginTop: 4 },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterTabActive: { backgroundColor: '#1890ff' },
  filterTabGrayActive: { backgroundColor: '#f0f0f0' },
  filterText: { fontSize: 14, color: '#595959', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  filterTextGrayActive: { color: '#1a1a1a' },
  dateFilterActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e6f7ff',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  dateFilterActiveLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateFilterActiveText: { fontSize: 13, color: '#1890ff' },
  dateFilterClearBtn: { padding: 2 },
  listContent: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f5f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateDay: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  dateMonth: {
    fontSize: 12,
    color: '#8c8c8c',
    textTransform: 'uppercase',
  },
  cardInfo: { flex: 1 },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  serviceName: { fontSize: 14, color: '#595959', marginBottom: 2 },
  time: { fontSize: 13, color: '#8c8c8c' },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactIcon: { marginRight: 8 },
  contactText: { fontSize: 14, color: '#595959' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paidText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: { marginBottom: 16 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8c8c8c',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  dateFilterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dateFilterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 24,
  },
  dateFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateFilterTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  dateFilterLabel: { fontSize: 13, color: '#595959', marginBottom: 6 },
  dateFilterLabelSpaced: { marginTop: 16 },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  dateFieldActive: { borderColor: '#1890ff', backgroundColor: '#f0f7ff' },
  dateFieldText: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  pickerContainer: { marginTop: 4 },
  pickerDoneBtn: { alignSelf: 'flex-end', padding: 8 },
  pickerDoneText: { fontSize: 14, color: '#1890ff', fontWeight: '600' },
  dateFilterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  dateFilterClearButton: { paddingVertical: 8 },
  dateFilterClearText: { fontSize: 14, color: '#f5222d' },
  dateFilterActionRight: { flexDirection: 'row', gap: 12 },
  dateFilterCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dateFilterCancelText: { fontSize: 14, color: '#595959' },
  dateFilterApplyButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1890ff',
  },
  dateFilterApplyText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailLabel: { fontSize: 13, color: '#888' },
  detailValue: { fontSize: 14, color: '#1a1a1a', flex: 1, textAlign: 'right' },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemName: { fontSize: 14, color: '#1a1a1a' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  notesBlock: { marginTop: 12 },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: '#fff',
  },
  statusOptionActive: { backgroundColor: '#1890ff', borderColor: '#1890ff' },
  statusOptionText: { fontSize: 12, color: '#666' },
  statusOptionTextActive: { color: '#fff' },
  paidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1890ff',
    marginTop: 16,
  },
  paidButtonActive: { backgroundColor: '#52c41a', borderColor: '#52c41a' },
  paidButtonText: { fontSize: 14, fontWeight: '600', color: '#1890ff' },
  paidButtonTextActive: { color: '#fff' },
});

export default OrdersScreen;
