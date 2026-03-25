/**
 * Client-Safe Optimized Logging System for MetaBloom
 * Provides optimized logging that can be safely imported in client-side code
 * Uses only client-safe logging methods to avoid server-only import issues
 */

import { LogLevel, LoggingEnvironment } from './environment';
import { SessionManager } from './session';

// Client-safe logger that doesn't import server-only modules
const createClientSafeLogger = (component: string) => ({
  info: (event: string, data?: any) => {
    if (['DEBUG', 'INFO'].includes(LoggingEnvironment.logLevel)) {
      console.log(`[${component}] ${event}`, data);
    }
  },
  debug: (event: string, data?: any) => {
    if (LoggingEnvironment.logLevel === 'DEBUG') {
      console.log(`[${component}] ${event}`, data);
    }
  },
  warn: (event: string, data?: any) => {
    if (['DEBUG', 'INFO', 'WARN'].includes(LoggingEnvironment.logLevel)) {
      console.warn(`[${component}] ${event}`, data);
    }
  },
  error: (event: string, error?: any, data?: any) => {
    console.error(`[${component}] ${event}`, error, data);
  },
  performance: (event: string, data?: any) => {
    if (['DEBUG', 'INFO'].includes(LoggingEnvironment.logLevel)) {
      console.log(`[${component}] ${event}`, data);
    }
  }
});

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
 * Client-Safe Optimized Logger for Grok AI interactions
 * Can be safely imported in client-side code without server-only issues
 */
export class ClientSafeOptimizedGrokLogger {
  private logger = createClientSafeLogger('grok-optimized');
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

    // Function schemas - only log once per session at DEBUG level
    if (payload.tools && payload.tools.length > 0) {
      const cacheKey = `${this.sessionId}_function_schemas`;
      
      if (!sessionCache.functionSchemas.has(cacheKey)) {
        // First time logging schemas for this session
        if (LoggingEnvironment.logLevel === 'DEBUG') {
          this.logger.debug('GROK_FUNCTION_SCHEMAS', {
            requestId,
            sessionId: this.sessionId,
            schemas: payload.tools
          });
        }
        
        sessionCache.functionSchemas.set(cacheKey, true);
        sessionCache.lastLoggedAt.set(cacheKey, Date.now());
      } else {
        // Subsequent requests - just log function names
        this.logger.info('GROK_FUNCTIONS_AVAILABLE', {
          requestId,
          sessionId: this.sessionId,
          functions: payload.tools.map((tool: any) => tool.function?.name || 'unknown')
        });
      }
    }

    // System prompt - only log once per session at DEBUG level
    const systemMessage = payload.messages?.find((msg: any) => msg.role === 'system');
    if (systemMessage) {
      // Convert content to string if it's not already
      const contentStr = typeof systemMessage.content === 'string'
        ? systemMessage.content
        : JSON.stringify(systemMessage.content);

      const promptHash = this.hashString(contentStr);
      const cacheKey = `${this.sessionId}_system_prompt_${promptHash}`;

      if (!sessionCache.systemPrompts.has(cacheKey)) {
        if (LoggingEnvironment.logLevel === 'DEBUG') {
          this.logger.debug('GROK_SYSTEM_PROMPT', {
            requestId,
            sessionId: this.sessionId,
            promptLength: contentStr.length,
            promptPreview: contentStr.substring(0, 100) + '...'
          });
        }

        sessionCache.systemPrompts.set(cacheKey, true);
        sessionCache.lastLoggedAt.set(cacheKey, Date.now());
      }
    }
  }

  /**
   * Log Grok API response with optimization
   */
  logGrokResponse(result: any, executionTime?: number) {
    const requestId = SessionManager.generateRequestId();

    // Response summary at INFO level
    this.logger.info('GROK_API_RESPONSE', {
      requestId,
      sessionId: this.sessionId,
      hasChoices: !!(result.choices && result.choices.length > 0),
      choiceCount: result.choices?.length || 0,
      finishReason: result.choices?.[0]?.finish_reason,
      executionTime,
      usage: result.usage
    });

    // Full response only at DEBUG level
    if (LoggingEnvironment.logLevel === 'DEBUG') {
      this.logger.debug('GROK_API_RESPONSE_DETAIL', {
        requestId,
        sessionId: this.sessionId,
        response: result,
        executionTime
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
   * Simple string hash for caching
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
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
}

/**
 * Environment-aware console replacement for client-side use
 * Automatically routes to optimized logging based on LOG_LEVEL
 */
export const ClientSafeOptimizedConsole = {
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

/**
 * Factory function for creating client-safe optimized loggers
 */
export function createClientSafeOptimizedGrokLogger(sessionId?: string): ClientSafeOptimizedGrokLogger {
  return new ClientSafeOptimizedGrokLogger(sessionId);
}
