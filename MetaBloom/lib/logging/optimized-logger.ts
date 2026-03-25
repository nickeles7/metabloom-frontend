/**
 * Optimized Logging System for MetaBloom
 * Reduces verbose terminal output while maintaining debugging capability
 * Integrates with existing logging infrastructure
 */

import { createServerLogger } from './server';
import { LogLevel, LoggingEnvironment } from './environment';
import { SessionManager } from './session';

// Session-based caching for reducing repetitive logs
interface SessionCache {
  functionSchemas: Map<string, boolean>;
  systemPrompts: Map<string, boolean>;
  lastLoggedAt: Map<string, number>;
}

// Global session cache
const sessionCache: SessionCache = {
  functionSchemas: new Map(),
  systemPrompts: new Map(),
  lastLoggedAt: new Map()
};

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Optimized Logger for Grok AI interactions
 * Reduces verbosity while maintaining debugging capability
 */
export class OptimizedGrokLogger {
  private logger = createServerLogger('grok-optimized');
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || SessionManager.generateSessionId();
  }

  /**
   * Log Grok API payload with optimization
   * Only logs full schemas once per session at DEBUG level
   */
  logGrokPayload(payload: any, isStreaming: boolean = false) {
    const requestId = SessionManager.generateRequestId();
    
    // Always log basic request info at INFO level
    this.logger.info('GROK_API_REQUEST', {
      requestId,
      sessionId: this.sessionId,
      model: payload.model,
      messageCount: payload.messages?.length || 0,
      hasTools: !!(payload.tools && payload.tools.length > 0),
      toolCount: payload.tools?.length || 0,
      isStreaming,
      temperature: payload.temperature,
      maxTokens: payload.max_tokens
    });

    // Log function names array instead of full schemas
    if (payload.tools && payload.tools.length > 0) {
      const functionNames = payload.tools.map((tool: any) => tool.function?.name).filter(Boolean);
      
      this.logger.info('GROK_FUNCTIONS_AVAILABLE', {
        requestId,
        sessionId: this.sessionId,
        functions: functionNames,
        count: functionNames.length
      });

      // Log full schemas only once per session at DEBUG level
      const schemaKey = `${this.sessionId}_schemas`;
      if (!sessionCache.functionSchemas.has(schemaKey)) {
        this.logger.debug('GROK_FUNCTION_SCHEMAS', {
          requestId,
          sessionId: this.sessionId,
          schemas: payload.tools,
          note: 'Full schemas logged once per session'
        });
        sessionCache.functionSchemas.set(schemaKey, true);
      }
    }

    // Log system prompt only once per session at DEBUG level
    const systemMessage = payload.messages?.find((msg: any) => msg.role === 'system');
    if (systemMessage) {
      const promptKey = `${this.sessionId}_system_prompt`;
      if (!sessionCache.systemPrompts.has(promptKey)) {
        this.logger.debug('GROK_SYSTEM_PROMPT', {
          requestId,
          sessionId: this.sessionId,
          prompt: systemMessage.content,
          note: 'System prompt logged once per session'
        });
        sessionCache.systemPrompts.set(promptKey, true);
      } else {
        this.logger.info('GROK_SYSTEM_PROMPT_CACHED', {
          requestId,
          sessionId: this.sessionId,
          note: 'Using cached system prompt'
        });
      }
    }

    // Log conversation history summary instead of full content
    const userMessages = payload.messages?.filter((msg: any) => msg.role === 'user') || [];
    const assistantMessages = payload.messages?.filter((msg: any) => msg.role === 'assistant') || [];
    
    this.logger.info('GROK_CONVERSATION_SUMMARY', {
      requestId,
      sessionId: this.sessionId,
      totalMessages: payload.messages?.length || 0,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      lastUserMessage: userMessages[userMessages.length - 1]?.content?.[0]?.text?.substring(0, 100) + '...'
    });

    // Full payload only at DEBUG level
    if (LoggingEnvironment.logLevel === 'DEBUG') {
      this.logger.debug('GROK_FULL_PAYLOAD', {
        requestId,
        sessionId: this.sessionId,
        payload: JSON.stringify(payload, null, 2)
      });
    }
  }

  /**
   * Log Grok API response with optimization
   */
  logGrokResponse(response: any, executionTime?: number) {
    const requestId = SessionManager.generateRequestId();

    // Log response summary at INFO level
    this.logger.info('GROK_API_RESPONSE', {
      requestId,
      sessionId: this.sessionId,
      responseId: response.id,
      model: response.model,
      finishReason: response.choices?.[0]?.finish_reason,
      hasToolCalls: !!(response.choices?.[0]?.message?.tool_calls),
      toolCallCount: response.choices?.[0]?.message?.tool_calls?.length || 0,
      tokenUsage: response.usage,
      executionTime
    });

    // Log tool calls summary
    const toolCalls = response.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const functionNames = toolCalls.map((call: any) => call.function?.name).filter(Boolean);
      
      this.logger.info('GROK_TOOL_CALLS_EXECUTED', {
        requestId,
        sessionId: this.sessionId,
        functions: functionNames,
        count: functionNames.length
      });

      // Full tool call details only at DEBUG level
      if (LoggingEnvironment.logLevel === 'DEBUG') {
        this.logger.debug('GROK_TOOL_CALLS_DETAIL', {
          requestId,
          sessionId: this.sessionId,
          toolCalls
        });
      }
    }

    // Full response only at DEBUG level
    if (LoggingEnvironment.logLevel === 'DEBUG') {
      this.logger.debug('GROK_FULL_RESPONSE', {
        requestId,
        sessionId: this.sessionId,
        response: JSON.stringify(response, null, 2)
      });
    }
  }

  /**
   * Log token optimization with reduced verbosity
   */
  logTokenOptimization(
    originalLength: number,
    trimmedLength: number,
    validLength: number,
    chatHistoryLength: number,
    userMessage: string
  ) {
    const requestId = SessionManager.generateRequestId();
    const tokenSavings = originalLength > trimmedLength 
      ? Math.round(((originalLength - trimmedLength) / originalLength) * 100)
      : 0;

    // Optimized token log at INFO level
    this.logger.info('TOKEN_OPTIMIZATION', {
      requestId,
      sessionId: this.sessionId,
      chatHistoryLength,
      originalMessages: originalLength,
      optimizedMessages: trimmedLength,
      validMessages: validLength,
      tokenSavingsPercent: tokenSavings,
      userMessagePreview: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '')
    });

    // Detailed trace only at DEBUG level
    if (LoggingEnvironment.logLevel === 'DEBUG') {
      this.logger.debug('TOKEN_OPTIMIZATION_DETAIL', {
        requestId,
        sessionId: this.sessionId,
        fullUserMessage: userMessage,
        optimizationSteps: {
          original: originalLength,
          trimmed: trimmedLength,
          validated: validLength
        }
      });
    }
  }

  /**
   * Log function execution with summary
   */
  logFunctionExecution(functionName: string, args: any, result: any, executionTime?: number) {
    const requestId = SessionManager.generateRequestId();

    // Function execution summary at INFO level
    this.logger.info('FUNCTION_EXECUTED', {
      requestId,
      sessionId: this.sessionId,
      function: functionName,
      hasArgs: !!args,
      hasResult: !!result,
      resultType: typeof result,
      executionTime
    });

    // Full details only at DEBUG level
    if (LoggingEnvironment.logLevel === 'DEBUG') {
      this.logger.debug('FUNCTION_EXECUTION_DETAIL', {
        requestId,
        sessionId: this.sessionId,
        function: functionName,
        arguments: args,
        result: result,
        executionTime
      });
    }
  }

  /**
   * Log AST query compilation with optimization
   */
  logASTCompilation(query: any, sql: string, resultCount: number, executionTime?: number) {
    const requestId = SessionManager.generateRequestId();

    // AST summary at INFO level
    this.logger.info('AST_QUERY_EXECUTED', {
      requestId,
      sessionId: this.sessionId,
      queryType: query.type,
      resultCount,
      executionTime,
      sqlLength: sql.length
    });

    // Full AST and SQL only at DEBUG level
    if (LoggingEnvironment.logLevel === 'DEBUG') {
      this.logger.debug('AST_QUERY_DETAIL', {
        requestId,
        sessionId: this.sessionId,
        astQuery: query,
        generatedSQL: sql,
        resultCount,
        executionTime
      });
    }
  }

  /**
   * Clear expired cache entries
   */
  static clearExpiredCache() {
    const now = Date.now();
    
    // Clear function schemas cache
    for (const [key, timestamp] of sessionCache.lastLoggedAt.entries()) {
      if (now - timestamp > CACHE_TTL) {
        sessionCache.functionSchemas.delete(key);
        sessionCache.systemPrompts.delete(key);
        sessionCache.lastLoggedAt.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    return {
      functionSchemasCached: sessionCache.functionSchemas.size,
      systemPromptsCached: sessionCache.systemPrompts.size,
      totalCacheEntries: sessionCache.lastLoggedAt.size
    };
  }
}

/**
 * Factory function for creating optimized loggers
 */
export function createOptimizedGrokLogger(sessionId?: string): OptimizedGrokLogger {
  return new OptimizedGrokLogger(sessionId);
}

/**
 * Utility functions for subscription logging optimization
 */
export class OptimizedSubscriptionLogger {
  private logger = createServerLogger('subscription-optimized');

  /**
   * Log subscription status with filtered fields
   */
  logSubscriptionStatus(userId: string, subscription: any, cached: boolean = false) {
    const requestId = SessionManager.generateRequestId();

    // Essential fields only at INFO level
    this.logger.info('SUBSCRIPTION_STATUS', {
      requestId,
      userId: userId.substring(0, 8) + '...', // Partial user ID for privacy
      planType: subscription.planType,
      status: subscription.status,
      hasActiveSubscription: subscription.status === 'active',
      cached,
      tokenUsage: subscription.tokenUsage ? {
        used: subscription.tokenUsage.used,
        limit: subscription.tokenUsage.limit,
        percentage: Math.round((subscription.tokenUsage.used / subscription.tokenUsage.limit) * 100)
      } : null
    });

    // Full subscription details only at DEBUG level
    if (LoggingEnvironment.logLevel === 'DEBUG') {
      this.logger.debug('SUBSCRIPTION_DETAIL', {
        requestId,
        userId,
        fullSubscription: subscription
      });
    }
  }

  /**
   * Log Stripe sync with minimal verbosity
   */
  logStripeSync(userId: string, syncResult: any, executionTime?: number) {
    const requestId = SessionManager.generateRequestId();

    this.logger.info('STRIPE_SYNC', {
      requestId,
      userId: userId.substring(0, 8) + '...',
      success: !!syncResult,
      executionTime,
      hasChanges: syncResult?.hasChanges || false
    });

    // Full sync details only at DEBUG level
    if (LoggingEnvironment.logLevel === 'DEBUG') {
      this.logger.debug('STRIPE_SYNC_DETAIL', {
        requestId,
        userId,
        syncResult,
        executionTime
      });
    }
  }
}

/**
 * Factory function for subscription logger
 */
export function createOptimizedSubscriptionLogger(): OptimizedSubscriptionLogger {
  return new OptimizedSubscriptionLogger();
}

/**
 * Session-based Schema Cache Manager
 * Prevents repetitive logging of function schemas and system prompts
 */
export class SessionSchemaCache {
  private static instance: SessionSchemaCache;
  private cache: Map<string, {
    data: any;
    timestamp: number;
    sessionId: string;
  }> = new Map();

  private readonly TTL = 30 * 60 * 1000; // 30 minutes

  static getInstance(): SessionSchemaCache {
    if (!SessionSchemaCache.instance) {
      SessionSchemaCache.instance = new SessionSchemaCache();
    }
    return SessionSchemaCache.instance;
  }

  /**
   * Check if schema has been logged for this session
   */
  hasBeenLogged(sessionId: string, type: 'functions' | 'system_prompt'): boolean {
    const key = `${sessionId}_${type}`;
    const entry = this.cache.get(key);

    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Mark schema as logged for this session
   */
  markAsLogged(sessionId: string, type: 'functions' | 'system_prompt', data?: any): void {
    const key = `${sessionId}_${type}`;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      sessionId
    });
  }

  /**
   * Get cached schema data
   */
  getCachedData(sessionId: string, type: 'functions' | 'system_prompt'): any {
    const key = `${sessionId}_${type}`;
    const entry = this.cache.get(key);
    return entry?.data;
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache for a session
   */
  clearSession(sessionId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(sessionId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      totalEntries: this.cache.size,
      sessions: new Set([...this.cache.values()].map(entry => entry.sessionId)).size,
      oldestEntry: Math.min(...[...this.cache.values()].map(entry => entry.timestamp)),
      newestEntry: Math.max(...[...this.cache.values()].map(entry => entry.timestamp))
    };
  }
}

/**
 * Throttled Logger for high-frequency events
 * Prevents log spam from repeated operations
 */
export class ThrottledLogger {
  private lastLogged: Map<string, number> = new Map();
  private logger = createServerLogger('throttled');
  private readonly throttleMs: number;

  constructor(throttleMs: number = 5000) { // 5 second default throttle
    this.throttleMs = throttleMs;
  }

  /**
   * Log with throttling - only logs if enough time has passed
   */
  log(level: LogLevel, event: string, data: any, throttleKey?: string): boolean {
    const key = throttleKey || `${event}_${JSON.stringify(data)}`;
    const now = Date.now();
    const lastTime = this.lastLogged.get(key) || 0;

    if (now - lastTime < this.throttleMs) {
      return false; // Throttled
    }

    this.lastLogged.set(key, now);

    switch (level) {
      case 'DEBUG':
        this.logger.debug(event, data);
        break;
      case 'INFO':
        this.logger.info(event, data);
        break;
      case 'WARN':
        this.logger.warn(event, data);
        break;
      case 'ERROR':
        this.logger.error(event, data);
        break;
    }

    return true; // Logged
  }

  /**
   * Clear throttle history
   */
  clearThrottle(): void {
    this.lastLogged.clear();
  }
}

/**
 * Environment-aware console replacement
 * Automatically routes to optimized logging based on LOG_LEVEL
 */
export const OptimizedConsole = {
  log: (message: string, ...args: any[]) => {
    if (LoggingEnvironment.logLevel === 'DEBUG') {
      console.log(message, ...args);
    }
  },

  info: (message: string, ...args: any[]) => {
    if (['DEBUG', 'INFO'].includes(LoggingEnvironment.logLevel)) {
      console.log(message, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (['DEBUG', 'INFO', 'WARN'].includes(LoggingEnvironment.logLevel)) {
      console.warn(message, ...args);
    }
  },

  error: (message: string, ...args: any[]) => {
    console.error(message, ...args); // Always log errors
  }
};
