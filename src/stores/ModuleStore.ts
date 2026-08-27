/**
 * ModuleStore - MobX State Tree
 * Tracks which paid modules are enabled for the project.
 * Fetches once from /v1/billing/modules and gates feature access
 * (so disabled modules don't trigger API calls or warnings).
 */

import { types, flow, Instance } from 'mobx-state-tree';
import {
    moduleService,
    EnabledModule,
} from '../services/api/module.service';

// ModuleStore
export const ModuleStore = types
    .model('ModuleStore', {
        widget: types.optional(types.boolean, true), // Always enabled (base feature)
        whatsapp: types.optional(types.boolean, false),
        facebook: types.optional(types.boolean, false),
        instagram: types.optional(types.boolean, false),
        telegram: types.optional(types.boolean, false),
        sms: types.optional(types.boolean, false),
        email: types.optional(types.boolean, false),
        appointments: types.optional(types.boolean, false),
        orders: types.optional(types.boolean, false),
        exitIntent: types.optional(types.boolean, false),
        ticketing: types.optional(types.boolean, false),
        isLoading: types.optional(types.boolean, false),
        isLoaded: types.optional(types.boolean, false),
    })
    .actions(self => {
        /**
         * Fetch module statuses from billing API (idempotent)
         */
        const fetchModuleStatuses = flow(function* () {
            if (self.isLoading) return;
            self.isLoading = true;

            // Reset to disabled defaults BEFORE fetching so stale flags from a
            // previous session/project never leak (e.g. right after switching
            // Google accounts). If the fetch fails below, flags stay disabled,
            // which is the safe default — a disabled module never gets called.
            self.widget = true; // Widget is always enabled (base feature)
            self.whatsapp = false;
            self.facebook = false;
            self.instagram = false;
            self.telegram = false;
            self.sms = false;
            self.email = false;
            self.appointments = false;
            self.orders = false;
            self.exitIntent = false;
            self.ticketing = false;
            self.isLoaded = false;

            try {
                const modules: EnabledModule[] =
                    yield moduleService.getEnabledModules();

                const enabled = new Set(
                    modules.filter(m => m.isEnabled).map(m => m.moduleType),
                );

                self.widget = true; // Widget is always available (base feature)
                self.whatsapp = enabled.has('MODULE_WHATSAPP_BROADCAST');
                self.facebook = enabled.has('MODULE_FACEBOOK_MESSENGER');
                self.instagram = enabled.has('MODULE_INSTAGRAM');
                self.telegram = enabled.has('MODULE_TELEGRAM');
                self.sms = enabled.has('MODULE_SMS_BROADCAST');
                self.email = enabled.has('MODULE_EMAIL_BROADCAST');
                self.appointments = enabled.has('MODULE_APPOINTMENTS');
                self.orders = enabled.has('MODULE_ORDERS');
                self.exitIntent = enabled.has('MODULE_EXIT_INTENT');
                self.ticketing = enabled.has('MODULE_TICKETING');
                self.isLoaded = true;
            } catch {
                // Keep defaults (false) if the fetch fails — modules will be retried
                // on the next ensureLoaded call. No warning is raised here on purpose.
            } finally {
                self.isLoading = false;
            }
        });

        /**
         * Ensure module statuses are loaded before making gating decisions.
         * Safe to call from any screen/load function.
         */
        const ensureLoaded = flow(function* () {
            if (self.isLoaded || self.isLoading) return;
            yield fetchModuleStatuses();
        });

        return {
            fetchModuleStatuses,
            ensureLoaded,
        };
    });

export type IModuleStore = Instance<typeof ModuleStore>;
export default ModuleStore;
