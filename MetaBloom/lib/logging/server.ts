/**
 * Server-Side Logging Factory
 * For use in API routes and server components only
 */

import { Logger } from './core';
import { ConsoleLogger } from './console-logger';
import { getLoggingStrategy } from './environment';

// Dynamic import for FileLogger to avoid client-side bundling
let FileLogger: any;
if (typeof window === 'undefined') {
  try {
    FileLogger = require('./file-logger').FileLogger;
  } catch (error) {
    // Fallback if file logger is not available
    FileLogger = null;
  }
}

/**
 * Create a server-side logger
 * Uses both file logging (development) and console logging
 */
export function createServerLogger(component: string): Logger {
  const logger = new Logger(component);
  const strategy = getLoggingStrategy();

  // Add file logger in development (if available)
  if ((strategy === 'file' || strategy === 'both') && FileLogger) {
    logger.addLogger(new FileLogger());
  }

  // Always add console logger
  logger.addLogger(new ConsoleLogger());

  return logger;
}

/**
 * Quick server-side logging utilities
 */
export const ServerQuickLog = {
  /**
   * Log database query
   */
  query: (component: string, query: string, params: any[], executionTime?: number, resultCount?: number) => {
    const logger = createServerLogger(component);
    logger.info('QUERY_EXECUTED', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      params,
      executionTime,
      resultCount,
      success: true
    });
  },

  /**
   * Log API request
   */
  apiRequest: (component: string, method: string, path: string, statusCode: number, duration: number) => {
    const logger = createServerLogger(component);
    logger.info('API_REQUEST', {
      method,
      path,
      statusCode,
      duration,
      success: statusCode < 400
    });
  },

  /**
   * Log server error
   */
  error: (component: string, error: Error, context: Record<string, any> = {}) => {
    const logger = createServerLogger(component);
    logger.error('SERVER_ERROR', error, context);
  },

  /**
   * Log performance metric
   */
  performance: (component: string, operation: string, duration: number, data: Record<string, any> = {}) => {
    const logger = createServerLogger(component);
    const now = Date.now();
    logger.performance('SERVER_PERFORMANCE', {
      operation,
      duration,
      startTime: now - duration,
      endTime: now,
      ...data
    });
  }
};
