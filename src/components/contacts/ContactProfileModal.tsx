/**
 * Customer profile as a modal.
 *
 * The profile is opened from lists (appointments, orders, tickets, chats) that
 * live in *other* tabs. Navigating into the Contacts tab meant Back landed on
 * the Contacts list instead of the screen the agent came from, so the profile is
 * presented as a modal on top of the current screen: closing it returns exactly
 * where they were.
 *
 * Rendering it inside a `<Modal>` also keeps the host screen's navigation
 * object, so every link inside the profile (chat history, tickets, orders,
 * appointments, Start chat, Create ticket, Send SMS) keeps working exactly as it
 * does from the Contacts tab.
 */

import React from 'react';
import { Modal } from 'react-native';
import ContactDetailScreen from '../../screens/contacts/ContactDetailScreen';
import type { Contact } from '../../services/api/contact.service';

type Props = {
  contact: Contact | null;
  onClose: () => void;
};

export const ContactProfileModal: React.FC<Props> = ({ contact, onClose }) => (
  <Modal
    visible={Boolean(contact)}
    animationType="slide"
    presentationStyle="pageSheet"
    onRequestClose={onClose}
  >
    {contact ? (
      <ContactDetailScreen contact={contact} onClose={onClose} />
    ) : null}
  </Modal>
);

export default ContactProfileModal;
