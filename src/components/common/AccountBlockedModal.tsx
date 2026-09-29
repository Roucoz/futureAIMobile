/**
 * AccountBlockedModal
 *
 * The mobile twin of the web panel's blocked modal: it appears the moment the
 * workspace is restricted — trial over, renewal that could not be charged, or
 * suspended — because the API only refuses WRITES. Without it the user browses
 * normally and only discovers the problem when a save or a reply fails.
 *
 * It is dismissible on purpose: read-only browsing still works, and BillingBanner
 * stays pinned on every screen as the persistent reminder. Dismissing hides the
 * modal for THIS reason only, so an escalation (trial expired → suspended) shows
 * up again.
 *
 * Billing is managed from the web panel, so the primary action opens the
 * dashboard there; when the API is a local address with no web twin, it falls
 * back to instructions.
 */

import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useAuth } from '../../stores';
import {
  getBlockedCopy,
  openBillingOnWeb,
} from '../../utils/accountStatusCopy';

const money = (amount: number, currency: string) =>
  `${amount.toFixed(2)} ${currency}`;

const AccountBlockedModal: React.FC = observer(() => {
  const authStore = useAuth();
  const accountStatus = authStore.accountStatus;

  // Which reason the user already dismissed (see the note in the header).
  const [dismissedReason, setDismissedReason] = useState<string | null>(null);

  if (!accountStatus?.isBlocked || dismissedReason === accountStatus.reason) {
    return null;
  }

  const copy = getBlockedCopy(accountStatus);
  const isSevere = accountStatus.reason === 'SUSPENDED';

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={() => setDismissedReason(accountStatus.reason)}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardContent}
          >
            <Text style={styles.icon}>{copy.icon}</Text>
            <Text style={[styles.title, isSevere && styles.severeTitle]}>
              {copy.title}
            </Text>

            <View
              style={[
                styles.alertBox,
                isSevere ? styles.severeAlertBox : styles.warningAlertBox,
              ]}
            >
              <Text style={styles.alertText}>
                {copy.firstLine}
                {'\n'}
                <Text style={styles.bold}>
                  Current Balance:{' '}
                  {money(accountStatus.balance, accountStatus.currency)}
                </Text>
                {accountStatus.amountNeeded > 0 && (
                  <>
                    {'\n'}
                    <Text style={styles.amountNeeded}>
                      Amount Needed:{' '}
                      {money(
                        accountStatus.amountNeeded,
                        accountStatus.currency,
                      )}
                    </Text>
                  </>
                )}
                {'\n'}
                {copy.actionLine}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>What works right now:</Text>
            <Text style={styles.bullet}>
              • Read-only access to your conversations and data
            </Text>
            <Text style={styles.bullet}>
              • Your data is safe — nothing is ever deleted
            </Text>

            <Text style={styles.sectionTitle}>What is paused:</Text>
            <Text style={styles.bullet}>• AI replies to your customers</Text>
            <Text style={styles.bullet}>
              • Channel automations and broadcasts
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, isSevere && styles.severeBtn]}
              onPress={() => openBillingOnWeb(copy.cta)}
            >
              <Text style={styles.primaryBtnText}>{copy.cta}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setDismissedReason(accountStatus.reason)}
            >
              <Text style={styles.secondaryBtnText}>
                Continue in read-only mode
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardContent: {
    padding: 20,
  },
  icon: {
    fontSize: 44,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#262626',
    textAlign: 'center',
    marginBottom: 14,
  },
  severeTitle: {
    color: '#cf1322',
  },
  alertBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  warningAlertBox: {
    backgroundColor: '#fff7e6',
    borderColor: '#ffd591',
  },
  severeAlertBox: {
    backgroundColor: '#fff1f0',
    borderColor: '#ffa39e',
  },
  alertText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#595959',
  },
  bold: {
    fontWeight: '600',
    color: '#262626',
  },
  amountNeeded: {
    fontWeight: '600',
    color: '#cf1322',
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 6,
  },
  bullet: {
    fontSize: 13,
    lineHeight: 20,
    color: '#595959',
    marginBottom: 2,
  },
  primaryBtn: {
    marginTop: 18,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#fa8c16',
    alignItems: 'center',
  },
  severeBtn: {
    backgroundColor: '#ff4d4f',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#8c8c8c',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AccountBlockedModal;
