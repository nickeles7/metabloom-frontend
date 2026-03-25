/**
 * AST Query Compiler - Core Implementation
 * 
 * Transforms Abstract Syntax Trees into optimized SQL queries using enhanced
 * schema configuration. Provides deterministic compilation with automatic
 * join analysis, parameter handling, and performance optimization.
 */

import {
  ASTNode,
  LogicalNode,
  ConditionNode,
  SQLFragment,
  CompiledQuery,
  CompiledQueryMetadata,
  ASTValidationResult,
  ASTValidationErrorInterface,
  ASTCompilationError,
  ASTOutputSpecification,
  ASTQueryContext,
  ASTCompilationConfig,
  DEFAULT_AST_CONFIG,
  OperatorType,
  ConditionValue,
  isLogicalNode,
  isConditionNode,
  isRangeValue,
  isRegexValue
} from './ast-types';

import {
  EnhancedFieldDefinition,
  JoinRequirement,
  ENHANCED_FIELD_MAPPINGS,
  OPERATOR_DEFINITIONS,
  JOIN_REQUIREMENTS,
  getEnhancedFieldDefinition,
  isOperatorSupportedForField,
  getRequiredJoinsForFields,
  getOrderedJoinRequirements,
  validateFieldValue,
  getOperatorDefinition,
  fieldRequiresAggregation,
  getFieldPerformanceHints
} from './schema-config';

// ============================================================================
// CORE AST COMPILER CLASS
// ============================================================================

/**
 * Main AST Query Compiler
 * Transforms AST trees into optimized SQL queries
 */
export class ASTQueryCompiler {
  private config: ASTCompilationConfig;
  private compilationStartTime: Date;
  private complexityScore: number = 0;
  private performanceHints: string[] = [];
  private optimizationsApplied: string[] = [];

  constructor(config: ASTCompilationConfig = DEFAULT_AST_CONFIG) {
    this.config = config;
    this.compilationStartTime = new Date();
  }

