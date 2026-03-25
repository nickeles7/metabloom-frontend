/**
 * Console Logger Implementation
 * Handles structured console logging for production (Vercel) environment
 */

import { LoggerInterface, LogEntry, LogFormatter } from './core';
import { LoggingEnvironment, shouldLog } from './environment';
import { LoggingUtils } from './utils';

/**
 * Console Logger class for production environment
 */
export class ConsoleLogger implements LoggerInterface {
  private buffer: LogEntry[] = [];
  private bufferSize: number = 100;
  private flushInterval: number = 5000; // 5 seconds
  private lastFlush: number = Date.now();
  private isProduction: boolean;

  constructor() {
    this.isProduction = LoggingEnvironment.isProduction;
    
    // Configure buffering for production
    if (this.isProduction) {
      this.setupBuffering();
    }
  }

  /**
   * Write log entry to console
   */
  writeLog(entry: LogEntry): void {
    // Check if this log level should be included
    if (!shouldLog(entry.level)) {
      return;
    }

    try {
      if (this.isProduction) {
        this.writeProductionLog(entry);
      } else {
        this.writeDevelopmentLog(entry);
      }
    } catch (error) {
      // Fallback to basic console.log if structured logging fails
      console.log(`[LOGGING_ERROR] ${error}`);
      console.log(`[ORIGINAL_LOG] ${entry.event} - ${entry.component}`);
    }
  }

  /**
   * Write structured log for production (Vercel)
   */
  private writeProductionLog(entry: LogEntry): void {
    // Add to buffer for batch processing
    this.buffer.push(entry);
    
    // Flush if buffer is full or enough time has passed
    if (this.buffer.length >= this.bufferSize || 
        Date.now() - this.lastFlush >= this.flushInterval) {
      this.flushBuffer();
    }
    
    // Always immediately log errors and critical events
    if (entry.level === 'ERROR' || this.isCriticalEvent(entry.event)) {
      this.writeStructuredLog(entry);
    }
  }

  /**
   * Write enhanced log for development
   */
  private writeDevelopmentLog(entry: LogEntry): void {
    // In development, provide both structured and human-readable output
    const structuredLog = LogFormatter.formatForConsole(entry);
    const humanReadable = this.formatForDevelopment(entry);
    
    // Use appropriate console method based on log level
    switch (entry.level) {
      case 'ERROR':
        console.error(humanReadable);
        break;
      case 'WARN':
        console.warn(humanReadable);
        break;
      case 'DEBUG':
        console.debug(humanReadable);
        break;
      default:
        console.log(humanReadable);
    }
    
    // Also output structured version for consistency
    if (LoggingEnvironment.logLevel === 'DEBUG') {
      console.log('📋 Structured:', structuredLog);
    }
  }

  /**
   * Format log entry for development console
   */
  private formatForDevelopment(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const emoji = this.getEmojiForEvent(entry.event);
    const level = entry.level.padEnd(5);
    
    let message = `[${timestamp}] ${level} ${emoji} ${entry.event}`;
    
    if (entry.component) {
      message += ` (${entry.component})`;
    }
    
    if (entry.sessionId) {
      message += ` [Session: ${entry.sessionId.substring(-8)}]`;
    }
    
    if (entry.requestId) {
      message += ` [Request: ${entry.requestId.substring(-6)}]`;
    }
    
    // Add key data points
    const keyData = this.extractKeyData(entry);
    if (keyData.length > 0) {
      message += ` - ${keyData.join(', ')}`;
    }
    
    // Add error information
    if (entry.error) {
      message += `\n  ❌ Error: ${entry.error.message}`;
      if (entry.error.code) {
        message += ` (${entry.error.code})`;
      }
    }
    
    return message;
  }

  /**
   * Get emoji for event type
   */
  private getEmojiForEvent(event: string): string {
    const emojiMap: Record<string, string> = {
      'SESSION_START': '🚀',
      'SESSION_END': '🏁',
      'REQUEST_START': '📥',
      'RESPONSE_SENT': '📤',
      'QUERY_EXECUTED': '🔍',
      'QUERY_FAILED': '❌',
      'FUNCTION_CALLED': '⚡',
      'ERROR': '🚨',
      'PERFORMANCE': '⏱️',
      'AUTH_SUCCESS': '🔐',
      'AUTH_FAILED': '🔒',
      'USER_INTERACTION': '👤',
      'DECK_CODE_GENERATED': '🃏',
      'DECK_CODE_FAILED': '💥'
    };
    
    return emojiMap[event] || '📝';
  }

