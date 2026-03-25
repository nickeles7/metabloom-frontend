/**
 * Resilient Lambda API Client
 * Provides centralized network resilience for all Lambda API calls
 */

import { createServerLogger, ServerQuickLog } from '../logging/server';
import { SessionManager, PerformanceTimer } from '../logging';

// Types for Lambda API requests and responses
export interface LambdaQueryRequest {
  query?: string;
  params?: any[];
  action?: string;
}

export interface LambdaQueryResponse {
  success: boolean;
  data?: any[];
  error?: string;
  execution_time_ms?: number;
  count?: number;
}

export interface NetworkError extends Error {
  code?: string;
  status?: number;
  context?: string;
  attempt?: number;
  totalAttempts?: number;
}

// Configuration for resilient network calls
interface ResilientCallOptions {
  timeout?: number;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
  retryableErrors?: string[];
}

// Default configuration optimized for Lambda API calls
const DEFAULT_OPTIONS: Required<ResilientCallOptions> = {
  timeout: 10000, // 10 second timeout
  maxRetries: 3,
  baseDelay: 1000, // Start with 1 second delay
  maxDelay: 8000, // Cap at 8 seconds
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504], // Timeout, rate limit, server errors (NOT 400 - client errors)
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED']
};

/**
 * Centralized Resilient Lambda Client
 * Automatically provides network resilience to all Lambda API calls
 */
export class ResilientLambdaClient {
  private readonly baseUrl: string;
  private readonly options: Required<ResilientCallOptions>;
  private circuitBreakerFailures: number = 0;
  private circuitBreakerLastFailure: number = 0;
  private readonly circuitBreakerThreshold: number = 5;
  private readonly circuitBreakerTimeout: number = 30000; // 30 seconds
  private readonly logger = createServerLogger('lambda-client');

  constructor(
    baseUrl: string = 'https://wa6kt26wi1.execute-api.us-east-1.amazonaws.com/prod/query',
    options: Partial<ResilientCallOptions> = {}
  ) {
    this.baseUrl = baseUrl;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a Lambda query with full network resilience
   */
  async executeQuery(request: LambdaQueryRequest): Promise<LambdaQueryResponse> {
    const requestId = SessionManager.generateRequestId();
    const timer = new PerformanceTimer('lambda-client', 'executeQuery');

    // Log query start
    this.logger.info('QUERY_START', {
      requestId,
      query: request.query?.substring(0, 10000) + (request.query && request.query.length > 10000 ? '...' : ''),
      params: request.params,
      action: request.action,
      baseUrl: this.baseUrl
    });

    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      const error = new Error('Circuit breaker is open - too many recent failures') as NetworkError;
      error.code = 'CIRCUIT_BREAKER_OPEN';
      error.context = `${this.circuitBreakerFailures} failures in last ${this.circuitBreakerTimeout}ms`;

      this.logger.error('QUERY_FAILED', error, {
        requestId,
        reason: 'circuit_breaker_open',
        failures: this.circuitBreakerFailures
      });

      timer.end({ success: false, reason: 'circuit_breaker_open' });
      throw error;
    }

    let lastError: NetworkError | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        this.logger.debug('QUERY_START', {
          requestId,
          attempt,
          maxRetries: this.options.maxRetries
        });

        const result = await this.makeResilientRequest(request, attempt, requestId);

        // Success - reset circuit breaker
        this.circuitBreakerFailures = 0;
        this.circuitBreakerLastFailure = 0;

        const duration = timer.end({
          success: true,
          attempt,
          resultCount: result.data?.length || 0,
          executionTime: result.execution_time_ms
        });

        this.logger.info('QUERY_EXECUTED', {
          requestId,
          success: result.success,
          resultCount: result.data?.length || 0,
          executionTime: result.execution_time_ms,
          totalDuration: duration,
          attempt,
          circuitBreakerReset: true
        });

        return result;

      } catch (error) {
        lastError = this.enhanceError(error, attempt, this.options.maxRetries);

        this.logger.error('QUERY_FAILED', lastError, {
          requestId,
          attempt,
          maxRetries: this.options.maxRetries,
          retryable: this.isRetryableError(lastError)
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt === this.options.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateBackoffDelay(attempt);
        this.logger.debug('QUERY_START', {
          requestId,
          retryDelay: delay,
          nextAttempt: attempt + 1
        });
        await this.sleep(delay);
      }
    }

    // All retries failed - update circuit breaker
    this.circuitBreakerFailures++;
    this.circuitBreakerLastFailure = Date.now();

    timer.end({
      success: false,
      totalAttempts: this.options.maxRetries,
      circuitBreakerTriggered: this.circuitBreakerFailures >= this.circuitBreakerThreshold
    });

    // Log final failure
    this.logger.error('QUERY_FAILED', lastError || new Error('Unknown error'), {
      requestId,
      totalAttempts: this.options.maxRetries,
      circuitBreakerFailures: this.circuitBreakerFailures,
      circuitBreakerTriggered: this.circuitBreakerFailures >= this.circuitBreakerThreshold
    });

    // Throw the last error with enhanced context
    if (lastError) {
      lastError.message = `Lambda API failed after ${this.options.maxRetries} attempts: ${lastError.message}`;
      throw lastError;
    }

    // Fallback error (should not reach here)
    const fallbackError = new Error('Lambda API failed with unknown error') as NetworkError;
    fallbackError.code = 'UNKNOWN_ERROR';
    throw fallbackError;
  }

