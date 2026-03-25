/**
 * AST Migration Strategy and Feature Flag System
 * 
 * Provides controlled rollout of AST system with monitoring,
 * feature flags, and gradual migration from legacy functions.
 */

import {
  ASTNode,
  ASTOutputSpecification,
  ASTQueryContext,
  createConditionNode,
  createLogicalNode
} from './ast-types';
import {
  handleExploreCardsAST,
  handleExploreCardsNatural
  // 🗑️ REMOVED: handleExploreCards, handleExploreDeckBuilding - Legacy functions eliminated in Stage 2 cleanup
} from '../grok/functions';
import { ExploreDeckParams } from './builder';

// ============================================================================
// FEATURE FLAG CONFIGURATION
// ============================================================================

export interface ASTFeatureFlags {
  /** Enable AST functions globally */
  enableAST: boolean;
  /** Enable natural language to AST conversion */
  enableNaturalLanguageAST: boolean;
  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  /** Enable detailed logging for debugging */
  enableDetailedLogging: boolean;
  /** Maximum complexity score allowed for AST queries */
  maxComplexityScore: number;
  /** Maximum execution time allowed (ms) */
  maxExecutionTime: number;
  // 🗑️ REMOVED: astTrafficPercentage, enableLegacyFallback - Stage 3 cleanup
  // Legacy functions eliminated, AST is now the only system
}

/**
 * Default feature flag configuration
 * 🗑️ UPDATED: Legacy rollout flags removed - Stage 3 cleanup
 */
export const DEFAULT_FEATURE_FLAGS: ASTFeatureFlags = {
  enableAST: true,
  enableNaturalLanguageAST: true,
  enablePerformanceMonitoring: true,
  enableDetailedLogging: true,
  maxComplexityScore: 100,
  maxExecutionTime: 10000
  // 🗑️ REMOVED: astTrafficPercentage, enableLegacyFallback - AST is now the only system
};

// 🗑️ REMOVED: ROLLOUT_PHASES - Stage 3 cleanup
// Legacy rollout phases no longer needed since AST is the only system

// ============================================================================
// MIGRATION MANAGER
// ============================================================================

export class ASTMigrationManager {
  private featureFlags: ASTFeatureFlags;
  private metrics: MigrationMetrics;

  constructor(featureFlags: ASTFeatureFlags = DEFAULT_FEATURE_FLAGS) {
    this.featureFlags = featureFlags;
    this.metrics = new MigrationMetrics();
  }

  /**
   * Smart function router that decides between AST and legacy functions
   */
  async routeExploreCardsRequest(
    request: ExploreCardsRequest,
    context: ASTQueryContext
  ): Promise<ExploreCardsResponse> {
    const startTime = Date.now();
    
    // Check if AST is enabled
    if (!this.featureFlags.enableAST) {
      throw new Error('AST system is disabled but no alternative system available');
    }

    // 🗑️ REMOVED: Traffic percentage routing - Stage 3 cleanup
    // AST is now the only system, no traffic splitting needed

    try {
      // Attempt AST routing
      const astResult = await this.routeToAST(request, context);
      
      // Check performance thresholds
      const executionTime = Date.now() - startTime;
      if (executionTime > this.featureFlags.maxExecutionTime) {
        this.metrics.recordPerformanceIssue('EXECUTION_TIME_EXCEEDED', executionTime);
        console.warn(`AST execution exceeded timeout: ${executionTime}ms > ${this.featureFlags.maxExecutionTime}ms`);
        // 🗑️ REMOVED: Legacy fallback - Stage 3 cleanup
        // Continue with AST result even if slow, no alternative system available
      }

      this.metrics.recordSuccess('AST', executionTime, astResult.data?.length || 0);
      return astResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.metrics.recordFailure('AST', errorMessage);

      // 🗑️ REMOVED: Legacy fallback - Stage 3 cleanup
      // AST is the only system, throw error instead of falling back
      console.error('AST system failed:', errorMessage);
      throw error;
    }
  }

