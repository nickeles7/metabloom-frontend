/**
 * QueryMaster Parameter Validator
 * Validates structured parameters and provides intelligent error correction
 */

import { SCHEMA_MAPPINGS, FIELD_MAPPINGS } from './schema-config';
import { ExploreDeckParams } from './builder';

// Validation result interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  correctedParams?: ExploreDeckParams;
}

export interface ValidationError {
  type: 'INVALID_FILTER_VALUE' | 'UNKNOWN_FIELD' | 'INVALID_RANGE' | 'UNSUPPORTED_QUERY_COMPLEXITY';
  field: string;
  invalidValue: any;
  suggestions?: string[];
  fallbackAction: 'USE_AI_FLOW' | 'REMOVE_FILTER' | 'USE_SUGGESTION';
  message: string;
}

export interface ValidationWarning {
  type: 'PERFORMANCE_WARNING' | 'DEPRECATED_FIELD' | 'LARGE_RESULT_SET';
  field?: string;
  message: string;
  suggestion?: string;
}

export class ParamValidator {
  
  /**
   * Main validation entry point
   */
  validateExploreDeckParams(params: ExploreDeckParams): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let correctedParams = { ...params };
    
    // Validate filters
    const filterValidation = this.validateFilterValues(params.filters);
    errors.push(...filterValidation.errors);
    warnings.push(...filterValidation.warnings);
    
    // Validate output fields
    const fieldValidation = this.validateOutputFields(params.output.fields);
    errors.push(...fieldValidation.errors);
    warnings.push(...fieldValidation.warnings);
    
    // Validate numeric ranges
    const rangeValidation = this.validateNumericRanges(params.filters);
    errors.push(...rangeValidation.errors);
    
    // Check for query complexity
    const complexityValidation = this.validateQueryComplexity(params);
    errors.push(...complexityValidation.errors);
    warnings.push(...complexityValidation.warnings);
    