  /**
   * Main compilation entry point
   * Transforms AST tree into executable SQL query
   */
  async compile(
    astTree: ASTNode,
    outputSpec: ASTOutputSpecification,
    context?: ASTQueryContext
  ): Promise<CompiledQuery> {
    this.compilationStartTime = new Date();
    this.complexityScore = 0;
    this.performanceHints = [];
    this.optimizationsApplied = [];

    try {
      // 1. Validate AST structure
      const validation = this.validateAST(astTree);
      if (!validation.isValid) {
        throw new ASTCompilationError(
          `AST validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          'INVALID_NODE_TYPE',
          'root',
          astTree,
          'validation'
        );
      }

      // 2. Analyze required JOINs from AST, output fields, and ORDER BY fields
      // CRITICAL FIX: Prevent race condition by collecting all fields before analysis
      const allFields = [...outputSpec.fields];

      // Add ORDER BY fields first to prevent modification during iteration
      const orderByFields: string[] = [];
      if (outputSpec.orderBy && outputSpec.orderBy.length > 0) {
        outputSpec.orderBy.forEach(order => {
          if (!allFields.includes(order.field)) {
            orderByFields.push(order.field);
          }
        });
      }

      // Combine all fields before AST extraction
      const combinedFields = [...allFields, ...orderByFields];
      this.extractFieldsFromAST(astTree, combinedFields);

      const joinRequirements = this.analyzeJoinRequirements(combinedFields);

      // 3. Compile AST tree into WHERE clause
      const whereFragment = this.compileNode(astTree, 'root');

      // 4. Assemble complete query
      const query = this.assembleQuery(whereFragment, joinRequirements, outputSpec);

      // 5. Apply optimization passes
      const optimizedQuery = this.optimizeQuery(query);

      // 6. Build compilation metadata
      const metadata: CompiledQueryMetadata = {
        sourceAST: astTree,
        tablesJoined: joinRequirements.map(jr => jr.table),
        complexityScore: this.complexityScore,
        compiledAt: this.compilationStartTime,
        optimizationsApplied: this.optimizationsApplied,
        performanceHints: this.performanceHints,
        estimatedResultSize: this.estimateResultSize(astTree, outputSpec)
      };

      return {
        sql: optimizedQuery.sql,
        parameters: optimizedQuery.parameters,
        metadata
      };

    } catch (error) {
      if (error instanceof ASTCompilationError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ASTCompilationError(
        `Compilation failed: ${errorMessage}`,
        'EXCESSIVE_COMPLEXITY',
        'unknown',
        astTree,
        'compilation'
      );
    }
  }

  /**
   * Recursive AST node compilation
   * Transforms individual nodes into SQL fragments
   */
  private compileNode(node: ASTNode, nodePath: string): SQLFragment {
    this.complexityScore += 1;

    // CRITICAL FIX: Real-time bounds checking during compilation
    if (this.complexityScore > this.config.performanceThresholds.maxComplexityScore) {
      throw new ASTCompilationError(
        `Complexity limit exceeded during compilation: ${this.complexityScore}`,
        'EXCESSIVE_COMPLEXITY',
        nodePath,
        node,
        'complexity_check'
      );
    }

    if (isLogicalNode(node)) {
      return this.compileLogicalNode(node, nodePath);
    } else if (isConditionNode(node)) {
      return this.compileConditionNode(node, nodePath);
    } else {
      throw new ASTCompilationError(
        `Unknown node type: ${node.type}`,
        'INVALID_NODE_TYPE',
        nodePath,
        node,
        'node_compilation'
      );
    }
  }

  /**
   * Compile logical nodes (AND, OR, NOT, GROUP)
   */
  private compileLogicalNode(node: LogicalNode, nodePath: string): SQLFragment {
    if (!node.children || node.children.length === 0) {
      throw new ASTCompilationError(
        `Logical node ${node.type} has no children`,
        'MISSING_CHILDREN',
        nodePath,
        node,
        'logical_compilation'
      );
    }

    const childFragments = node.children.map((child, index) => 
      this.compileNode(child, `${nodePath}.${index}`)
    );

    const allParameters: any[] = [];
    const allJoins: string[] = [];
    let combinedSql: string;

    // Collect parameters and joins from all children
    childFragments.forEach(fragment => {
      allParameters.push(...fragment.parameters);
      allJoins.push(...fragment.requiredJoins);
    });

    // Combine SQL based on logical operator
    switch (node.type) {
      case 'AND':
        combinedSql = childFragments
          .map(f => f.sql)
          .filter(sql => sql.trim().length > 0)
          .map(sql => `(${sql})`)
          .join(' AND ');
        break;

      case 'OR':
        combinedSql = childFragments
          .map(f => f.sql)
          .filter(sql => sql.trim().length > 0)
          .map(sql => `(${sql})`)
          .join(' OR ');
        this.performanceHints.push('OR conditions can impact performance - consider adding selective filters');
        break;

      case 'NOT':
        if (childFragments.length !== 1) {
          throw new ASTCompilationError(
            'NOT node must have exactly one child',
            'INVALID_NODE_TYPE',
            nodePath,
            node,
            'logical_compilation'
          );
        }
        combinedSql = `NOT (${childFragments[0].sql})`;
        break;

      case 'GROUP':
        combinedSql = childFragments
          .map(f => f.sql)
          .filter(sql => sql.trim().length > 0)
          .map(sql => `(${sql})`)
          .join(' AND ');
        break;

      default:
        throw new ASTCompilationError(
          `Unsupported logical operator: ${node.type}`,
          'INVALID_NODE_TYPE',
          nodePath,
          node,
          'logical_compilation'
        );
    }

    return {
      sql: combinedSql,
      parameters: allParameters,
      requiredJoins: [...new Set(allJoins)], // Remove duplicates
      complexityScore: this.complexityScore
    };
  }

  /**
   * Compile condition nodes (field/operator/value comparisons)
   */
  private compileConditionNode(node: ConditionNode, nodePath: string): SQLFragment {
    // Validate field exists
    const fieldDef = getEnhancedFieldDefinition(node.field);
    if (!fieldDef) {
      throw new ASTCompilationError(
        `Unknown field: ${node.field}`,
        'INVALID_FIELD_NAME',
        nodePath,
        node,
        'condition_compilation'
      );
    }

    // Validate operator is supported for field
    if (!isOperatorSupportedForField(node.field, node.operator)) {
      throw new ASTCompilationError(
        `Operator ${node.operator} not supported for field ${node.field}`,
        'INVALID_OPERATOR',
        nodePath,
        node,
        'condition_compilation'
      );
    }

    // Validate field value
    const valueValidation = validateFieldValue(node.field, node.value);
    if (!valueValidation.isValid) {
      throw new ASTCompilationError(
        `Invalid value for field ${node.field}: ${valueValidation.error}`,
        'INVALID_VALUE_TYPE',
        nodePath,
        node,
        'condition_compilation'
      );
    }

    // Get operator definition
    const operatorDef = getOperatorDefinition(node.operator);
    
    // Handle custom SQL generation (for complex operators like CONTAINS)
    if (operatorDef.customSqlGenerator) {
      // CRITICAL FIX: Pass field name instead of SQL expression to custom generator
      // This allows the generator to detect special fields like 'keywords' and use EXISTS clauses
      const customFragment = operatorDef.customSqlGenerator(node.field, node.value);
      return {
        ...customFragment,
        requiredJoins: [...customFragment.requiredJoins, ...fieldDef.requiredJoins]
      };
    }

    // Standard SQL generation
    let parameters: any[];
    let sqlTemplate = operatorDef.sqlTemplate;

    if (operatorDef.valueTransform) {
      parameters = operatorDef.valueTransform(node.value);

      // CRITICAL FIX: Handle IN/NOT_IN operators that need dynamic placeholder generation
      if ((node.operator === 'IN' || node.operator === 'NOT_IN') && Array.isArray(parameters)) {
        const placeholders = parameters.map(() => '%s').join(', ');
        sqlTemplate = sqlTemplate.replace('%s', placeholders);
      }
    } else if (operatorDef.parameterCount === 0) {
      parameters = [];
    } else {
      parameters = [node.value];
    }

    const sql = `${fieldDef.sqlExpression} ${sqlTemplate}`;

    // Add performance hints
    const fieldHints = getFieldPerformanceHints(node.field);
    this.performanceHints.push(...fieldHints);

    return {
      sql,
      parameters,
      requiredJoins: fieldDef.requiredJoins,
      complexityScore: 1
    };
  }

  /**
   * Extract all field names referenced in AST tree
   */
  private extractFieldsFromAST(node: ASTNode, fields: string[]): void {
    if (isConditionNode(node)) {
      if (!fields.includes(node.field)) {
        fields.push(node.field);
      }
    } else if (isLogicalNode(node)) {
      node.children.forEach(child => this.extractFieldsFromAST(child, fields));
    }
  }

  /**
   * Analyze join requirements for all referenced fields
   */
  private analyzeJoinRequirements(fieldNames: string[]): JoinRequirement[] {
    const requiredJoinNames = getRequiredJoinsForFields(fieldNames);
    const joinRequirements = getOrderedJoinRequirements(requiredJoinNames);

    // Add debugging information to performance hints
    this.performanceHints.push(`Fields analyzed: ${fieldNames.join(', ')}`);
    this.performanceHints.push(`Required joins: ${requiredJoinNames.join(', ')}`);
    this.performanceHints.push(`Join order: ${joinRequirements.map(jr => jr.alias).join(', ')}`);

    return joinRequirements;
  }

  /**
   * Assemble complete SQL query from fragments
   */
  private assembleQuery(
    whereFragment: SQLFragment,
    joinRequirements: JoinRequirement[],
    outputSpec: ASTOutputSpecification
  ): { sql: string; parameters: any[] } {
    const parts: string[] = [];
    const allParameters: any[] = [];

    // 1. Build SELECT clause
    const selectFields = this.buildSelectClause(outputSpec);
    parts.push(`SELECT ${selectFields}`);

    // 2. Build FROM clause
    parts.push('FROM cards c');

    // 3. Build JOIN clauses
    if (joinRequirements.length > 0) {
      const joinClauses = joinRequirements.map(jr =>
        `${jr.type} JOIN ${jr.table} ${jr.alias} ON ${jr.condition}`
      );
      parts.push(...joinClauses);
    }

    // 4. Build WHERE clause
    const whereConditions = ['c.collectible = true']; // Always filter to collectible cards
    if (whereFragment.sql.trim().length > 0) {
      whereConditions.push(whereFragment.sql);
      allParameters.push(...whereFragment.parameters);
    }
    parts.push(`WHERE ${whereConditions.join(' AND ')}`);

    // 5. Build GROUP BY clause (if aggregated fields are present)
    const aggregatedFields = outputSpec.fields.filter(field => fieldRequiresAggregation(field));
    if (aggregatedFields.length > 0) {
      const nonAggregatedFields = outputSpec.fields.filter(field => !fieldRequiresAggregation(field));
      if (nonAggregatedFields.length > 0) {
        const groupByFields = nonAggregatedFields
          .map(field => getEnhancedFieldDefinition(field)?.sqlExpression)
          .filter(expr => expr)
          .join(', ');
        if (groupByFields) {
          parts.push(`GROUP BY ${groupByFields}`);
        }
      }
    }

    // 6. Build ORDER BY clause
    if (outputSpec.orderBy && outputSpec.orderBy.length > 0) {
      const orderClauses = outputSpec.orderBy.map(order => {
        const fieldDef = getEnhancedFieldDefinition(order.field);
        if (!fieldDef) {
          throw new Error(`Unknown field in ORDER BY: ${order.field}`);
        }
        let clause = `${fieldDef.sqlExpression} ${order.direction}`;
        if (order.nulls) {
          clause += ` NULLS ${order.nulls}`;
        }
        return clause;
      });
      parts.push(`ORDER BY ${orderClauses.join(', ')}`);
    } else {
      // CRITICAL FIX: Only use ORDER BY fields that are in the SELECT clause when using DISTINCT
      const availableOrderFields: string[] = [];

      // Check which default order fields are available in the SELECT clause
      if (outputSpec.fields.includes('mana_cost')) {
        availableOrderFields.push('c.mana_cost ASC');
      }
      if (outputSpec.fields.includes('name')) {
        availableOrderFields.push('c.name ASC');
      }

      // If no ordering fields are available, use the first selected field
      if (availableOrderFields.length === 0 && outputSpec.fields.length > 0) {
        const firstField = outputSpec.fields[0];
        const fieldDef = getEnhancedFieldDefinition(firstField);
        if (fieldDef) {
          availableOrderFields.push(`${fieldDef.sqlExpression} ASC`);
        }
      }

      // Apply ordering if we have valid fields
      if (availableOrderFields.length > 0) {
        parts.push(`ORDER BY ${availableOrderFields.join(', ')}`);
      }
    }

    // 7. Build LIMIT clause
    const limit = outputSpec.limit || this.config.defaults.resultLimit;
    parts.push(`LIMIT ${limit}`);

    // 8. Build OFFSET clause (if specified)
    if (outputSpec.offset && outputSpec.offset > 0) {
      parts.push(`OFFSET ${outputSpec.offset}`);
    }

    return {
      sql: parts.join('\n'),
      parameters: allParameters
    };
  }

  /**
   * Build SELECT clause from output specification
   */
  private buildSelectClause(outputSpec: ASTOutputSpecification): string {
    const selectExpressions: string[] = [];

    outputSpec.fields.forEach(fieldName => {
      const fieldDef = getEnhancedFieldDefinition(fieldName);
      if (!fieldDef) {
        throw new Error(`Unknown field in SELECT: ${fieldName}`);
      }

      let expression = fieldDef.sqlExpression;

      // Apply field alias if specified
      if (outputSpec.fieldAliases && outputSpec.fieldAliases[fieldName]) {
        expression += ` AS ${outputSpec.fieldAliases[fieldName]}`;
      } else {
        // Use field name as alias for clarity
        expression += ` AS ${fieldName}`;
      }

      selectExpressions.push(expression);
    });

    // Handle DISTINCT for aggregated queries
    const hasAggregatedFields = outputSpec.fields.some(field => fieldRequiresAggregation(field));
    if (hasAggregatedFields) {
      return selectExpressions.join(', ');
    } else {
      // Use DISTINCT for non-aggregated queries to avoid duplicates from JOINs
      return `DISTINCT ${selectExpressions.join(', ')}`;
    }
  }

  /**
   * Apply optimization passes to improve query performance
   */
  private optimizeQuery(query: { sql: string; parameters: any[] }): { sql: string; parameters: any[] } {
    let optimizedSql = query.sql;
    const optimizedParameters = [...query.parameters];

    // Apply enabled optimization passes
    this.config.optimizationPasses
      .filter(pass => pass.enabled)
      .sort((a, b) => a.priority - b.priority)
      .forEach(pass => {
        switch (pass.name) {
          case 'redundancy_elimination':
            optimizedSql = this.eliminateRedundantConditions(optimizedSql);
            this.optimizationsApplied.push('redundancy_elimination');
            break;

          case 'join_optimization':
            optimizedSql = this.optimizeJoins(optimizedSql);
            this.optimizationsApplied.push('join_optimization');
            break;

          case 'predicate_pushdown':
            optimizedSql = this.pushDownPredicates(optimizedSql);
            this.optimizationsApplied.push('predicate_pushdown');
            break;

          case 'index_hint_generation':
            this.generateIndexHints(optimizedSql);
            this.optimizationsApplied.push('index_hint_generation');
            break;
        }
      });

    return {
      sql: optimizedSql,
      parameters: optimizedParameters
    };
  }

  /**
   * Eliminate redundant WHERE conditions
   */
  private eliminateRedundantConditions(sql: string): string {
    // Remove duplicate conditions (basic implementation)
    // In production, this would use more sophisticated AST analysis
    return sql.replace(/\(\s*([^)]+)\s*\)\s+AND\s+\(\s*\1\s*\)/g, '($1)');
  }

  /**
   * Optimize JOIN order and types
   */
  private optimizeJoins(sql: string): string {
    // Basic JOIN optimization - convert LEFT JOINs to INNER JOINs where possible
    // This is a simplified implementation; production would analyze WHERE conditions
    return sql;
  }

  /**
   * Push predicates closer to data source
   */
  private pushDownPredicates(sql: string): string {
    // Predicate pushdown optimization
    // In production, this would move WHERE conditions into JOIN conditions where beneficial
    return sql;
  }

  /**
   * Generate index usage hints
   */
  private generateIndexHints(sql: string): void {
    // Analyze query for index usage opportunities
    if (sql.includes('c.mana_cost')) {
      this.performanceHints.push('Query uses mana_cost - well indexed field');
    }
    if (sql.includes('ILIKE') || sql.includes('LIKE')) {
      this.performanceHints.push('Text search detected - consider adding other selective filters');
    }
    if (sql.includes('card_keywords')) {
      this.performanceHints.push('Keyword search requires complex joins - performance may vary');
    }
  }

  /**
   * Estimate result set size based on AST analysis
   */
  private estimateResultSize(astTree: ASTNode, outputSpec: ASTOutputSpecification): number {
    // Simplified estimation based on filter selectivity
    // In production, this would use database statistics
    let estimatedSize = 7842; // Total cards in database

    // Apply selectivity estimates based on conditions
    this.applySelectivityEstimates(astTree, (selectivity) => {
      estimatedSize *= selectivity;
    });

    // Apply limit
    const limit = outputSpec.limit || this.config.defaults.resultLimit;
    return Math.min(Math.round(estimatedSize), limit);
  }

  /**
   * Apply selectivity estimates for result size calculation
   */
  private applySelectivityEstimates(node: ASTNode, applySelectivity: (selectivity: number) => void): void {
    if (isConditionNode(node)) {
      // Estimate selectivity based on field and operator
      switch (node.field) {
        case 'class_name':
          applySelectivity(0.083); // ~1/12 classes
          break;
        case 'mana_cost':
          if (node.operator === 'EQUALS') applySelectivity(0.1);
          else if (node.operator === 'LESS_THAN') applySelectivity(0.3);
          break;
        case 'rarity':
          applySelectivity(0.2); // Varies by rarity
          break;
        case 'text':
          applySelectivity(0.1); // Text searches are typically selective
          break;
        default:
          applySelectivity(0.5); // Default moderate selectivity
      }
    } else if (isLogicalNode(node)) {
      node.children.forEach(child => this.applySelectivityEstimates(child, applySelectivity));
    }
  }

  /**
   * Comprehensive AST validation
   */
  private validateAST(astTree: ASTNode): ASTValidationResult {
    const errors: ASTValidationErrorInterface[] = [];
    const warnings: any[] = [];
    let nodeCount = 0;
    let maxDepth = 0;

    // Recursive validation
    const validateNode = (node: ASTNode, depth: number, path: string): void => {
      nodeCount++;
      maxDepth = Math.max(maxDepth, depth);

      // Check maximum nesting depth
      if (depth > this.config.maxNestingDepth) {
        errors.push({
          type: 'INVALID_NESTING_DEPTH',
          message: `Nesting depth ${depth} exceeds maximum ${this.config.maxNestingDepth}`,
          nodePath: path,
          invalidNode: node,
          suggestedFix: 'Reduce query complexity or increase maxNestingDepth configuration'
        });
        return;
      }

      // Validate node structure
      if (isLogicalNode(node)) {
        if (!node.children || node.children.length === 0) {
          errors.push({
            type: 'MISSING_CHILDREN',
            message: `Logical node ${node.type} has no children`,
            nodePath: path,
            invalidNode: node,
            suggestedFix: 'Add child conditions or remove empty logical node'
          });
          return;
        }

        // Validate NOT nodes have exactly one child
        if (node.type === 'NOT' && node.children.length !== 1) {
          errors.push({
            type: 'INVALID_NODE_TYPE',
            message: 'NOT node must have exactly one child',
            nodePath: path,
            invalidNode: node,
            suggestedFix: 'Ensure NOT node has exactly one child condition'
          });
        }

        // Recursively validate children
        node.children.forEach((child, index) => {
          validateNode(child, depth + 1, `${path}.${index}`);
        });

      } else if (isConditionNode(node)) {
        // Validate condition node fields
        if (!node.field) {
          errors.push({
            type: 'EMPTY_CONDITION',
            message: 'Condition node missing field',
            nodePath: path,
            invalidNode: node,
            suggestedFix: 'Specify a valid field name'
          });
        }

        if (!node.operator) {
          errors.push({
            type: 'EMPTY_CONDITION',
            message: 'Condition node missing operator',
            nodePath: path,
            invalidNode: node,
            suggestedFix: 'Specify a valid operator'
          });
        }

        if (node.value === undefined) {
          errors.push({
            type: 'EMPTY_CONDITION',
            message: 'Condition node missing value',
            nodePath: path,
            invalidNode: node,
            suggestedFix: 'Specify a value for the condition'
          });
        }

        // Validate field exists
        if (node.field && !getEnhancedFieldDefinition(node.field)) {
          errors.push({
            type: 'INVALID_FIELD_NAME',
            message: `Unknown field: ${node.field}`,
            nodePath: path,
            invalidNode: node,
            suggestedFix: `Use one of: ${Object.keys(ENHANCED_FIELD_MAPPINGS).join(', ')}`
          });
        }

        // Validate operator is supported for field
        if (node.field && node.operator && !isOperatorSupportedForField(node.field, node.operator)) {
          const fieldDef = getEnhancedFieldDefinition(node.field);
          errors.push({
            type: 'INVALID_OPERATOR',
            message: `Operator ${node.operator} not supported for field ${node.field}`,
            nodePath: path,
            invalidNode: node,
            suggestedFix: `Use one of: ${fieldDef?.supportedOperators.join(', ') || 'none'}`
          });
        }

        // Validate field value
        if (node.field && node.value !== undefined) {
          const valueValidation = validateFieldValue(node.field, node.value);
          if (!valueValidation.isValid) {
            errors.push({
              type: 'INVALID_VALUE_TYPE',
              message: valueValidation.error || 'Invalid field value',
              nodePath: path,
              invalidNode: node,
              suggestedFix: 'Check field value constraints and valid values'
            });
          }
        }

      } else {
        errors.push({
          type: 'INVALID_NODE_TYPE',
          message: `Unknown node type: ${(node as any).type}`,
          nodePath: path,
          invalidNode: node,
          suggestedFix: 'Use valid node types: AND, OR, NOT, CONDITION, GROUP'
        });
      }
    };

    // Start validation from root
    validateNode(astTree, 0, 'root');

    // Check overall complexity
    if (nodeCount > this.config.maxConditionCount) {
      errors.push({
        type: 'EXCESSIVE_COMPLEXITY',
        message: `Query has ${nodeCount} conditions, exceeds maximum ${this.config.maxConditionCount}`,
        nodePath: 'root',
        invalidNode: astTree,
        suggestedFix: 'Simplify query or increase maxConditionCount configuration'
      });
    }

    // Generate performance warnings
    if (nodeCount > this.config.performanceThresholds.warningThresholds.complexityScore) {
      warnings.push({
        type: 'PERFORMANCE_CONCERN',
        message: `High complexity query with ${nodeCount} conditions may be slow`,
        nodePath: 'root',
        impactLevel: 'MEDIUM'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a simple AST compiler instance with default configuration
 */
export function createASTCompiler(config?: Partial<ASTCompilationConfig>): ASTQueryCompiler {
  const fullConfig = config ? { ...DEFAULT_AST_CONFIG, ...config } : DEFAULT_AST_CONFIG;
  return new ASTQueryCompiler(fullConfig);
}

/**
 * Quick compilation function for simple use cases
 */
export async function compileAST(
  astTree: ASTNode,
  outputSpec: ASTOutputSpecification,
  context?: ASTQueryContext,
  config?: Partial<ASTCompilationConfig>
): Promise<CompiledQuery> {
  const compiler = createASTCompiler(config);
  return compiler.compile(astTree, outputSpec, context);
}

/**
 * Validate AST without compilation
 */
export function validateAST(astTree: ASTNode, config?: Partial<ASTCompilationConfig>): ASTValidationResult {
  const compiler = createASTCompiler(config);
  return (compiler as any).validateAST(astTree);
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { CompiledQuery, ASTValidationResult, ASTCompilationError };
