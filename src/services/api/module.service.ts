/**
 * Module Service
 * API calls for module enablement status (billing)
 */

import apiClient from './client';

export interface EnabledModule {
    moduleType: string;
    enabledAt: string | null;
    disabledAt: string | null;
    activationFee: number;
    isEnabled: boolean;
}

class ModuleService {
    /**
     * Get all modules for the project with enablement status
     * GET /v1/billing/modules
     */
    async getEnabledModules(): Promise<EnabledModule[]> {
        const response = await apiClient.get('/v1/billing/modules');
        const data = response.data?.data;
        const modules = Array.isArray(data)
            ? data
            : Array.isArray(data?.modules)
                ? data.modules
                : [];
        return modules;
    }
}

export const moduleService = new ModuleService();
export default moduleService;
