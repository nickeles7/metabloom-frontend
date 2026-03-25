/**
 * AST Query System - Core Type Definitions
 * 
 * This module defines the foundational Abstract Syntax Tree interfaces
 * for deterministic SQL query compilation, replacing the template-based
 * approach with unlimited logical complexity support.
 */

// ============================================================================
// CORE AST NODE TYPES
// ============================================================================

/**
 * Base AST Node interface - all query logic nodes extend this
 */
export interface ASTNode {
  /** Node type identifier for compilation routing */
  type: ASTNodeType;
  /** Optional metadata for debugging and optimization */
  metadata?: ASTNodeMetadata;
}

/**
 * AST Node type enumeration
 */
export type ASTNodeType = 
  | 'AND'        // Logical AND - all children must be true
  | 'OR'         // Logical OR - any child can be true
  | 'NOT'        // Logical NOT - negates child condition
  | 'CONDITION'  // Leaf condition - field/operator/value
  | 'GROUP';     // Explicit grouping for precedence control

/**
 * Logical operator nodes (AND, OR, NOT, GROUP)
 */
export interface LogicalNode extends ASTNode {
  type: 'AND' | 'OR' | 'NOT' | 'GROUP';
  /** Child nodes to evaluate */
  children: ASTNode[];
}

/**
 * Condition leaf node - represents a single field comparison
 */
export interface ConditionNode extends ASTNode {
  type: 'CONDITION';
  /** Field name from schema mappings */
  field: string;
  /** Comparison operator */
  operator: OperatorType;
  /** Value(s) to compare against */
  value: ConditionValue;
  /** Optional condition-specific metadata */
  conditionMetadata?: ConditionMetadata;
}

// ============================================================================
// OPERATOR SYSTEM
// ============================================================================

/**
 * Supported SQL operators with their characteristics
 */
export type OperatorType =
  // Equality operators
  | 'EQUALS'           // field = value
  | 'NOT_EQUALS'       // field != value
  | 'IN'               // field IN (value1, value2, ...)
  | 'NOT_IN'           // field NOT IN (value1, value2, ...)
  
  // Comparison operators
  | 'GREATER_THAN'     // field > value
  | 'GREATER_EQUAL'    // field >= value
  | 'LESS_THAN'        // field < value
  | 'LESS_EQUAL'       // field <= value
  | 'BETWEEN'          // field BETWEEN value1 AND value2
  | 'NOT_BETWEEN'      // field NOT BETWEEN value1 AND value2
  
  // Text operators
  | 'ILIKE'            // field ILIKE '%value%' (case-insensitive)
  | 'NOT_ILIKE'        // field NOT ILIKE '%value%'
  | 'LIKE'             // field LIKE '%value%' (case-sensitive)
  | 'NOT_LIKE'         // field NOT LIKE '%value%'
  | 'STARTS_WITH'      // field ILIKE 'value%'
  | 'ENDS_WITH'        // field ILIKE '%value'
  | 'REGEX'            // field ~ 'pattern'
  | 'NOT_REGEX'        // field !~ 'pattern'
  
  // Array/Collection operators
  | 'CONTAINS'         // array contains value (for keywords, etc.)
  | 'CONTAINS_ALL'     // array contains all values
  | 'CONTAINS_ANY'     // array contains any of the values
  | 'NOT_CONTAINS'     // array does not contain value
  
  // Null operators
  | 'IS_NULL'          // field IS NULL
  | 'IS_NOT_NULL';     // field IS NOT NULL

/**
 * Operator definition with SQL generation details
 */
export interface OperatorDefinition {
  /** SQL template with %s placeholders */
  sqlTemplate: string;
  /** Number of parameters required */
  parameterCount: number | 'array' | 'range';
  /** Value transformation function */
  valueTransform?: (value: ConditionValue) => any[];
  /** Whether this operator requires a subquery */
  requiresSubquery?: boolean;
  /** Custom SQL generation function for complex operators */
  customSqlGenerator?: (field: string, value: ConditionValue) => SQLFragment;
}

// ============================================================================
// VALUE TYPES
// ============================================================================

/**
 * Possible condition values
 */
export type ConditionValue = 
  | string 
  | number 
  | boolean 
  | null
  | string[] 
  | number[]
  | RangeValue
  | RegexValue;

