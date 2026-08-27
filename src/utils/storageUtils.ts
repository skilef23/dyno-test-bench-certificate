/**
 * Storage Utility with Quota-Exceeded Safeguards & Auto-Cleanup
 * Prevents browser QuotaExceededError crashes in sandboxed iframe environments.
 */

export const STORAGE_KEYS = {
  USERS: 'kra_dyno_users_v5',
  PRODUCTS: 'kra_dyno_products_v5',
  RECORDS: 'kra_dyno_records_v5',
  AUDIT: 'kra_dyno_audit_v5',
  ACTIVE_USER_ID: 'kra_dyno_session_user_v5',
  PARAMETER_LIBRARY: 'kra_dyno_param_library_v5',
} as const;

/**
 * Remove obsolete/legacy storage keys from previous builds and free up quota.
 */
export function purgeLegacyStorageKeys() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const currentKeys = new Set(Object.values(STORAGE_KEYS));
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Clean old versions like kra_dyno_*_v1, _v2, _v3, _v4 or other stale keys
      if (key.startsWith('kra_dyno_') && !currentKeys.has(key as any)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });
  } catch (err) {
    console.warn('Unable to purge legacy localStorage keys:', err);
  }
}

/**
 * Safe getItem with JSON parsing and fallback.
 */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`Notice: Could not parse storage key "${key}", using defaults:`, err);
    return fallback;
  }
}

/**
 * Safe setItem that catches QuotaExceededError, purges stale caches,
 * trims non-critical payloads, and seamlessly falls back to memory state.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    // 1. Purge legacy versions immediately
    purgeLegacyStorageKeys();

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr: any) {
      // 2. If it's QuotaExceededError, prune non-essential storage (e.g. audit logs or older records)
      const isQuotaError =
        retryErr?.name === 'QuotaExceededError' ||
        retryErr?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        retryErr?.code === 22 ||
        retryErr?.code === 1014 ||
        retryErr?.number === -2147024882;

      if (isQuotaError) {
        try {
          // Attempt to remove transient audit logs to free up space
          if (key !== STORAGE_KEYS.AUDIT) {
            localStorage.removeItem(STORAGE_KEYS.AUDIT);
          }
          localStorage.setItem(key, value);
          return true;
        } catch {
          // 3. Fallback: if records is too large, try saving a compact version with fewer records
          if (key === STORAGE_KEYS.RECORDS) {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed) && parsed.length > 5) {
                // Keep the latest 5 records in localStorage to stay well under quota
                const compact = parsed.slice(0, 5);
                localStorage.setItem(key, JSON.stringify(compact));
                return true;
              }
            } catch {
              // ignore
            }
          }
          console.warn(`Storage notice: "${key}" saved in memory state to maintain responsive session.`);
          return false;
        }
      }
      return false;
    }
  }
}

/**
 * Safe removeItem.
 */
export function safeLocalStorageRemove(key: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Error removing localStorage key "${key}":`, err);
  }
}