    // Apply corrections where possible
    if (errors.length === 0 || errors.every(e => e.fallbackAction === 'USE_SUGGESTION')) {
      correctedParams = this.applySuggestions(params, errors);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      correctedParams: errors.length === 0 ? correctedParams : undefined
    };
  }
  
  /**
   * Validate filter values against schema mappings
   */
  validateFilterValues(filters: ExploreDeckParams['filters']): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Validate classes
    if (filters.classes) {
      const classValidation = this.validateArrayFilter(
        'classes', filters.classes, SCHEMA_MAPPINGS.classes.validValues!
      );
      errors.push(...classValidation.errors);
    }
    
    // Validate rarities
    if (filters.rarities) {
      const rarityValidation = this.validateArrayFilter(
        'rarities', filters.rarities, SCHEMA_MAPPINGS.rarities.validValues!
      );
      errors.push(...rarityValidation.errors);
    }
    
    // Validate card types
    if (filters.cardTypes) {
      const typeValidation = this.validateArrayFilter(
        'cardTypes', filters.cardTypes, SCHEMA_MAPPINGS.cardTypes.validValues!
      );
      errors.push(...typeValidation.errors);
    }
    
    // Validate minion types
    if (filters.minionTypes) {
      const minionTypeValidation = this.validateArrayFilter(
        'minionTypes', filters.minionTypes, SCHEMA_MAPPINGS.minionTypes.validValues!
      );
      errors.push(...minionTypeValidation.errors);
    }
    
    // Validate spell schools
    if (filters.spellSchools) {
      const spellSchoolValidation = this.validateArrayFilter(
        'spellSchools', filters.spellSchools, SCHEMA_MAPPINGS.spellSchools.validValues!
      );
      errors.push(...spellSchoolValidation.errors);
    }
    
    // Validate keywords
    if (filters.keywords) {
      const keywordValidation = this.validateArrayFilter(
        'keywords', filters.keywords, SCHEMA_MAPPINGS.keywords.validValues!
      );
      errors.push(...keywordValidation.errors);
    }
    
    // Validate formats
    if (filters.formats) {
      const formatValidation = this.validateArrayFilter(
        'formats', filters.formats, SCHEMA_MAPPINGS.formats.validValues!
      );
      errors.push(...formatValidation.errors);
    }
    
    // Performance warnings
    if (filters.keywords && filters.keywords.length > 5) {
      warnings.push({
        type: 'PERFORMANCE_WARNING',
        field: 'keywords',
        message: 'Filtering by many keywords may impact performance',
        suggestion: 'Consider reducing to 3-5 most important keywords'
      });
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  /**
   * Validate array filter values with fuzzy matching suggestions
   */
  private validateArrayFilter(
    fieldName: string, 
    values: string[], 
    validValues: string[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    
    for (const value of values) {
      if (!validValues.includes(value)) {
        const suggestions = this.findSimilarValues(value, validValues);
        
        errors.push({
          type: 'INVALID_FILTER_VALUE',
          field: fieldName,
          invalidValue: value,
          suggestions,
          fallbackAction: suggestions.length > 0 ? 'USE_SUGGESTION' : 'USE_AI_FLOW',
          message: `Invalid ${fieldName} value: "${value}". ${
            suggestions.length > 0 
              ? `Did you mean: ${suggestions.join(', ')}?` 
              : 'No similar values found.'
          }`
        });
      }
    }
    
    return { isValid: errors.length === 0, errors, warnings: [] };
  }
  
  /**
   * Validate output fields
   */
  validateOutputFields(fields: string[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (const field of fields) {
      if (!FIELD_MAPPINGS[field]) {
        const suggestions = this.findSimilarValues(field, Object.keys(FIELD_MAPPINGS));
        
        errors.push({
          type: 'UNKNOWN_FIELD',
          field: 'output.fields',
          invalidValue: field,
          suggestions,
          fallbackAction: suggestions.length > 0 ? 'USE_SUGGESTION' : 'REMOVE_FILTER',
          message: `Unknown output field: "${field}". ${
            suggestions.length > 0 
              ? `Did you mean: ${suggestions.join(', ')}?` 
              : 'Field will be removed from output.'
          }`
        });
      }
    }
    
    // Performance warning for too many fields
    if (fields.length > 15) {
      warnings.push({
        type: 'PERFORMANCE_WARNING',
        field: 'output.fields',
        message: 'Selecting many fields may impact performance',
        suggestion: 'Consider using predefined field sets or reducing field count'
      });
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  /**
   * Validate numeric ranges
   */
  validateNumericRanges(filters: ExploreDeckParams['filters']): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Validate mana cost range
    if (filters.manaCost) {
      const manaErrors = this.validateNumericRange('manaCost', filters.manaCost, 0, 20);
      errors.push(...manaErrors);
    }
    
    // Validate attack range
    if (filters.attack) {
      const attackErrors = this.validateNumericRange('attack', filters.attack, 0, 50);
      errors.push(...attackErrors);
    }
    
    // Validate health range
    if (filters.health) {
      const healthErrors = this.validateNumericRange('health', filters.health, 1, 100);
      errors.push(...healthErrors);
    }
    
    return { isValid: errors.length === 0, errors, warnings: [] };
  }
  
  /**
   * Validate individual numeric range
   */
  private validateNumericRange(
    fieldName: string,
    range: { min?: number; max?: number; exact?: number },
    absoluteMin: number,
    absoluteMax: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Validate min/max relationship
    if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
      errors.push({
        type: 'INVALID_RANGE',
        field: fieldName,
        invalidValue: range,
        fallbackAction: 'USE_AI_FLOW',
        message: `Invalid ${fieldName} range: min (${range.min}) cannot be greater than max (${range.max})`
      });
    }
    
    // Validate bounds
    const values = [range.min, range.max, range.exact].filter(v => v !== undefined);
    for (const value of values) {
      if (value! < absoluteMin || value! > absoluteMax) {
        errors.push({
          type: 'INVALID_RANGE',
          field: fieldName,
          invalidValue: value,
          fallbackAction: 'USE_AI_FLOW',
          message: `${fieldName} value ${value} is outside valid range (${absoluteMin}-${absoluteMax})`
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Check for unsupported query complexity
   */
  validateQueryComplexity(params: ExploreDeckParams): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check for complex text search patterns
    if (params.filters.textContains && params.filters.textContains.length > 3) {
      warnings.push({
        type: 'PERFORMANCE_WARNING',
        field: 'textContains',
        message: 'Complex text search may be slow',
        suggestion: 'Consider using fewer, more specific search terms'
      });
    }
    
    // Check for very large result sets
    const hasRestrictiveFilters = !!(
      params.filters.classes?.length ||
      params.filters.rarities?.length ||
      params.filters.cardTypes?.length ||
      params.filters.manaCost ||
      params.filters.keywords?.length
    );
    
    if (!hasRestrictiveFilters && (!params.output.limit || params.output.limit > 50)) {
      warnings.push({
        type: 'LARGE_RESULT_SET',
        message: 'Query may return very large result set',
        suggestion: 'Add filters or reduce limit for better performance'
      });
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  /**
   * Find similar values using fuzzy string matching
   */
  private findSimilarValues(input: string, validValues: string[], maxSuggestions = 3): string[] {
    const inputLower = input.toLowerCase();
    
    // Exact case-insensitive match
    const exactMatch = validValues.find(v => v.toLowerCase() === inputLower);
    if (exactMatch) return [exactMatch];
    
    // Calculate similarity scores
    const similarities = validValues.map(value => ({
      value,
      score: this.calculateSimilarity(inputLower, value.toLowerCase())
    }));
    
    // Return top matches above threshold
    return similarities
      .filter(s => s.score > 0.6)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(s => s.value);
  }
  
  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }
  
  /**
   * Apply suggestions to create corrected parameters
   */
  private applySuggestions(params: ExploreDeckParams, errors: ValidationError[]): ExploreDeckParams {
    const corrected = JSON.parse(JSON.stringify(params)); // Deep clone
    
    for (const error of errors) {
      if (error.fallbackAction === 'USE_SUGGESTION' && error.suggestions && error.suggestions.length > 0) {
        // Apply first suggestion
        const suggestion = error.suggestions[0];
        
        // Navigate to the field and replace the invalid value
        if (error.field in corrected.filters) {
          const filterArray = (corrected.filters as any)[error.field] as string[];
          const index = filterArray.indexOf(error.invalidValue);
          if (index !== -1) {
            filterArray[index] = suggestion;
          }
        }
      }
    }
    
    return corrected;
  }
  
  /**
   * Generate user-friendly correction suggestions
   */
  suggestCorrections(invalidParams: string[]): string[] {
    const suggestions: string[] = [];
    
    for (const param of invalidParams) {
      // Check all schema mappings for similar values
      for (const [schemaKey, mapping] of Object.entries(SCHEMA_MAPPINGS)) {
        if (mapping.validValues) {
          const similar = this.findSimilarValues(param, mapping.validValues, 1);
          if (similar.length > 0) {
            suggestions.push(`For ${schemaKey}: "${param}" → "${similar[0]}"`);
          }
        }
      }
    }
    
    return suggestions;
  }
}
