/**
 * Is WhatsApp voice calling available for this workspace?
 *
 * Calling is a capability of the WhatsApp module and is switched on per
 * workspace in the admin panel. Buttons that place a call ask this first, so a
 * workspace with calling off never shows a button that can only fail.
 *
 * The call itself is placed by `callManager`; this hook only answers whether the
 * entry points should render.
 */

import { useEffect, useState } from 'react';
import { useModule } from '../stores';
import callsService from '../services/api/calls.service';

export const useWhatsAppCalling = (): boolean => {
    const moduleStore = useModule();
    const [enabled, setEnabled] = useState(false);

    // The module list is fetched once at login; make sure it has run so the
    // WhatsApp gate below is accurate on a cold screen mount.
    useEffect(() => {
        moduleStore.ensureLoaded();
    }, [moduleStore]);

    useEffect(() => {
        let cancelled = false;

        // `null` means the endpoint refused (module off, integration missing),
        // which is the same answer as "calling disabled".
        void callsService.getSettings().then((settings) => {
            if (!cancelled) setEnabled(settings?.isEnabled === true);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return enabled && moduleStore.isLoaded && moduleStore.whatsapp;
};

export default useWhatsAppCalling;
