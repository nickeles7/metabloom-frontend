/**
 * Optimized Logging Configuration for MetaBloom
 * Environment-based configuration for reduced verbosity
 */

import { LoggingEnvironment, LogLevel } from './environment';

export interface OptimizedLoggingConfig {
  // Global settings
  enableOptimizedLogging: boolean;
  logLevel: LogLevel;
  
  // Session caching
  sessionCacheTTL: number; // milliseconds
  enableSessionCaching: boolean;
  
  // Throttling settings
  throttleMs: number;
  enableThrottling: boolean;
  
  // Grok API logging
  grok: {
    logFullPayloads: boolean;
    logFullResponses: boolean;
    logFunctionSchemas: boolean;
    logSystemPrompts: boolean;
    maxConversationHistoryLines: number;
  };
  
  // Subscription logging
  subscription: {
    logFullUserProfiles: boolean;
    logStripeDetails: boolean;
    logTokenUsageDetails: boolean;
  };
  
  // AST/Query logging
  ast: {
    logFullQueries: boolean;
    logCompilationDetails: boolean;
    maxSQLLength: number;
  };
  
  // Performance logging
  performance: {
    logExecutionTimes: boolean;
    logTokenOptimization: boolean;
    logCacheStats: boolean;
  };
}

/**
 * Get optimized logging configuration based on environment
 */
export function getOptimizedLoggingConfig(): OptimizedLoggingConfig {
  const isDevelopment = LoggingEnvironment.isDevelopment;
  const logLevel = LoggingEnvironment.logLevel;
  
  // Base configuration
  const config: OptimizedLoggingConfig = {
    // Global settings
    enableOptimizedLogging: process.env.ENABLE_OPTIMIZED_LOGGING !== 'false',
    logLevel,
    
    // Session caching (30 minutes default)
    sessionCacheTTL: parseInt(process.env.SESSION_CACHE_TTL || '1800000'),
    enableSessionCaching: process.env.ENABLE_SESSION_CACHING !== 'false',
    
    // Throttling (5 seconds default)
    throttleMs: parseInt(process.env.LOG_THROTTLE_MS || '5000'),
    enableThrottling: process.env.ENABLE_LOG_THROTTLING !== 'false',
    
    // Grok API logging
    grok: {
      logFullPayloads: logLevel === 'DEBUG',
      logFullResponses: logLevel === 'DEBUG',
      logFunctionSchemas: logLevel === 'DEBUG',
      logSystemPrompts: logLevel === 'DEBUG',
      maxConversationHistoryLines: parseInt(process.env.MAX_CONVERSATION_HISTORY_LINES || '3')
    },
    
    // Subscription logging
    subscription: {
      logFullUserProfiles: logLevel === 'DEBUG',
      logStripeDetails: logLevel === 'DEBUG',
      logTokenUsageDetails: ['DEBUG', 'INFO'].includes(logLevel)
    },
    
    // AST/Query logging
    ast: {
      logFullQueries: logLevel === 'DEBUG',
      logCompilationDetails: logLevel === 'DEBUG',
      maxSQLLength: parseInt(process.env.MAX_SQL_LOG_LENGTH || '200')
    },
    
    // Performance logging
    performance: {
      logExecutionTimes: ['DEBUG', 'INFO'].includes(logLevel),
      logTokenOptimization: ['DEBUG', 'INFO'].includes(logLevel),
      logCacheStats: logLevel === 'DEBUG'
    }
  };
  
  // Development overrides
  if (isDevelopment) {
    // In development, allow more detailed logging if explicitly requested
    if (process.env.DEV_VERBOSE_LOGGING === 'true') {
      config.grok.logFullPayloads = true;
      config.grok.logFullResponses = true;
      config.subscription.logFullUserProfiles = true;
      config.ast.logFullQueries = true;
    }
  }
  
  // Production overrides
  if (LoggingEnvironment.isProduction) {
    // In production, be more conservative
    config.grok.maxConversationHistoryLines = 1;
    config.throttleMs = Math.max(config.throttleMs, 10000); // Minimum 10 seconds in production
    config.sessionCacheTTL = Math.max(config.sessionCacheTTL, 3600000); // Minimum 1 hour in production
  }
  
  return config;
}

/**
 * Validate and normalize configuration
 */
