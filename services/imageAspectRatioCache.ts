/**
 * Global cache for image aspect ratios
 * Persists across component unmounts and tab switches
 * Optionally stores in localStorage for persistence across page reloads
 */

// In-memory cache (fast access)
const aspectRatioCache = new Map<string, number>();

// localStorage key
const CACHE_KEY = 'imageAspectRatioCache';
const MAX_CACHE_SIZE = 500; // Limit cache size to prevent memory issues

/**
 * Load cache from localStorage on module initialization
 */
const loadCacheFromStorage = (): void => {
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as [string, number][];
            parsed.forEach(([url, ratio]) => aspectRatioCache.set(url, ratio));
        }
    } catch (error) {
        console.warn('Failed to load aspect ratio cache from localStorage:', error);
    }
};

/**
 * Save cache to localStorage (throttled to avoid excessive writes)
 */
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const saveCacheToStorage = (): void => {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        try {
            const entries = Array.from(aspectRatioCache.entries());
            // Keep only the most recent entries if cache is too large
            const toStore = entries.slice(-MAX_CACHE_SIZE);
            localStorage.setItem(CACHE_KEY, JSON.stringify(toStore));
        } catch (error) {
            console.warn('Failed to save aspect ratio cache to localStorage:', error);
        }
    }, 1000); // Debounce by 1 second
};

/**
 * Get aspect ratio from cache
 */
export const getAspectRatio = (url: string): number | undefined => {
    return aspectRatioCache.get(url);
};

/**
 * Set aspect ratio in cache
 */
export const setAspectRatio = (url: string, ratio: number): void => {
    aspectRatioCache.set(url, ratio);
    saveCacheToStorage();
};

/**
 * Check if aspect ratio is cached
 */
export const hasAspectRatio = (url: string): boolean => {
    return aspectRatioCache.has(url);
};

/**
 * Clear entire cache
 */
export const clearCache = (): void => {
    aspectRatioCache.clear();
    localStorage.removeItem(CACHE_KEY);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => ({
    size: aspectRatioCache.size,
    maxSize: MAX_CACHE_SIZE,
});

// Initialize cache on module load
loadCacheFromStorage();
