/**
 * Main Logging System Exports
 * Provides clean interface for importing logging functionality
 *
 * NOTE: Use specific client/server imports instead of universal factory:
 * - Server: import { createServerLogger } from '@/lib/logging/server'
 * - Client: import { createClientLogger } from '@/lib/logging/client'
 */

import { validateEnvironment } from './environment';
import { SessionManager } from './session';
import { Logger } from './core';

// Core exports
export { Logger, LogFormatter } from './core';
export type {
  LogEntry,
  EventType,
  PerformanceMetrics,
  LoggerInterface
} from './core';

// Environment exports
export { 
  LoggingEnvironment, 
  getEnvironmentConfig, 
  shouldLog, 
  getLoggingStrategy, 
  validateEnvironment 
} from './environment';
export type { 
  LoggingEnvironmentConfig, 
  LogLevel 
} from './environment';

// Session management exports
export { SessionManager } from './session';
export type { 
  SessionInfo, 
  RequestInfo 
} from './session';

// Logger implementations (will be added in Phase 2 & 3)
// FileLogger is dynamically imported to avoid client-side bundling issues
export { ConsoleLogger } from './console-logger';

// Utilities
export { LoggingUtils } from './utils';

/**
 * @deprecated Use createServerLogger or createClientLogger instead
 * This universal factory violates Next.js architecture patterns
 */

/**
 * Initialize logging system
 * Call this once at application startup
 */
export function initializeLogging(): void {
  try {
    // Validate environment configuration
    const validation = validateEnvironment();
    if (!validation.valid) {
      console.warn('Logging configuration issues:', validation.errors);
    }

    // Initialize session management for browser context
    if (typeof window !== 'undefined') {
      SessionManager.initializeFromBrowser();
    }

    // Set up periodic cleanup of old sessions
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        SessionManager.cleanupOldSessions();
      }, 60 * 60 * 1000); // Clean up every hour
    }
  } catch (error) {
    console.warn('Failed to initialize logging system:', error);
  }
}

/**
 * Quick access functions for common logging patterns
 */
export const QuickLog = {
  /**
   * Log a database query
   */
  query: (component: string, query: string, params: any[], executionTime?: number) => {
    // Note: This will need to be updated to use proper client/server loggers
    console.log('QUERY_EXECUTED', {
      component,
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      params,
      executionTime
    });
  },

  /**
   * Log an error with context
   * @deprecated Use ServerQuickLog.error or ClientQuickLog.error instead
   */
  error: (component: string, error: Error, context: Record<string, any> = {}) => {
    console.error('ERROR', { component, error: error.message, context });
  },

  /**
   * Log a performance metric
   * @deprecated Use ServerQuickLog.performance or ClientQuickLog.performance instead
   */
  performance: (component: string, operation: string, duration: number, additionalData: Record<string, any> = {}) => {
    console.log('PERFORMANCE', { component, operation, duration, ...additionalData });
  },

  /**
   * Log a user interaction
   * @deprecated Use ServerQuickLog or ClientQuickLog instead
   */
  userAction: (component: string, action: string, data: Record<string, any> = {}) => {
    console.log('USER_INTERACTION', { component, action, ...data });
  },

  /**
   * Log a session event
   * @deprecated Use ServerQuickLog or ClientQuickLog instead
   */
  session: (component: string, event: 'start' | 'end' | 'update', data: Record<string, any> = {}) => {
    const eventType = event === 'start' ? 'SESSION_START' :
                     event === 'end' ? 'SESSION_END' : 'SESSION_FLOW';
    console.log(eventType, { component, ...data });
  }
};

/**
 * Performance timing helper
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private component: string;

  constructor(component: string, operation: string) {
    this.component = component;
    this.operation = operation;
    this.startTime = Date.now();

    // Log start of operation (deprecated - use server/client specific loggers)
    console.log('PERFORMANCE_START', {
      operation,
      phase: 'start',
      timestamp: this.startTime
    });
  }

  /**
   * End timing and log performance
   */
  end(additionalData: Record<string, any> = {}): number {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    console.log('PERFORMANCE_END', {
      component: this.component,
      operation: this.operation,
      duration,
      startTime: this.startTime,
      endTime,
      ...additionalData
    });
    
    return duration;
  }

  /**
   * Add a checkpoint without ending the timer
   */
  checkpoint(name: string, data: Record<string, any> = {}): number {
    const checkpointTime = Date.now();
    const elapsed = checkpointTime - this.startTime;
    
    console.log('PERFORMANCE_CHECKPOINT', {
      component: this.component,
      operation: this.operation,
      phase: 'checkpoint',
      checkpoint: name,
      elapsed,
      timestamp: checkpointTime,
      ...data
    });
    
    return elapsed;
  }
}

/**
 * Decorator for automatic performance logging
 */
export function logPerformance(component: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const timer = new PerformanceTimer(component, propertyName);
      
      try {
        const result = await method.apply(this, args);
        timer.end({ success: true });
        return result;
      } catch (error) {
        timer.end({ success: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    };

    return descriptor;
  };
}
