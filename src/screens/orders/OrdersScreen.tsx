/**
 * Orders Screen
 * View and manage customer orders
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import ScreenBackground from '../../components/common/ScreenBackground';
import {
  ordersService,
  Order,
  OrderStatus,
} from '../../services/api/orders.service';

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

const ACTIVE_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      try {
        const statuses = showCompleted
          ? ALL_STATUSES
          : ACTIVE_STATUSES.filter(s => s !== 'CANCELED');
        const data = await ordersService.getOrders(statuses);
        setOrders(data);
      } catch (error) {
        console.error('Failed to load orders:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showCompleted],
  );

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

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

  const renderOrder = ({ item }: { item: Order }) => {
    const statusColor = STATUS_COLORS[item.status] || '#8c8c8c';
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => setSelected(item)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.orderMeta}>
              {item.items.length} item(s) ·{' '}
              {item.deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'}
            </Text>
          </View>
          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              ${(item.totalAmount ?? 0).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
          <View style={styles.footerRight}>
            {item.isPaid ? (
              <Icon name="card" size={14} color="#52c41a" />
            ) : (
              <Icon name="card-outline" size={14} color="#fa8c16" />
            )}
            <Text
              style={[
                styles.paidText,
                { color: item.isPaid ? '#52c41a' : '#fa8c16' },
              ]}
            >
              {item.isPaid ? 'Paid' : 'Unpaid'}
            </Text>
            <Text style={styles.dateText}>
              {format(new Date(item.createdAt), 'MMM dd, HH:mm')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatusOptions = () => {
    const options: OrderStatus[] = selected
      ? ALL_STATUSES.filter(s => s !== 'CANCELED')
      : [];
    return options;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenBackground>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Orders</Text>
              <Text style={styles.subtitle}>
                Track and manage customer orders
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.filterButton,
                showCompleted && styles.filterButtonActive,
              ]}
              onPress={() => setShowCompleted(v => !v)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  showCompleted && styles.filterButtonTextActive,
                ]}
              >
                {showCompleted ? 'All' : 'Active'}
              </Text>
            </TouchableOpacity>
          </View>

          {loading && orders.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1890ff" />
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="cart-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          ) : (
            <FlatList
              data={orders}
              keyExtractor={item => item.id}
              renderItem={renderOrder}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadOrders(true)}
                />
              }
            />
          )}

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
                          selected.isPaid ? 'checkmark-circle' : 'card-outline'
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
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f6fa' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1f1f1f' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: '#fff',
  },
  filterButtonActive: { backgroundColor: '#1890ff', borderColor: '#1890ff' },
  filterButtonText: { fontSize: 13, color: '#666' },
  filterButtonTextActive: { color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { fontSize: 15, color: '#999' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  orderHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  customerName: { fontSize: 16, fontWeight: '600', color: '#1f1f1f' },
  orderMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  totalBlock: { alignItems: 'flex-end' },
  totalLabel: { fontSize: 11, color: '#999' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#1f1f1f' },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paidText: { fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: 12, color: '#999', marginLeft: 8 },
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
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f1f1f' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailLabel: { fontSize: 13, color: '#888' },
  detailValue: { fontSize: 14, color: '#1f1f1f', flex: 1, textAlign: 'right' },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f1f1f',
    marginTop: 16,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemName: { fontSize: 14, color: '#1f1f1f' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#1f1f1f' },
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