  /**
   * Make a single resilient request with timeout
   */
  private async makeResilientRequest(
    request: LambdaQueryRequest,
    attempt: number,
    requestId: string
  ): Promise<LambdaQueryResponse> {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      // Validate request has either query or action
      if (!request.query && !request.action) {
        const error = new Error('Request must have either query or action') as NetworkError;
        error.code = 'INVALID_REQUEST';
        throw error;
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check HTTP status
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');

        // Log detailed error information for debugging
        this.logger.error('SERVER_ERROR', new Error(`HTTP ${response.status}: ${response.statusText}`), {
          requestId,
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          requestBody: JSON.stringify(request).substring(0, 1000)
        });

        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as NetworkError;
        error.code = 'HTTP_ERROR';
        error.status = response.status;
        error.context = errorText;
        throw error;
      }

      // Parse JSON response
      const result = await response.json();

      // Check for Lambda-level errors
      if (result.error) {
        return {
          success: false,
          error: result.error,
          execution_time_ms: result.execution_time_ms
        };
      }

      // Success response
      return {
        success: true,
        data: result.data || [],
        count: result.count,
        execution_time_ms: result.execution_time_ms
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          const timeoutError = new Error(`Request timeout after ${this.options.timeout}ms`) as NetworkError;
          timeoutError.code = 'TIMEOUT';
          timeoutError.context = `Attempt ${attempt}`;
          throw timeoutError;
        }
        
        if (error.message.includes('fetch')) {
          const networkError = new Error(`Network error: ${error.message}`) as NetworkError;
          networkError.code = 'NETWORK_ERROR';
          networkError.context = `Attempt ${attempt}`;
          throw networkError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Check if circuit breaker should prevent requests
   */
  private isCircuitBreakerOpen(): boolean {
    if (this.circuitBreakerFailures < this.circuitBreakerThreshold) {
      return false;
    }
    
    const timeSinceLastFailure = Date.now() - this.circuitBreakerLastFailure;
    return timeSinceLastFailure < this.circuitBreakerTimeout;
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(error: any, attempt: number, totalAttempts: number): NetworkError {
    const enhanced = error as NetworkError;
    enhanced.attempt = attempt;
    enhanced.totalAttempts = totalAttempts;
    
    if (!enhanced.code) {
      enhanced.code = 'UNKNOWN_ERROR';
    }
    
    if (!enhanced.context) {
      enhanced.context = `Attempt ${attempt}/${totalAttempts}`;
    }
    
    return enhanced;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: NetworkError): boolean {
    // Check retryable status codes
    if (error.status && this.options.retryableStatuses.includes(error.status)) {
      return true;
    }
    
    // Check retryable error codes
    if (error.code && this.options.retryableErrors.includes(error.code)) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter
    return Math.min(jitteredDelay, this.options.maxDelay);
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus() {
    return {
      failures: this.circuitBreakerFailures,
      isOpen: this.isCircuitBreakerOpen(),
      lastFailure: this.circuitBreakerLastFailure,
      threshold: this.circuitBreakerThreshold,
      timeout: this.circuitBreakerTimeout
    };
  }
}

// Singleton instance for consistent usage across the application
let lambdaClientInstance: ResilientLambdaClient | null = null;

/**
 * Get the singleton Lambda client instance
 */
export function getLambdaClient(): ResilientLambdaClient {
  if (!lambdaClientInstance) {
    lambdaClientInstance = new ResilientLambdaClient();
  }
  return lambdaClientInstance;
}

/**
 * Reset the Lambda client instance (useful for testing)
 */
export function resetLambdaClient(): void {
  lambdaClientInstance = null;
}

/**
 * Convenience function for executing Lambda queries with automatic resilience
 * This is the recommended way for all functions to make Lambda API calls
 */
export async function executeLambdaQuery(
  query: string,
  params: any[] = [],
  action?: string
): Promise<LambdaQueryResponse> {
  const logger = createServerLogger('lambda-query');
  const client = getLambdaClient();

  // Log the convenience function call
  logger.debug('FUNCTION_CALLED', {
    function: 'executeLambdaQuery',
    queryLength: query.length,
    paramCount: params.length,
    hasAction: !!action
  });

  try {
    const result = await client.executeQuery({ query, params, action });

    logger.debug('FUNCTION_COMPLETED', {
      function: 'executeLambdaQuery',
      success: result.success,
      resultCount: result.data?.length || 0
    });

    return result;
  } catch (error) {
    logger.error('FUNCTION_FAILED', error as Error, {
      function: 'executeLambdaQuery',
      queryPreview: query.substring(0, 10000)
    });
    throw error;
  }
}

/**
 * Convenience function for executing predefined queries from the query manifest
 * Automatically handles the query_id -> query mapping pattern
 */
export async function executeManifestQuery(
  queryId: string,
  params: any[] = []
): Promise<LambdaQueryResponse> {
  const client = getLambdaClient();
  return client.executeQuery({ query: queryId, params });
}

/**
 * Health check function using the resilient client
 */
export async function healthCheck(): Promise<LambdaQueryResponse> {
  const client = getLambdaClient();
  return client.executeQuery({ action: 'health_check' });
}
