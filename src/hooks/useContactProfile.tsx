/**
 * `useContactProfile()` — one line in a screen gets a working "open the customer
 * file" action that closes back onto the same screen.
 *
 *   const { openContact, contactProfileModal } = useContactProfile();
 *   ...
 *   onPress={() => void openContact(item.customerPhone, item.customerName)}
 *   ...
 *   {contactProfileModal}
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { ContactProfileModal } from '../components/contacts/ContactProfileModal';
import contactService, { type Contact } from '../services/api/contact.service';

const normalise = (value: string) => value.replace(/[^\d]/g, '');

/**
 * Exact phone match on top of the contacts search (which may be fuzzy).
 * Returns null when the number has no customer file.
 */
export const findContactByPhone = async (
  phoneNumber?: string | null,
): Promise<Contact | null> => {
  const phone = (phoneNumber || '').trim();
  if (!phone) return null;

  const { contacts } = await contactService.getContacts({
    search: phone,
    pageSize: 10,
  });
  const target = normalise(phone);

  return (
    contacts.find(contact => normalise(contact.phoneNumber) === target) ??
    contacts[0] ??
    null
  );
};

export const useContactProfile = () => {
  const [contact, setContact] = useState<Contact | null>(null);

  const openContact = useCallback(
    async (phoneNumber?: string | null, fallbackName?: string | null) => {
      const phone = (phoneNumber || '').trim();

      if (!phone) {
        Alert.alert(
          'No customer file',
          `${
            fallbackName || 'This customer'
          } has no phone number on record, so there is no profile to open.`,
        );
        return;
      }

      // Website visitors are stored under a synthetic `v_…` id, not a phone
      // number, so there is no customer record to open (same rule as on web).
      if (!/^\+?[\d\s()-]+$/.test(phone)) {
        Alert.alert(
          'Website visitor',
          'This chat comes from the website widget and has no phone number, so there is no customer file to open.',
        );
        return;
      }

      try {
        const found = await findContactByPhone(phone);
        if (!found) {
          Alert.alert(
            'No customer file',
            `No customer file exists for ${fallbackName || phone} yet.`,
          );
          return;
        }
        setContact(found);
      } catch (error) {
        console.error('Failed to open customer profile:', error);
        Alert.alert('Error', 'Could not open the customer profile');
      }
    },
    [],
  );

  const closeContact = useCallback(() => setContact(null), []);

  const contactProfileModal = useMemo(
    () => <ContactProfileModal contact={contact} onClose={closeContact} />,
    [contact, closeContact],
  );

  return { openContact, closeContact, contactProfileModal };
};

export default useContactProfile;