  /**
   * Extract key data points for display
   */
  private extractKeyData(entry: LogEntry): string[] {
    const keyData: string[] = [];
    
    if (entry.data.executionTime) {
      keyData.push(`${entry.data.executionTime}ms`);
    }
    
    if (entry.data.resultCount !== undefined) {
      keyData.push(`${entry.data.resultCount} results`);
    }
    
    if (entry.data.query) {
      const query = LoggingUtils.truncateString(entry.data.query, 50);
      keyData.push(`Query: ${query}`);
    }
    
    if (entry.data.operation) {
      keyData.push(`Op: ${entry.data.operation}`);
    }
    
    if (entry.data.duration) {
      keyData.push(`${entry.data.duration}ms`);
    }
    
    if (entry.data.success !== undefined) {
      keyData.push(entry.data.success ? '✅' : '❌');
    }
    
    return keyData;
  }

  /**
   * Write structured log entry
   */
  private writeStructuredLog(entry: LogEntry): void {
    const structuredLog: any = {
      '@timestamp': entry.timestamp,
      level: entry.level,
      event: entry.event,
      session_id: entry.sessionId,
      user_id: entry.userId,
      component: entry.component,
      request_id: entry.requestId,
      ...LoggingUtils.sanitizeData(entry.data)
    };

    if (entry.error) {
      structuredLog.error = entry.error;
    }

    // Add memory usage in production for performance monitoring
    if (this.isProduction) {
      const memoryUsage = LoggingUtils.getMemoryUsage();
      if (memoryUsage) {
        structuredLog.memory_usage = memoryUsage;
      }
    }

    console.log(JSON.stringify(structuredLog));
  }

  /**
   * Check if event is critical and should be logged immediately
   */
  private isCriticalEvent(event: string): boolean {
    const criticalEvents = [
      'SESSION_START',
      'SESSION_END',
      'REQUEST_FAILED',
      'QUERY_FAILED',
      'FUNCTION_FAILED',
      'AUTH_FAILED',
      'DECK_CODE_FAILED'
    ];
    
    return criticalEvents.includes(event);
  }

  /**
   * Setup buffering for production environment
   */
  private setupBuffering(): void {
    // Flush buffer periodically
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        if (this.buffer.length > 0) {
          this.flushBuffer();
        }
      }, this.flushInterval);
    }
    
    // Flush buffer on process exit
    if (typeof process !== 'undefined') {
      process.on('exit', () => {
        this.flushBuffer();
      });
      
      process.on('SIGINT', () => {
        this.flushBuffer();
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        this.flushBuffer();
        process.exit(0);
      });
    }
  }

  /**
   * Flush buffered log entries
   */
  private flushBuffer(): void {
    if (this.buffer.length === 0) {
      return;
    }
    
    try {
      // Group entries by level for efficient output
      const grouped = this.groupByLevel(this.buffer);
      
      Object.entries(grouped).forEach(([level, entries]) => {
        if (entries.length === 1) {
          // Single entry - output normally
          this.writeStructuredLog(entries[0]);
        } else {
          // Multiple entries - output as batch
          this.writeBatchLog(level, entries);
        }
      });
      
      this.buffer = [];
      this.lastFlush = Date.now();
      
    } catch (error) {
      console.error('Failed to flush log buffer:', error);
      // Clear buffer to prevent memory leak
      this.buffer = [];
    }
  }

  /**
   * Group log entries by level
   */
  private groupByLevel(entries: LogEntry[]): Record<string, LogEntry[]> {
    return entries.reduce((groups, entry) => {
      if (!groups[entry.level]) {
        groups[entry.level] = [];
      }
      groups[entry.level].push(entry);
      return groups;
    }, {} as Record<string, LogEntry[]>);
  }

  /**
   * Write batch of log entries
   */
  private writeBatchLog(level: string, entries: LogEntry[]): void {
    const batchLog = {
      '@timestamp': new Date().toISOString(),
      level: level,
      event: 'BATCH_LOG',
      batch_size: entries.length,
      entries: entries.map(entry => ({
        timestamp: entry.timestamp,
        event: entry.event,
        component: entry.component,
        session_id: entry.sessionId,
        request_id: entry.requestId,
        data: LoggingUtils.sanitizeData(entry.data),
        error: entry.error
      }))
    };
    
    console.log(JSON.stringify(batchLog));
  }

  /**
   * Force flush any buffered logs
   */
  flush(): void {
    this.flushBuffer();
  }

  /**
   * Get buffer statistics
   */
  getBufferStats(): {
    bufferSize: number;
    currentEntries: number;
    lastFlush: number;
    timeSinceLastFlush: number;
  } {
    return {
      bufferSize: this.bufferSize,
      currentEntries: this.buffer.length,
      lastFlush: this.lastFlush,
      timeSinceLastFlush: Date.now() - this.lastFlush
    };
  }
}
