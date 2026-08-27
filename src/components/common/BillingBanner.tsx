/**
 * BillingBanner
 * Shows important account warnings at the top of screens:
 * - Trial expiry warning ("Your trial expires in X hours")
 * - License renewal warning (renewing soon + empty/insufficient wallet)
 *
 * Reads accountStatus from the AuthStore (populated by /v1/auth/me).
 * Since billing is managed from the web admin panel, the button guides the
 * user to add funds there.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useAuth } from '../../stores';

interface BillingBannerProps {
  style?: object;
}

const BillingBanner: React.FC<BillingBannerProps> = observer(({ style }) => {
  const authStore = useAuth();
  const accountStatus = authStore.accountStatus;

  // Nothing to warn about
  if (!accountStatus) {
    return null;
  }

  const trialMessage = accountStatus.warningMessage;
  const renewalMessage = accountStatus.renewalWarningMessage;

  if (!trialMessage && !renewalMessage) {
    return null;
  }

  // Trial severity: red when <= 24h, orange otherwise
  const hoursLeft = accountStatus.hoursUntilExpiry || 0;
  const isTrial = !!trialMessage;
  const isSevere = isTrial && hoursLeft <= 24;

  const handleAction = () => {
    Alert.alert(
      'Add Funds',
      isTrial
        ? 'Your free trial is ending soon.\n\nTo keep using the platform without interruption, add a payment method from the admin panel on the website (Billing → Add Credits).'
        : 'Your license is renewing soon.\n\nTo keep your services running, add funds to your 💰 Wallet Balance from the admin panel on the website (Billing → Add Credits).',
      [{ text: 'Got It' }],
    );
  };

  return (
    <View
      style={[
        styles.banner,
        isSevere ? styles.severeBanner : styles.warningBanner,
        style,
      ]}
    >
      <Text style={[styles.icon, isSevere ? styles.severeIcon : null]}>
        {isTrial ? '⚠️' : '⏰'}
      </Text>
      <View style={styles.content}>
        <Text
          style={[styles.message, isSevere ? styles.severeMessage : null]}
          numberOfLines={3}
        >
          <Text style={styles.bold}>
            {isTrial ? trialMessage : renewalMessage}
          </Text>
          {isTrial
            ? ' Add a payment method to continue using the platform without interruption.'
            : ''}
        </Text>
        <TouchableOpacity
          style={[styles.actionBtn, isSevere ? styles.severeActionBtn : null]}
          onPress={handleAction}
        >
          <Text style={styles.actionBtnText}>
            {isTrial ? 'Add Payment' : 'Add Funds'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff7e6',
    borderBottomWidth: 1,
    borderBottomColor: '#ffd591',
  },
  warningBanner: {
    backgroundColor: '#fff7e6',
  },
  severeBanner: {
    backgroundColor: '#fff1f0',
    borderBottomColor: '#ffa39e',
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  severeIcon: {
    color: '#cf1322',
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    color: '#ad4e00',
    lineHeight: 18,
  },
  severeMessage: {
    color: '#cf1322',
  },
  bold: {
    fontWeight: '600',
  },
  actionBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fa8c16',
  },
  severeActionBtn: {
    backgroundColor: '#ff4d4f',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default BillingBanner;
