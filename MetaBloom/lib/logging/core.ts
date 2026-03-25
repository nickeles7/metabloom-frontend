/**
 * Core Logging Infrastructure
 * Defines interfaces, types, and base classes for the logging system
 */

import { LogLevel } from './environment';

/**
 * Event types for structured logging
 */
export type EventType =
  | 'SESSION_START'
  | 'SESSION_END'
  | 'REQUEST_START'
  | 'REQUEST_PARSED'
  | 'RESPONSE_SENT'
  | 'REQUEST_FAILED'
  | 'QUERY_START'
  | 'QUERY_EXECUTED'
  | 'QUERY_FAILED'
  | 'FUNCTION_CALLED'
  | 'FUNCTION_COMPLETED'
  | 'FUNCTION_FAILED'
  | 'ERROR'
  | 'PERFORMANCE'
  | 'SESSION_FLOW'
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILED'
  | 'USER_INTERACTION'
  | 'DECK_CODE_GENERATED'
  | 'DECK_CODE_FAILED'
  | 'CLIENT_ERROR'
  | 'CLIENT_PERFORMANCE'
  | 'SERVER_ERROR'
  | 'SERVER_PERFORMANCE'
  | 'API_REQUEST'
  | string; // Allow any string for flexibility

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: EventType;
  sessionId?: string;
  userId?: string;
  component: string;
  requestId?: string;
  data: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Performance metrics structure
 */
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  startTime: number;
  endTime: number;
  memoryUsage?: number;
  additionalMetrics?: Record<string, any>;
}

/**
 * Logger interface that all logger implementations must follow
 */
export interface LoggerInterface {
  writeLog(entry: LogEntry): Promise<void> | void;
}

/**
 * Base Logger class
 */
export class Logger {
  private component: string;
  private loggers: LoggerInterface[] = [];

  constructor(component: string) {
    this.component = component;
  }

  /**
   * Add a logger implementation
   */
  addLogger(logger: LoggerInterface): void {
    this.loggers.push(logger);
  }

  /**
   * Log an info event
   */
  info(event: EventType, data: Record<string, any> = {}): void {
    this.log('INFO', event, data);
  }

  /**
   * Log a warning event
   */
  warn(event: EventType, data: Record<string, any> = {}): void {
    this.log('WARN', event, data);
  }

  /**
   * Log an error event
   */
  error(event: EventType, error: Error | string, data: Record<string, any> = {}): void {
    const errorData = typeof error === 'string' 
      ? { message: error }
      : {
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        };

    this.log('ERROR', event, data, errorData);
  }

  /**
   * Log a debug event
   */
  debug(event: EventType, data: Record<string, any> = {}): void {
    this.log('DEBUG', event, data);
  }

  /**
   * Log performance metrics
   */
  performance(event: EventType, metrics: PerformanceMetrics): void {
    this.log('INFO', event, {
      operation: metrics.operation,
      duration: metrics.duration,
      startTime: metrics.startTime,
      endTime: metrics.endTime,
      memoryUsage: metrics.memoryUsage,
      ...metrics.additionalMetrics
    });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, event: EventType, data: Record<string, any>, error?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      sessionId: this.getCurrentSessionId(),
      userId: this.getCurrentUserId(),
      component: this.component,
      requestId: this.getCurrentRequestId(),
      data,
      error
    };

    // Write to all configured loggers
    this.loggers.forEach(logger => {
      try {
        logger.writeLog(entry);
      } catch (logError) {
        // Fallback to console if logger fails
        console.error('Logger failed:', logError);
        console.log('Original log entry:', entry);
      }
    });
  }

  /**
   * Get current session ID from context
   */
  private getCurrentSessionId(): string | undefined {
    // This will be implemented with session management
    return (globalThis as any).__LOGGING_SESSION_ID;
  }

  /**
   * Get current user ID from context
   */
  private getCurrentUserId(): string | undefined {
    // This will be implemented with session management
    return (globalThis as any).__LOGGING_USER_ID;
  }

  /**
   * Get current request ID from context
   */
  private getCurrentRequestId(): string | undefined {
    // This will be implemented with request tracking
    return (globalThis as any).__LOGGING_REQUEST_ID;
  }
}

/**
 * Utility functions for log entry formatting
 */
export class LogFormatter {
  /**
   * Format log entry for human-readable file output
   */
  static formatForFile(entry: LogEntry): string {
    const lines: string[] = [];
    
    // Header line
    lines.push(`[${entry.timestamp}] ${entry.level} ${entry.event}`);
    
    // Session and user info
    if (entry.sessionId) {
      lines.push(`Session: ${entry.sessionId}`);
    }
    if (entry.userId) {
      lines.push(`User: ${entry.userId}`);
    }
    
    // Component and request info
    lines.push(`Component: ${entry.component}`);
    if (entry.requestId) {
      lines.push(`Request: ${entry.requestId}`);
    }
    
    // Data section
    if (Object.keys(entry.data).length > 0) {
      lines.push('Data:');
      Object.entries(entry.data).forEach(([key, value]) => {
        lines.push(`  ${key}: ${this.formatValue(value)}`);
      });
    }
    
    // Error section
    if (entry.error) {
      lines.push('Error:');
      lines.push(`  message: ${entry.error.message}`);
      if (entry.error.code) {
        lines.push(`  code: ${entry.error.code}`);
      }
      if (entry.error.stack) {
        lines.push(`  stack: ${entry.error.stack}`);
      }
    }
    
    lines.push('---END---');
    lines.push(''); // Empty line for readability
    
    return lines.join('\n');
  }

  /**
   * Format log entry for structured console output (Vercel)
   */
  static formatForConsole(entry: LogEntry): string {
    const structuredLog: any = {
      '@timestamp': entry.timestamp,
      level: entry.level,
      event: entry.event,
      session_id: entry.sessionId,
      user_id: entry.userId,
      component: entry.component,
      request_id: entry.requestId,
      ...entry.data
    };

    if (entry.error) {
      structuredLog.error = entry.error;
    }

    return JSON.stringify(structuredLog);
  }

  /**
   * Format a value for display
   */
  private static formatValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value === null || value === undefined) {
      return String(value);
    }
    
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
