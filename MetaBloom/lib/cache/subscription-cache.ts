/**
 * Shared subscription cache for API responses
 * Used across multiple API routes to prevent redundant calls
 */

export interface CacheEntry {
  data: any;
  timestamp: number;
}

export class SubscriptionCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL: number;

  constructor(ttlMs: number = 2 * 60 * 1000) { // Default 2 minutes
    this.TTL = ttlMs;
  }

  /**
   * Get cached data for a user
   */
  get(userId: string): any | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(userId);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data for a user
   */
  set(userId: string, data: any): void {
    this.cache.set(userId, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for a specific user
   */
  delete(userId: string): boolean {
    return this.cache.delete(userId);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Shared instance for subscription responses
export const subscriptionResponseCache = new SubscriptionCache(2 * 60 * 1000); // 2 minutes
