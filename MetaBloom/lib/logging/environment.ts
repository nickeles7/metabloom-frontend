/**
 * Environment Detection for Logging System
 * Automatically detects development vs production environment
 * and configures appropriate logging strategy
 */

export interface LoggingEnvironmentConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  isVercel: boolean;
  logLevel: LogLevel;
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  logDirectory: string;
  maxLogFileSize: number;
  logRetentionDays: number;
  performanceLogging: boolean;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Environment Detection and Configuration
 */
export const LoggingEnvironment: LoggingEnvironmentConfig = {
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isVercel: !!process.env.VERCEL,
  
  // Log level configuration
  logLevel: (process.env.LOG_LEVEL as LogLevel) || 'INFO',
  
  // Logging strategy configuration
  enableFileLogging: process.env.ENABLE_FILE_LOGGING !== 'false' && process.env.NODE_ENV === 'development',
  enableConsoleLogging: true, // Always enabled, but format varies by environment
  
  // File logging configuration (development only)
  logDirectory: process.env.LOG_DIRECTORY || 'logs',
  maxLogFileSize: parseInt(process.env.MAX_LOG_FILE_SIZE || '10485760'), // 10MB default
  logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '7'), // 7 days default
  
  // Performance monitoring
  performanceLogging: process.env.ENABLE_PERFORMANCE_LOGGING !== 'false'
};

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(): LoggingEnvironmentConfig {
  return LoggingEnvironment;
}

/**
 * Check if logging level should be included
 */
export function shouldLog(level: LogLevel): boolean {
  const levels: Record<LogLevel, number> = {
    'DEBUG': 0,
    'INFO': 1,
    'WARN': 2,
    'ERROR': 3
  };
  
  return levels[level] >= levels[LoggingEnvironment.logLevel];
}

/**
 * Get appropriate logging strategy for current environment
 */
export function getLoggingStrategy(): 'file' | 'console' | 'both' {
  if (LoggingEnvironment.isDevelopment && LoggingEnvironment.enableFileLogging) {
    return LoggingEnvironment.enableConsoleLogging ? 'both' : 'file';
  }
  
  return 'console';
}

/**
 * Environment validation
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate log level
  const validLevels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  if (!validLevels.includes(LoggingEnvironment.logLevel)) {
    errors.push(`Invalid LOG_LEVEL: ${LoggingEnvironment.logLevel}. Must be one of: ${validLevels.join(', ')}`);
  }
  
  // Validate file size
  if (LoggingEnvironment.maxLogFileSize < 1024) {
    errors.push(`MAX_LOG_FILE_SIZE too small: ${LoggingEnvironment.maxLogFileSize}. Minimum 1KB.`);
  }
  
  // Validate retention days
  if (LoggingEnvironment.logRetentionDays < 1) {
    errors.push(`LOG_RETENTION_DAYS too small: ${LoggingEnvironment.logRetentionDays}. Minimum 1 day.`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
