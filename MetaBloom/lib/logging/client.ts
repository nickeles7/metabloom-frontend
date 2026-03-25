/**
 * Client-Side Logging Factory
 * For use in browser/client components only
 */

import { Logger } from './core';
import { ConsoleLogger } from './console-logger';

/**
 * Create a client-side logger (browser only)
 * Uses console logging optimized for browser development
 */
export function createClientLogger(component: string): Logger {
  const logger = new Logger(component);
  logger.addLogger(new ConsoleLogger());
  return logger;
}

/**
 * Quick client-side logging utilities
 */
export const ClientQuickLog = {
  /**
   * Log user interaction
   */
  userAction: (component: string, action: string, data: Record<string, any> = {}) => {
    const logger = createClientLogger(component);
    logger.info('USER_INTERACTION', {
      action,
      ...data
    });
  },

  /**
   * Log client-side error
   */
  error: (component: string, error: Error, context: Record<string, any> = {}) => {
    const logger = createClientLogger(component);
    logger.error('CLIENT_ERROR', error, context);
  },

  /**
   * Log performance metric
   */
  performance: (component: string, operation: string, duration: number, data: Record<string, any> = {}) => {
    const logger = createClientLogger(component);
    const now = Date.now();
    logger.performance('CLIENT_PERFORMANCE', {
      operation,
      duration,
      startTime: now - duration,
      endTime: now,
      ...data
    });
  }
};
