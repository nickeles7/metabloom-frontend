/**
 * File Logger Implementation
 * Handles file-based logging for development environment (server-side only)
 */

import 'server-only';

import { LoggerInterface, LogEntry, LogFormatter } from './core';
import { LoggingEnvironment } from './environment';
import { LoggingUtils } from './utils';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File Logger class for development environment (server-side only)
 */
export class FileLogger implements LoggerInterface {
  private logDir: string;
  private initialized: boolean = false;
  private writeQueue: Array<{ entry: LogEntry; filePath: string; content: string }> = [];
  private isProcessingQueue: boolean = false;

  constructor() {
    this.logDir = path.join(process.cwd(), LoggingEnvironment.logDirectory);
  }

  /**
   * Write log entry to appropriate file
   */
  async writeLog(entry: LogEntry): Promise<void> {
    // Skip file logging if not in development or disabled
    if (!LoggingEnvironment.enableFileLogging || !LoggingEnvironment.isDevelopment) {
      return;
    }

    try {
      await this.ensureInitialized();

      const filePath = this.getLogFilePath(entry);
      const content = LogFormatter.formatForFile(entry);

      // Add to queue for async processing
      this.writeQueue.push({ entry, filePath, content });
      this.processQueue();

    } catch (error) {
      // Fallback to console if file logging fails
      console.error('File logging failed:', error);
      console.log('Log entry:', LogFormatter.formatForConsole(entry));
    }
  }

  /**
   * Process the write queue asynchronously
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.writeQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.writeQueue.length > 0) {
        const batch = this.writeQueue.splice(0, 10); // Process in batches of 10

        await Promise.all(
          batch.map(async ({ filePath, content }) => {
            try {
              await fs.appendFile(filePath, content, 'utf8');
            } catch (error) {
              console.error(`Failed to write to log file ${filePath}:`, error);
            }
          })
        );
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Get the appropriate log file path for an entry
   */
  private getLogFilePath(entry: LogEntry): string {
    const date = LoggingUtils.getDateString();
    const category = LoggingUtils.getCategoryFromEvent(entry.event);
    const timePrefix = LoggingUtils.getTimePrefix();

    // Create category-specific file paths
    let fileName: string;

    if (category === 'sessions' && entry.sessionId) {
      // Session logs include session ID in filename
      const sessionSuffix = entry.sessionId.substring(entry.sessionId.length - 8);
      fileName = `session-${timePrefix}-${sessionSuffix}.log`;
    } else {
      // Other logs use category and time
      fileName = `${category}-${timePrefix}.log`;
    }

    return path.join(this.logDir, category, date, fileName);
  }

  /**
   * Ensure logging directories exist
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create main log directory
      await fs.mkdir(this.logDir, { recursive: true });

      // Create category directories
      const categories = [
        'sessions',
        'queries',
        'errors',
        'performance',
        'requests',
        'functions',
        'auth',
        'interactions',
        'deck-codes',
        'general'
      ];

      const date = LoggingUtils.getDateString();

      await Promise.all(
        categories.map(category =>
          fs.mkdir(path.join(this.logDir, category, date), { recursive: true })
        )
      );

      this.initialized = true;

      // Start cleanup routine
      this.scheduleCleanup();

    } catch (error) {
      console.error('Failed to initialize file logger:', error);
      throw error;
    }
  }

  /**
   * Schedule periodic cleanup of old log files
   */
  private scheduleCleanup(): void {
    // Run cleanup immediately
    this.cleanupOldLogs().catch(error => {
      console.error('Initial log cleanup failed:', error);
    });
    
    // Schedule periodic cleanup (every hour)
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.cleanupOldLogs().catch(error => {
          console.error('Periodic log cleanup failed:', error);
        });
      }, 60 * 60 * 1000); // 1 hour
    }
  }

  /**
   * Clean up old log files based on retention policy
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const cutoffDate = LoggingUtils.getRetentionCutoff(LoggingEnvironment.logRetentionDays);
      const cutoffDateString = cutoffDate.toISOString().split('T')[0];

      // Get all category directories
      const categories = await fs.readdir(this.logDir, { withFileTypes: true });

      for (const category of categories) {
        if (!category.isDirectory()) continue;

        const categoryPath = path.join(this.logDir, category.name);
        const dateDirs = await fs.readdir(categoryPath, { withFileTypes: true });

        for (const dateDir of dateDirs) {
          if (!dateDir.isDirectory()) continue;

          // Check if date directory is older than retention period
          if (dateDir.name < cutoffDateString) {
            const dateDirPath = path.join(categoryPath, dateDir.name);
            await fs.rm(dateDirPath, { recursive: true, force: true });
            console.log(`Cleaned up old log directory: ${dateDirPath}`);
          }
        }
      }
    } catch (error) {
      console.error('Log cleanup failed:', error);
    }
  }

  /**
   * Check and rotate log files if they exceed size limit
   */
  private async checkFileRotation(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);

      if (stats.size > LoggingEnvironment.maxLogFileSize) {
        // Rotate the file by adding timestamp suffix
        const timestamp = Date.now();
        const rotatedPath = `${filePath}.${timestamp}`;

        await fs.rename(filePath, rotatedPath);
        console.log(`Rotated log file: ${filePath} -> ${rotatedPath}`);
      }
    } catch (error) {
      // File doesn't exist yet, which is fine
      if ((error as any).code !== 'ENOENT') {
        console.error('File rotation check failed:', error);
      }
    }
  }

  /**
   * Get log statistics for monitoring
   */
  async getLogStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    categoryCounts: Record<string, number>;
    oldestLog: string | null;
    newestLog: string | null;
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      categoryCounts: {} as Record<string, number>,
      oldestLog: null as string | null,
      newestLog: null as string | null
    };

    try {
      await this.ensureInitialized();

      const categories = await fs.readdir(this.logDir, { withFileTypes: true });

      for (const category of categories) {
        if (!category.isDirectory()) continue;

        const categoryPath = path.join(this.logDir, category.name);
        const dateDirs = await fs.readdir(categoryPath, { withFileTypes: true });

        stats.categoryCounts[category.name] = 0;

        for (const dateDir of dateDirs) {
          if (!dateDir.isDirectory()) continue;

          const dateDirPath = path.join(categoryPath, dateDir.name);
          const files = await fs.readdir(dateDirPath);

          for (const file of files) {
            const filePath = path.join(dateDirPath, file);
            const fileStat = await fs.stat(filePath);

            stats.totalFiles++;
            stats.totalSize += fileStat.size;
            stats.categoryCounts[category.name]++;

            // Track oldest and newest logs
            const fileDate = `${dateDir.name} ${file}`;
            if (!stats.oldestLog || fileDate < stats.oldestLog) {
              stats.oldestLog = fileDate;
            }
            if (!stats.newestLog || fileDate > stats.newestLog) {
              stats.newestLog = fileDate;
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get log stats:', error);
    }

    return stats;
  }

  /**
   * Force flush any pending writes
   */
  async flush(): Promise<void> {
    while (this.writeQueue.length > 0 || this.isProcessingQueue) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}
