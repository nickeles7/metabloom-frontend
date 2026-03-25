/**
 * Session-Based Caching System
 * Provides session-scoped caching for system prompts and other session-specific artifacts
 */

// Simple fallback logger to avoid any server-only imports
const createSafeLogger = (component: string) => ({
  info: (event: string, data?: any) => {
    console.log(`[${component}] ${event}`, data);
  },
  debug: (event: string, data?: any) => {
    console.log(`[${component}] ${event}`, data);
  },
  warn: (event: string, data?: any) => {
    console.warn(`[${component}] ${event}`, data);
  },
  error: (event: string, error?: any, data?: any) => {
    console.error(`[${component}] ${event}`, error, data);
  }
});

/**
 * Session cache structure - designed for future expansion
 */
export interface SessionCache {
  // Core caching
  systemPrompt?: string;
  systemPromptCreatedAt?: number;
  
  // Future expansion slots (commented for clarity)
  // toolDefinitions?: ToolDefinition[];
  // reasoningMetadata?: Record<string, any>;
  // userPreferences?: UserPreferences;
  // conversationContext?: ConversationContext;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  defaultTTL: number;           // Default TTL in milliseconds
  maxCacheSize: number;         // Maximum number of sessions to cache
  cleanupInterval: number;      // Cleanup interval in milliseconds
}

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 2 * 60 * 60 * 1000,      // 2 hours
  maxCacheSize: 1000,                   // 1000 sessions max
  cleanupInterval: 30 * 60 * 1000       // Cleanup every 30 minutes
};

/**
 * Session Cache Manager
 */