/**
 * Range value for BETWEEN operations
 */
export interface RangeValue {
  min: number;
  max: number;
}

/**
 * Regex value with pattern and flags
 */
export interface RegexValue {
  pattern: string;
  flags?: string; // 'i' for case-insensitive, etc.
}

// ============================================================================
// COMPILED QUERY TYPES
// ============================================================================

/**
 * SQL fragment generated from AST compilation
 */
export interface SQLFragment {
  /** SQL string with %s parameter placeholders */
  sql: string;
  /** Parameter values in order */
  parameters: any[];
  /** Required table joins for this fragment */
  requiredJoins: string[];
  /** Estimated query complexity score */
  complexityScore?: number;
}

/**
 * Complete compiled query ready for execution
 */
export interface CompiledQuery {
  /** Final SQL query string */
  sql: string;
  /** Parameter array for Lambda API */
  parameters: any[];
  /** Query metadata for debugging/optimization */
  metadata: CompiledQueryMetadata;
}

/**
 * Metadata attached to compiled queries
 */
export interface CompiledQueryMetadata {
  /** Original AST tree that generated this query */
  sourceAST: ASTNode;
  /** Tables joined in the query */
  tablesJoined: string[];
  /** Estimated result set size */
  estimatedResultSize?: number;
  /** Query complexity score */
  complexityScore: number;
  /** Compilation timestamp */
  compiledAt: Date;
  /** Optimization passes applied */
  optimizationsApplied: string[];
  /** Performance hints */
  performanceHints?: string[];
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * AST validation result
 */
export interface ASTValidationResult {
  /** Whether the AST is valid */
  isValid: boolean;
  /** Validation errors found */
  errors: ASTValidationErrorInterface[];
  /** Non-blocking warnings */
  warnings: ASTValidationWarning[];
  /** Suggested corrections */
  suggestions?: ASTCorrectionSuggestion[];
}

/**
 * AST validation error interface
 */
export interface ASTValidationErrorInterface {
  /** Error type classification */
  type: ASTErrorType;
  /** Human-readable error message */
  message: string;
  /** Path to the problematic node */
  nodePath: string;
  /** The invalid node */
  invalidNode: ASTNode;
  /** Suggested fix if available */
  suggestedFix?: string;
}

/**
 * AST validation warning
 */
export interface ASTValidationWarning {
  /** Warning type */
  type: ASTWarningType;
  /** Warning message */
  message: string;
  /** Path to the node causing warning */
  nodePath: string;
  /** Performance impact level */
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * AST correction suggestion
 */
export interface ASTCorrectionSuggestion {
  /** Type of correction */
  type: 'FIELD_CORRECTION' | 'OPERATOR_CORRECTION' | 'VALUE_CORRECTION' | 'STRUCTURE_SIMPLIFICATION';
  /** Description of the correction */
  description: string;
  /** Original problematic value */
  originalValue: any;
  /** Suggested replacement value */
  suggestedValue: any;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * AST error type enumeration
 */
export type ASTErrorType =
  | 'INVALID_NODE_TYPE'        // Unknown node type
  | 'INVALID_FIELD_NAME'       // Field not in schema
  | 'INVALID_OPERATOR'         // Operator not supported for field
  | 'INVALID_VALUE_TYPE'       // Value type doesn't match operator
  | 'MISSING_CHILDREN'         // Logical node without children
  | 'EMPTY_CONDITION'          // Condition node missing required fields
  | 'LOGICAL_CONTRADICTION'    // Impossible logical combination
  | 'EXCESSIVE_COMPLEXITY'     // Query too complex for performance
  | 'CIRCULAR_REFERENCE'       // Self-referencing node structure
  | 'INVALID_NESTING_DEPTH';   // Nesting exceeds maximum depth

/**
 * AST warning type enumeration
 */
export type ASTWarningType =
  | 'PERFORMANCE_CONCERN'      // Query may be slow
  | 'LARGE_RESULT_SET'         // Query may return many results
  | 'REDUNDANT_CONDITION'      // Duplicate or unnecessary condition
  | 'SUBOPTIMAL_STRUCTURE'     // Could be restructured for better performance
  | 'DEPRECATED_OPERATOR'      // Operator is deprecated
  | 'MISSING_INDEX_HINT';      // Query could benefit from index hints

// ============================================================================
// METADATA TYPES
// ============================================================================

/**
 * Metadata attached to AST nodes
 */
export interface ASTNodeMetadata {
  /** Human-readable description of this node's purpose */
  description?: string;
  /** Source of this node (user input, AI generation, etc.) */
  source?: 'USER' | 'AI' | 'SYSTEM' | 'MIGRATION';
  /** Confidence score for AI-generated nodes */
  confidence?: number;
  /** Performance hints for this node */
  performanceHints?: string[];
  /** Debug information */
  debug?: Record<string, any>;
}

/**
 * Metadata for condition nodes
 */
export interface ConditionMetadata {
  /** Original user input that generated this condition */
  originalInput?: string;
  /** Whether this condition was auto-corrected */
  wasCorrected?: boolean;
  /** Original value before correction */
  originalValue?: any;
  /** Fuzzy match confidence for corrected values */
  matchConfidence?: number;
}

// ============================================================================
// OUTPUT SPECIFICATION TYPES
// ============================================================================

/**
 * Output specification for AST queries (replaces ExploreDeckParams.output)
 */
export interface ASTOutputSpecification {
  /** Fields to include in SELECT clause */
  fields: string[];
  /** Ordering specification */
  orderBy?: ASTOrderBy[];
  /** Result limit */
  limit?: number;
  /** Result offset for pagination */
  offset?: number;
  /** Whether to include aggregated fields */
  includeAggregations?: boolean;
  /** Custom field aliases */
  fieldAliases?: Record<string, string>;
}

/**
 * Order by specification
 */
export interface ASTOrderBy {
  /** Field to order by */
  field: string;
  /** Sort direction */
  direction: 'ASC' | 'DESC';
  /** Null handling */
  nulls?: 'FIRST' | 'LAST';
}

/**
 * Query context for AST compilation
 */
export interface ASTQueryContext {
  /** User's original intent */
  userIntent: string;
  /** Building context for deck exploration */
  buildingContext?: string;
  /** Session information */
  sessionId?: string;
  /** User preferences */
  preferences?: ASTUserPreferences;
}

/**
 * User preferences for query compilation
 */
export interface ASTUserPreferences {
  /** Preferred result limit */
  defaultLimit?: number;
  /** Performance vs completeness preference */
  performanceMode?: 'FAST' | 'BALANCED' | 'COMPREHENSIVE';
  /** Whether to include debug information */
  includeDebugInfo?: boolean;
  /** Preferred field sets */
  preferredFields?: string[];
}

// ============================================================================
// COMPILATION CONFIGURATION
// ============================================================================

/**
 * Configuration for AST compilation
 */
export interface ASTCompilationConfig {
  /** Maximum nesting depth allowed */
  maxNestingDepth: number;
  /** Maximum number of conditions in a single query */
  maxConditionCount: number;
  /** Whether to enable query optimization */
  enableOptimization: boolean;
  /** Optimization passes to apply */
  optimizationPasses: OptimizationPass[];
  /** Performance thresholds */
  performanceThresholds: PerformanceThresholds;
  /** Default values */
  defaults: ASTCompilationDefaults;
}

/**
 * Optimization pass configuration
 */
export interface OptimizationPass {
  /** Pass name */
  name: string;
  /** Whether this pass is enabled */
  enabled: boolean;
  /** Pass priority (lower = earlier) */
  priority: number;
  /** Pass configuration */
  config?: Record<string, any>;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThresholds {
  /** Maximum estimated result set size */
  maxResultSetSize: number;
  /** Maximum query complexity score */
  maxComplexityScore: number;
  /** Maximum compilation time (ms) */
  maxCompilationTime: number;
  /** Warning thresholds */
  warningThresholds: {
    resultSetSize: number;
    complexityScore: number;
    compilationTime: number;
  };
}

/**
 * Default values for compilation
 */
export interface ASTCompilationDefaults {
  /** Default result limit */
  resultLimit: number;
  /** Default order by */
  orderBy: ASTOrderBy[];
  /** Default fields to include */
  defaultFields: string[];
  /** Default performance mode */
  performanceMode: 'FAST' | 'BALANCED' | 'COMPREHENSIVE';
}

// ============================================================================
// UTILITY TYPES AND TYPE GUARDS
// ============================================================================

/**
 * Type guard for logical nodes
 */
export function isLogicalNode(node: ASTNode): node is LogicalNode {
  return ['AND', 'OR', 'NOT', 'GROUP'].includes(node.type);
}

/**
 * Type guard for condition nodes
 */
export function isConditionNode(node: ASTNode): node is ConditionNode {
  return node.type === 'CONDITION';
}

/**
 * Type guard for range values
 */
export function isRangeValue(value: ConditionValue): value is RangeValue {
  return typeof value === 'object' && value !== null && 'min' in value && 'max' in value;
}

/**
 * Type guard for regex values
 */
export function isRegexValue(value: ConditionValue): value is RegexValue {
  return typeof value === 'object' && value !== null && 'pattern' in value;
}

/**
 * Deep readonly version of ASTNode for immutable operations
 */
export type ReadonlyASTNode = DeepReadonly<ASTNode>;

/**
 * Helper type for deep readonly
 */
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Union type for all possible AST node types
 */
export type AnyASTNode = LogicalNode | ConditionNode;

/**
 * Type-safe AST node creation helpers
 */
export function createLogicalNode(
  type: 'AND' | 'OR' | 'NOT' | 'GROUP',
  children: ASTNode[],
  metadata?: ASTNodeMetadata
): LogicalNode {
  return {
    type,
    children,
    metadata
  };
}

export function createConditionNode(
  field: string,
  operator: OperatorType,
  value: ConditionValue,
  metadata?: ASTNodeMetadata,
  conditionMetadata?: ConditionMetadata
): ConditionNode {
  return {
    type: 'CONDITION',
    field,
    operator,
    value,
    metadata,
    conditionMetadata
  };
}

/**
 * Visitor pattern interface for AST traversal
 */
export interface ASTVisitor<T = void> {
  visitLogicalNode?(node: LogicalNode, context?: any): T;
  visitConditionNode?(node: ConditionNode, context?: any): T;
  visitNode?(node: ASTNode, context?: any): T;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base class for AST-related errors
 */
export class ASTError extends Error {
  constructor(
    message: string,
    public readonly errorType: ASTErrorType,
    public readonly nodePath?: string,
    public readonly invalidNode?: ASTNode
  ) {
    super(message);
    this.name = 'ASTError';
  }
}

/**
 * Error thrown during AST validation
 */
export class ASTValidationError extends ASTError {
  constructor(
    message: string,
    errorType: ASTErrorType,
    nodePath: string,
    invalidNode: ASTNode,
    public readonly suggestedFix?: string
  ) {
    super(message, errorType, nodePath, invalidNode);
    this.name = 'ASTValidationError';
  }
}

/**
 * Error thrown during AST compilation
 */
export class ASTCompilationError extends ASTError {
  constructor(
    message: string,
    errorType: ASTErrorType,
    nodePath: string,
    invalidNode: ASTNode,
    public readonly compilationStage?: string
  ) {
    super(message, errorType, nodePath, invalidNode);
    this.name = 'ASTCompilationError';
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default AST compilation configuration
 */
export const DEFAULT_AST_CONFIG: ASTCompilationConfig = {
  maxNestingDepth: 10,
  maxConditionCount: 50,
  enableOptimization: true,
  optimizationPasses: [
    { name: 'redundancy_elimination', enabled: true, priority: 1 },
    { name: 'join_optimization', enabled: true, priority: 2 },
    { name: 'predicate_pushdown', enabled: true, priority: 3 },
    { name: 'index_hint_generation', enabled: true, priority: 4 }
  ],
  performanceThresholds: {
    maxResultSetSize: 1000,
    maxComplexityScore: 100,
    maxCompilationTime: 10000, // CRITICAL FIX: Align with execution timeout (10s)
    warningThresholds: {
      resultSetSize: 500,
      complexityScore: 50,
      compilationTime: 5000 // CRITICAL FIX: Warning at 5s, max at 10s
    }
  },
  defaults: {
    resultLimit: 15,
    orderBy: [
      { field: 'mana_cost', direction: 'ASC' },
      { field: 'name', direction: 'ASC' }
    ],
    defaultFields: ['name', 'mana_cost', 'attack', 'health', 'class_name', 'card_type', 'rarity'],
    performanceMode: 'BALANCED'
  }
};