  /**
   * Route request to AST system
   */
  private async routeToAST(
    request: ExploreCardsRequest,
    context: ASTQueryContext
  ): Promise<ExploreCardsResponse> {
    if (request.type === 'ast') {
      return handleExploreCardsAST({
        logicalQuery: request.astQuery!,
        output: request.output,
        context
      });
    } else if (request.type === 'natural') {
      return handleExploreCardsNatural({
        naturalQuery: request.naturalQuery!,
        output: request.output,
        context
      });
    } else {
      // Convert legacy request to AST
      const astQuery = this.convertLegacyToAST(request.legacyParams!);
      return handleExploreCardsAST({
        logicalQuery: astQuery,
        output: request.output,
        context
      });
    }
  }

  /**
   * Route request to legacy system (DEPRECATED - Legacy functions removed in Stage 2 cleanup)
   * Now routes to AST system instead since legacy functions no longer exist
   */
  private async routeToLegacy(
    request: ExploreCardsRequest,
    context: ASTQueryContext,
    reason: string
  ): Promise<ExploreCardsResponse> {
    console.warn(`🚨 Legacy routing attempted (${reason}) but legacy functions removed. Routing to AST instead.`);

    // Since legacy functions are removed, route to AST system instead
    return this.routeToAST(request, context);
  }

  /**
   * Convert legacy ExploreDeckParams to AST structure
   */
  private convertLegacyToAST(params: ExploreDeckParams): ASTNode {
    const conditions: ASTNode[] = [];

    // Convert filters to AST conditions
    if (params.filters.classes && params.filters.classes.length > 0) {
      conditions.push(createConditionNode(
        'class_name',
        params.filters.classes.length === 1 ? 'EQUALS' : 'IN',
        params.filters.classes.length === 1 ? params.filters.classes[0] : params.filters.classes
      ));
    }

    if (params.filters.keywords && params.filters.keywords.length > 0) {
      conditions.push(createConditionNode(
        'keywords',
        'CONTAINS_ALL',
        params.filters.keywords
      ));
    }

    if (params.filters.manaCost) {
      if (params.filters.manaCost.min !== undefined && params.filters.manaCost.max !== undefined) {
        conditions.push(createConditionNode(
          'mana_cost',
          'BETWEEN',
          { min: params.filters.manaCost.min, max: params.filters.manaCost.max }
        ));
      } else if (params.filters.manaCost.min !== undefined) {
        conditions.push(createConditionNode(
          'mana_cost',
          'GREATER_EQUAL',
          params.filters.manaCost.min
        ));
      } else if (params.filters.manaCost.max !== undefined) {
        conditions.push(createConditionNode(
          'mana_cost',
          'LESS_EQUAL',
          params.filters.manaCost.max
        ));
      }
    }

    if (params.filters.textContains && params.filters.textContains.length > 0) {
      const textConditions = params.filters.textContains.map(text =>
        createConditionNode('text', 'ILIKE', text)
      );

      if (textConditions.length === 1) {
        conditions.push(textConditions[0]);
      } else {
        conditions.push(createLogicalNode('OR', textConditions));
      }
    }

    // Combine all conditions with AND
    if (conditions.length === 0) {
      return createConditionNode('collectible', 'EQUALS', true);
    } else if (conditions.length === 1) {
      return conditions[0];
    } else {
      return createLogicalNode('AND', conditions);
    }
  }

  // 🗑️ REMOVED: shouldUseAST method - Stage 3 cleanup
  // Traffic percentage routing no longer needed since AST is the only system

  /**
   * Update feature flags for rollout control
   */
  updateFeatureFlags(newFlags: Partial<ASTFeatureFlags>): void {
    this.featureFlags = { ...this.featureFlags, ...newFlags };
  }

  /**
   * Get current metrics
   */
  getMetrics(): MigrationMetrics {
    return this.metrics;
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.metrics = new MigrationMetrics();
  }
}

// ============================================================================
// METRICS AND MONITORING
// ============================================================================