export class SessionCacheManager {
  private static instance: SessionCacheManager | null = null;
  private cache = new Map<string, SessionCache>();
  private config: CacheConfig;
  private logger: any;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createSafeLogger('session-cache');
    this.startCleanupTimer();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<CacheConfig>): SessionCacheManager {
    if (!SessionCacheManager.instance) {
      SessionCacheManager.instance = new SessionCacheManager(config);
    }
    return SessionCacheManager.instance;
  }

  /**
   * Get or create session cache
   */
  private getSessionCache(sessionId: string): SessionCache {
    let sessionCache = this.cache.get(sessionId);
    
    if (!sessionCache) {
      sessionCache = {};
      this.cache.set(sessionId, sessionCache);
      
      this.logger.info('SESSION_CACHE_CREATED', {
        sessionId,
        cacheSize: this.cache.size
      });
    }
    
    return sessionCache;
  }

  /**
   * Cache system prompt for session
   */
  setSystemPrompt(sessionId: string, systemPrompt: string): void {
    const sessionCache = this.getSessionCache(sessionId);
    
    sessionCache.systemPrompt = systemPrompt;
    sessionCache.systemPromptCreatedAt = Date.now();
    
    this.logger.info('SYSTEM_PROMPT_CACHED', {
      sessionId,
      promptLength: systemPrompt.length,
      cacheSize: this.cache.size
    });
  }

  /**
   * Get cached system prompt for session
   */
  getSystemPrompt(sessionId: string): string | null {
    const sessionCache = this.cache.get(sessionId);

    if (!sessionCache?.systemPrompt) {
      this.logger.debug('SYSTEM_PROMPT_CACHE_MISS', { sessionId });
      return null;
    }

    // Check TTL
    const age = Date.now() - (sessionCache.systemPromptCreatedAt || 0);
    if (age > this.config.defaultTTL) {
      this.logger.info('SYSTEM_PROMPT_EXPIRED', {
        sessionId,
        ageMs: age,
        ttlMs: this.config.defaultTTL
      });

      // Clear expired prompt
      delete sessionCache.systemPrompt;
      delete sessionCache.systemPromptCreatedAt;
      return null;
    }

    this.logger.debug('SYSTEM_PROMPT_CACHE_HIT', {
      sessionId,
      promptLength: sessionCache.systemPrompt.length,
      ageMs: age
    });

    return sessionCache.systemPrompt;
  }

  /**
   * Check if system prompt exists in cache
   */
  hasSystemPrompt(sessionId: string): boolean {
    return this.getSystemPrompt(sessionId) !== null;
  }

  /**
   * Clear session cache
   */
  clearSession(sessionId: string): void {
    const existed = this.cache.delete(sessionId);
    
    if (existed) {
      this.logger.info('SESSION_CACHE_CLEARED', {
        sessionId,
        remainingCacheSize: this.cache.size
      });
    }
  }

  /**
   * Clear all caches (for testing/debugging)
   */
  clearAll(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    
    this.logger.info('ALL_CACHES_CLEARED', {
      previousSize,
      currentSize: 0
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalSessions: number;
    sessionsWithSystemPrompt: number;
    oldestCacheAge: number;
    newestCacheAge: number;
    averagePromptLength: number;
  } {
    const now = Date.now();
    let sessionsWithSystemPrompt = 0;
    let oldestAge = 0;
    let newestAge = Infinity;
    let totalPromptLength = 0;

    this.cache.forEach((sessionCache) => {
      if (sessionCache.systemPrompt && sessionCache.systemPromptCreatedAt) {
        sessionsWithSystemPrompt++;
        const age = now - sessionCache.systemPromptCreatedAt;
        oldestAge = Math.max(oldestAge, age);
        newestAge = Math.min(newestAge, age);
        totalPromptLength += sessionCache.systemPrompt.length;
      }
    });

    return {
      totalSessions: this.cache.size,
      sessionsWithSystemPrompt,
      oldestCacheAge: oldestAge,
      newestCacheAge: newestAge === Infinity ? 0 : newestAge,
      averagePromptLength: sessionsWithSystemPrompt > 0 ? Math.round(totalPromptLength / sessionsWithSystemPrompt) : 0
    };
  }

  /**
   * Cleanup expired entries and enforce size limits
   */
  private cleanup(): void {
    const now = Date.now();
    const sessionsToDelete: string[] = [];

    // Find expired sessions
    this.cache.forEach((sessionCache, sessionId) => {
      if (sessionCache.systemPromptCreatedAt) {
        const age = now - sessionCache.systemPromptCreatedAt;
        if (age > this.config.defaultTTL) {
          sessionsToDelete.push(sessionId);
        }
      }
    });

    // Delete expired sessions
    sessionsToDelete.forEach(sessionId => {
      this.cache.delete(sessionId);
    });

    // Enforce size limit (LRU-style: remove oldest)
    if (this.cache.size > this.config.maxCacheSize) {
      const sortedSessions = Array.from(this.cache.entries())
        .filter(([_, cache]) => cache.systemPromptCreatedAt)
        .sort(([_, a], [__, b]) => (a.systemPromptCreatedAt || 0) - (b.systemPromptCreatedAt || 0));

      const excessCount = this.cache.size - this.config.maxCacheSize;
      for (let i = 0; i < excessCount && i < sortedSessions.length; i++) {
        this.cache.delete(sortedSessions[i][0]);
      }
    }

    if (sessionsToDelete.length > 0 || this.cache.size > this.config.maxCacheSize) {
      this.logger.info('CACHE_CLEANUP_COMPLETED', {
        expiredSessions: sessionsToDelete.length,
        currentCacheSize: this.cache.size,
        maxCacheSize: this.config.maxCacheSize
      });
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    this.logger.info('CACHE_CLEANUP_TIMER_STARTED', {
      intervalMs: this.config.cleanupInterval
    });
  }

  /**
   * Stop cleanup timer (for testing/shutdown)
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.logger.info('CACHE_CLEANUP_TIMER_STOPPED');
    }
  }

  /**
   * Shutdown cache manager
   */
  shutdown(): void {
    this.stopCleanupTimer();
    this.clearAll();
    SessionCacheManager.instance = null;
  }
}

/**
 * Convenience functions for easy access
 */

/**
 * Get or create cached system prompt for session
 */
export function getOrCreateSystemPrompt(
  sessionId: string, 
  systemPromptFactory: () => string
): string {
  const cacheManager = SessionCacheManager.getInstance();
  
  // Try to get from cache first
  let systemPrompt = cacheManager.getSystemPrompt(sessionId);
  
  if (!systemPrompt) {
    // Generate new system prompt
    systemPrompt = systemPromptFactory();
    
    // Cache it for future use
    cacheManager.setSystemPrompt(sessionId, systemPrompt);
  }
  
  return systemPrompt;
}

/**
 * Clear session cache (useful for session end events)
 */
export function clearSessionCache(sessionId: string): void {
  const cacheManager = SessionCacheManager.getInstance();
  cacheManager.clearSession(sessionId);
}

/**
 * Get cache statistics (for monitoring/debugging)
 */
export function getCacheStats() {
  const cacheManager = SessionCacheManager.getInstance();
  return cacheManager.getStats();
}