export function validateOptimizedLoggingConfig(config: OptimizedLoggingConfig): OptimizedLoggingConfig {
  // Ensure reasonable bounds
  config.sessionCacheTTL = Math.max(60000, Math.min(config.sessionCacheTTL, 86400000)); // 1 minute to 24 hours
  config.throttleMs = Math.max(1000, Math.min(config.throttleMs, 60000)); // 1 second to 1 minute
  config.grok.maxConversationHistoryLines = Math.max(0, Math.min(config.grok.maxConversationHistoryLines, 10));
  config.ast.maxSQLLength = Math.max(50, Math.min(config.ast.maxSQLLength, 1000));
  
  return config;
}

/**
 * Environment variables for configuration
 */
export const OPTIMIZED_LOGGING_ENV_VARS = {
  // Global
  ENABLE_OPTIMIZED_LOGGING: 'Enable/disable optimized logging system (default: true)',
  LOG_LEVEL: 'Logging level: DEBUG, INFO, WARN, ERROR (default: INFO)',
  
  // Caching
  SESSION_CACHE_TTL: 'Session cache TTL in milliseconds (default: 1800000 = 30 minutes)',
  ENABLE_SESSION_CACHING: 'Enable session-based caching (default: true)',
  
  // Throttling
  LOG_THROTTLE_MS: 'Log throttling interval in milliseconds (default: 5000)',
  ENABLE_LOG_THROTTLING: 'Enable log throttling (default: true)',
  
  // Grok
  MAX_CONVERSATION_HISTORY_LINES: 'Max conversation history lines to log (default: 3)',
  
  // AST
  MAX_SQL_LOG_LENGTH: 'Maximum SQL query length to log (default: 200)',
  
  // Development
  DEV_VERBOSE_LOGGING: 'Enable verbose logging in development (default: false)'
} as const;

/**
 * Get configuration summary for debugging
 */
export function getConfigSummary(): Record<string, any> {
  const config = getOptimizedLoggingConfig();
  
  return {
    environment: {
      isDevelopment: LoggingEnvironment.isDevelopment,
      isProduction: LoggingEnvironment.isProduction,
      logLevel: config.logLevel
    },
    optimizations: {
      enableOptimizedLogging: config.enableOptimizedLogging,
      enableSessionCaching: config.enableSessionCaching,
      enableThrottling: config.enableThrottling,
      sessionCacheTTL: `${config.sessionCacheTTL / 1000}s`,
      throttleMs: `${config.throttleMs / 1000}s`
    },
    verbosity: {
      grokFullPayloads: config.grok.logFullPayloads,
      grokFullResponses: config.grok.logFullResponses,
      subscriptionFullProfiles: config.subscription.logFullUserProfiles,
      astFullQueries: config.ast.logFullQueries,
      maxConversationLines: config.grok.maxConversationHistoryLines,
      maxSQLLength: config.ast.maxSQLLength
    }
  };
}

/**
 * Log configuration on startup
 */
export function logConfigurationSummary(): void {
  const summary = getConfigSummary();
  
  console.log('\n🔧 === OPTIMIZED LOGGING CONFIGURATION ===');
  console.log(`📊 Environment: ${summary.environment.isDevelopment ? 'Development' : 'Production'}`);
  console.log(`📈 Log Level: ${summary.environment.logLevel}`);
  console.log(`⚡ Optimizations: ${summary.optimizations.enableOptimizedLogging ? 'Enabled' : 'Disabled'}`);
  console.log(`💾 Session Caching: ${summary.optimizations.enableSessionCaching ? summary.optimizations.sessionCacheTTL : 'Disabled'}`);
  console.log(`🚦 Throttling: ${summary.optimizations.enableThrottling ? summary.optimizations.throttleMs : 'Disabled'}`);
  console.log(`🔍 Verbosity Reductions:`);
  console.log(`  - Grok Payloads: ${summary.verbosity.grokFullPayloads ? 'Full' : 'Summary'}`);
  console.log(`  - Grok Responses: ${summary.verbosity.grokFullResponses ? 'Full' : 'Summary'}`);
  console.log(`  - Subscription Profiles: ${summary.verbosity.subscriptionFullProfiles ? 'Full' : 'Essential'}`);
  console.log(`  - AST Queries: ${summary.verbosity.astFullQueries ? 'Full' : 'Summary'}`);
  console.log(`  - Conversation History: ${summary.verbosity.maxConversationLines} lines max`);
  console.log(`  - SQL Queries: ${summary.verbosity.maxSQLLength} chars max`);
  console.log('=== END CONFIGURATION ===\n');
}

// Export singleton instance
export const OptimizedLoggingConfig = getOptimizedLoggingConfig();