export class MigrationMetrics {
  private astSuccesses: number = 0;
  private astFailures: number = 0;
  private legacySuccesses: number = 0;
  private legacyFailures: number = 0;
  private astExecutionTimes: number[] = [];
  private legacyExecutionTimes: number[] = [];
  private legacyUsageReasons: Record<string, number> = {};
  private performanceIssues: Array<{ type: string; value: number; timestamp: Date }> = [];

  recordSuccess(system: 'AST' | 'LEGACY', executionTime: number, resultCount: number): void {
    if (system === 'AST') {
      this.astSuccesses++;
      this.astExecutionTimes.push(executionTime);
    } else {
      this.legacySuccesses++;
      this.legacyExecutionTimes.push(executionTime);
    }
  }

  recordFailure(system: 'AST' | 'LEGACY', error: string): void {
    if (system === 'AST') {
      this.astFailures++;
    } else {
      this.legacyFailures++;
    }
  }

  recordLegacyUsage(reason: string): void {
    this.legacyUsageReasons[reason] = (this.legacyUsageReasons[reason] || 0) + 1;
  }

  recordPerformanceIssue(type: string, value: number): void {
    this.performanceIssues.push({ type, value, timestamp: new Date() });
  }

  getSuccessRates(): { ast: number; legacy: number } {
    const astTotal = this.astSuccesses + this.astFailures;
    const legacyTotal = this.legacySuccesses + this.legacyFailures;

    return {
      ast: astTotal > 0 ? (this.astSuccesses / astTotal) * 100 : 0,
      legacy: legacyTotal > 0 ? (this.legacySuccesses / legacyTotal) * 100 : 0
    };
  }

  getAverageExecutionTimes(): { ast: number; legacy: number } {
    return {
      ast: this.astExecutionTimes.length > 0 
        ? this.astExecutionTimes.reduce((sum, time) => sum + time, 0) / this.astExecutionTimes.length 
        : 0,
      legacy: this.legacyExecutionTimes.length > 0 
        ? this.legacyExecutionTimes.reduce((sum, time) => sum + time, 0) / this.legacyExecutionTimes.length 
        : 0
    };
  }

  printSummary(): void {
    const successRates = this.getSuccessRates();
    const avgTimes = this.getAverageExecutionTimes();

    console.log('\n📊 MIGRATION METRICS SUMMARY');
    console.log('='.repeat(50));
    console.log(`🎯 AST Success Rate: ${successRates.ast.toFixed(1)}% (${this.astSuccesses}/${this.astSuccesses + this.astFailures})`);
    console.log(`🔄 Legacy Success Rate: ${successRates.legacy.toFixed(1)}% (${this.legacySuccesses}/${this.legacySuccesses + this.legacyFailures})`);
    console.log(`⚡ AST Avg Time: ${avgTimes.ast.toFixed(1)}ms`);
    console.log(`⏱️  Legacy Avg Time: ${avgTimes.legacy.toFixed(1)}ms`);
    
    console.log('\n🔄 Legacy Usage Reasons:');
    Object.entries(this.legacyUsageReasons).forEach(([reason, count]) => {
      console.log(`  - ${reason}: ${count}`);
    });

    if (this.performanceIssues.length > 0) {
      console.log('\n⚠️  Performance Issues:');
      this.performanceIssues.forEach(issue => {
        console.log(`  - ${issue.type}: ${issue.value}ms at ${issue.timestamp.toISOString()}`);
      });
    }
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ExploreCardsRequest {
  type: 'ast' | 'natural' | 'legacy';
  astQuery?: ASTNode;
  naturalQuery?: string;
  legacyParams?: ExploreDeckParams;
  output: ASTOutputSpecification;
}

export interface ExploreCardsResponse {
  success: boolean;
  data?: any[];
  error?: string;
  execution_time_ms?: number;
  metadata?: any;
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let migrationManager: ASTMigrationManager | null = null;

export function getMigrationManager(): ASTMigrationManager {
  if (!migrationManager) {
    migrationManager = new ASTMigrationManager();
  }
  return migrationManager;
}

export function setMigrationManager(manager: ASTMigrationManager): void {
  migrationManager = manager;
}
