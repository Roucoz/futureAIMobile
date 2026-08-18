/**
 * Error helpers for the mobile app
 */

/**
 * Detect whether an API error is a permission-denied (403) error.
 * Works with errors normalized by the API client (which sets
 * `isPermissionDenied`), and falls back to inspecting the raw message.
 */
export const isPermissionDeniedError = (error: any): boolean => {
    if (!error) return false;
    if (error?.isPermissionDenied === true) return true;
    if (error?.status === 403) {
        const message = String(
            error?.message || error?.data?.error || error?.data?.message || '',
        );
        return /insufficient permission/i.test(message);
    }
    return false;
};
