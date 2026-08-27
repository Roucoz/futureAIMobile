/**
 * Contact Orders Screen
 * Shows all orders for a specific contact
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Order } from '../../services/api/orders.service';

interface RouteParams {
  contactName: string;
  orders: Order[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#fa8c16',
  CONFIRMED: '#1890ff',
  PREPARING: '#722ed1',
  READY: '#13c2c2',
  OUT_FOR_DELIVERY: '#2f54eb',
  DELIVERED: '#52c41a',
  COMPLETED: '#52c41a',
  CANCELED: '#8c8c8c',
};

const ContactOrdersScreen = () => {
  const route = useRoute();
  const { contactName, orders } = route.params as RouteParams;

  const renderOrder = ({ item }: { item: Order }) => {
    const date = new Date(item.createdAt).toLocaleDateString();
    const statusColor = STATUS_COLORS[item.status] || '#d9d9d9';

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>
            Order #{item.id.slice(-6).toUpperCase()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>

        {item.totalAmount != null && (
          <Text style={styles.orderAmount}>
            ${Number(item.totalAmount).toFixed(2)}
          </Text>
        )}

        <View style={styles.orderMeta}>
          <View style={styles.metaRow}>
            <Icon
              name="cube"
              size={14}
              color="#666"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.metaText}>
              {item.items?.length || 0} item
              {(item.items?.length || 0) !== 1 ? 's' : ''}
            </Text>
          </View>
          {item.deliveryMethod && (
            <View style={styles.metaRow}>
              <Icon
                name="bicycle"
                size={14}
                color="#666"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.metaText}>{item.deliveryMethod}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Icon
              name={item.isPaid ? 'checkmark-circle' : 'time'}
              size={14}
              color={item.isPaid ? '#52c41a' : '#fa8c16'}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.metaText}>
              {item.isPaid ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>Created: {date}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Order History</Text>
          <Text style={styles.headerSubtitle}>{contactName}</Text>
        </View>

        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon
                name="cube-outline"
                size={64}
                color="#d9d9d9"
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          }
        />
      </View>
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  orderMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ContactOrdersScreen;
