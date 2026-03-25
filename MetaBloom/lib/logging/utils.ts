/**
 * Logging Utilities
 * Helper functions for logging system
 */

import { LogLevel, LoggingEnvironment } from './environment';
import { EventType } from './core';

/**
 * Logging utilities class
 */
export class LoggingUtils {
  /**
   * Generate a timestamp string
   */
  static getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Generate a date string for file organization
   */
  static getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Generate a time prefix for file naming
   */
  static getTimePrefix(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
  }

  /**
   * Get log category from event type
   */
  static getCategoryFromEvent(event: EventType): string {
    const categoryMap: Record<string, string> = {
      'SESSION_START': 'sessions',
      'SESSION_END': 'sessions',
      'SESSION_FLOW': 'sessions',
      'REQUEST_START': 'requests',
      'REQUEST_PARSED': 'requests',
      'RESPONSE_SENT': 'requests',
      'REQUEST_FAILED': 'errors',
      'QUERY_START': 'queries',
      'QUERY_EXECUTED': 'queries',
      'QUERY_FAILED': 'errors',
      'FUNCTION_CALLED': 'functions',
      'FUNCTION_COMPLETED': 'functions',
      'FUNCTION_FAILED': 'errors',
      'ERROR': 'errors',
      'PERFORMANCE': 'performance',
      'AUTH_SUCCESS': 'auth',
      'AUTH_FAILED': 'errors',
      'USER_INTERACTION': 'interactions',
      'DECK_CODE_GENERATED': 'deck-codes',
      'DECK_CODE_FAILED': 'errors'
    };

    return categoryMap[event] || 'general';
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  static sanitizeData(data: Record<string, any>): Record<string, any> {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'credential',
      'apikey',
      'api_key'
    ];

    const sanitized: Record<string, any> = {};

    Object.entries(data).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Truncate long strings for logging
   */
  static truncateString(str: string, maxLength: number = 1000): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength) + '... [TRUNCATED]';
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Check if log level should be included
   */
  static shouldLogLevel(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      'DEBUG': 0,
      'INFO': 1,
      'WARN': 2,
      'ERROR': 3
    };

    return levels[level] >= levels[LoggingEnvironment.logLevel];
  }

  /**
   * Extract error information safely
   */
  static extractErrorInfo(error: any): { message: string; stack?: string; code?: string } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    if (typeof error === 'object' && error !== null) {
      return {
        message: error.message || String(error),
        stack: error.stack,
        code: error.code
      };
    }

    return { message: String(error) };
  }

  /**
   * Get memory usage information
   */
  static getMemoryUsage(): Record<string, number> | undefined {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external
      };
    }
    return undefined;
  }

  /**
   * Create a safe JSON string (handles circular references)
   */
  static safeStringify(obj: any, maxDepth: number = 3): string {
    const seen = new WeakSet();
    
    const replacer = (key: string, value: any, depth: number = 0): any => {
      if (depth > maxDepth) {
        return '[MAX_DEPTH_REACHED]';
      }

      if (value === null || typeof value !== 'object') {
        return value;
      }

      if (seen.has(value)) {
        return '[CIRCULAR_REFERENCE]';
      }

      seen.add(value);

      if (Array.isArray(value)) {
        return value.map((item, index) => replacer(`${index}`, item, depth + 1));
      }

      const result: any = {};
      Object.keys(value).forEach(k => {
        result[k] = replacer(k, value[k], depth + 1);
      });

      return result;
    };

    try {
      return JSON.stringify(replacer('', obj));
    } catch (error) {
      return `[JSON_STRINGIFY_ERROR: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }

  /**
   * Generate a unique identifier
   */
  static generateId(prefix: string = 'id'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Validate log entry structure
   */
  static validateLogEntry(entry: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!entry.timestamp) {
      errors.push('Missing timestamp');
    }

    if (!entry.level) {
      errors.push('Missing level');
    }

    if (!entry.event) {
      errors.push('Missing event');
    }

    if (!entry.component) {
      errors.push('Missing component');
    }

    if (typeof entry.data !== 'object') {
      errors.push('Data must be an object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate log retention cutoff date
   */
  static getRetentionCutoff(retentionDays: number): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    return cutoff;
  }

  /**
   * Parse log file name to extract metadata
   */
  static parseLogFileName(fileName: string): {
    category?: string;
    date?: string;
    time?: string;
    extension?: string;
  } {
    const parts = fileName.split('.');
    const extension = parts.pop();
    const nameWithoutExt = parts.join('.');
    
    const segments = nameWithoutExt.split('-');
    
    if (segments.length >= 4) {
      return {
        category: segments[0],
        date: `${segments[1]}-${segments[2]}-${segments[3]}`,
        time: segments.slice(4).join('-'),
        extension
      };
    }

    return { extension };
  }
}
