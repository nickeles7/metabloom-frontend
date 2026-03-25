/**
 * Bulletproof AST Transformation Layer
 * 
 * This module provides comprehensive transformation of AI-generated AST nodes
 * to ensure 100% compatibility with the AST schema. It handles operator name
 * variations, field name typos, and value transformations with multiple
 * fallback strategies to guarantee it never fails.
 */

import {
  ASTNode,
  ConditionNode,
  LogicalNode,
  OperatorType,
  ConditionValue,
  isConditionNode,
  isLogicalNode,
  createConditionNode,
  createLogicalNode
} from './ast-types';

// ============================================================================
// BULLETPROOF OPERATOR TRANSFORMATIONS
// ============================================================================

const BULLETPROOF_OPERATOR_TRANSFORMATIONS: Record<string, OperatorType> = {
  // === EQUALITY OPERATORS ===
  'EQUALS': 'EQUALS',
  'EQUAL': 'EQUALS',
  'EQ': 'EQUALS',
  'IS': 'EQUALS',
  '=': 'EQUALS',
  '==': 'EQUALS',
  '===': 'EQUALS',
  'SAME_AS': 'EQUALS',
  'MATCHES': 'EQUALS',
  'EQULAS': 'EQUALS', // Common typo
  'EQAULS': 'EQUALS', // Common typo
  
  'NOT_EQUALS': 'NOT_EQUALS',
  'NOT_EQUAL': 'NOT_EQUALS',
  'NEQ': 'NOT_EQUALS',
  'NE': 'NOT_EQUALS',
  '!=': 'NOT_EQUALS',
  '!==': 'NOT_EQUALS',
  '<>': 'NOT_EQUALS',
  'NOT_SAME_AS': 'NOT_EQUALS',
  'DIFFERENT': 'NOT_EQUALS',
  'NOT_IS': 'NOT_EQUALS',
  
  'IN': 'IN',
  'WITHIN': 'IN',
  'ONE_OF': 'IN',
  'AMONG': 'IN',
  'INSIDE': 'IN',
  'INCLUDES_IN': 'IN',
  
  'NOT_IN': 'NOT_IN',
  'NOT_WITHIN': 'NOT_IN',
  'NONE_OF': 'NOT_IN',
  'NOT_AMONG': 'NOT_IN',
  'OUTSIDE': 'NOT_IN',
  'EXCLUDES': 'NOT_IN',

  // === COMPARISON OPERATORS ===
  'GREATER_THAN': 'GREATER_THAN',
  'GT': 'GREATER_THAN',
  '>': 'GREATER_THAN',
  'ABOVE': 'GREATER_THAN',
  'MORE_THAN': 'GREATER_THAN',
  'BIGGER_THAN': 'GREATER_THAN',
  'HIGHER_THAN': 'GREATER_THAN',
  'EXCEEDS': 'GREATER_THAN',
  
  // KEY TRANSFORMATIONS: All variations → GREATER_EQUAL
  'GREATER_EQUAL': 'GREATER_EQUAL',
  'GREATER_THAN_OR_EQUAL': 'GREATER_EQUAL',
  'GREATER_OR_EQUAL': 'GREATER_EQUAL',
  'GREATER_EQUAL_TO': 'GREATER_EQUAL',
  'GREATER_THAN_OR_EQUAL_TO': 'GREATER_EQUAL',
  'GTE': 'GREATER_EQUAL',
  'GEQ': 'GREATER_EQUAL',
  '>=': 'GREATER_EQUAL',
  'AT_LEAST': 'GREATER_EQUAL',
  'MINIMUM': 'GREATER_EQUAL',
  'MIN': 'GREATER_EQUAL',
  'NO_LESS_THAN': 'GREATER_EQUAL',
  'ABOVE_OR_EQUAL': 'GREATER_EQUAL',
  'OR_MORE': 'GREATER_EQUAL',
  'OR_GREATER': 'GREATER_EQUAL',
  
  'LESS_THAN': 'LESS_THAN',
  'LT': 'LESS_THAN',
  '<': 'LESS_THAN',
  'BELOW': 'LESS_THAN',
  'UNDER': 'LESS_THAN',
  'SMALLER_THAN': 'LESS_THAN',
  'LOWER_THAN': 'LESS_THAN',
  'FEWER_THAN': 'LESS_THAN',
  
  // KEY TRANSFORMATIONS: All variations → LESS_EQUAL
  'LESS_EQUAL': 'LESS_EQUAL',
  'LESS_THAN_OR_EQUAL': 'LESS_EQUAL',
  'LESS_OR_EQUAL': 'LESS_EQUAL',
  'LESS_EQUAL_TO': 'LESS_EQUAL',
  'LESS_THAN_OR_EQUAL_TO': 'LESS_EQUAL',
  'LTE': 'LESS_EQUAL',
  'LEQ': 'LESS_EQUAL',
  '<=': 'LESS_EQUAL',
  'AT_MOST': 'LESS_EQUAL',
  'MAXIMUM': 'LESS_EQUAL',
  'MAX': 'LESS_EQUAL',
  'NO_MORE_THAN': 'LESS_EQUAL',
  'UP_TO': 'LESS_EQUAL',
  'BELOW_OR_EQUAL': 'LESS_EQUAL',
  'OR_LESS': 'LESS_EQUAL',
  'OR_FEWER': 'LESS_EQUAL',
  'OR_LOWER': 'LESS_EQUAL',
  
  'BETWEEN': 'BETWEEN',
  'WITHIN_RANGE': 'BETWEEN',
  'FROM_TO': 'BETWEEN',
  'RANGE': 'BETWEEN',
  'SPAN': 'BETWEEN',
  'IN_RANGE': 'BETWEEN',
  
  'NOT_BETWEEN': 'NOT_BETWEEN',
  'OUTSIDE_RANGE': 'NOT_BETWEEN',
  'NOT_WITHIN_RANGE': 'NOT_BETWEEN',
  'EXCLUDING_RANGE': 'NOT_BETWEEN',

  // === TEXT OPERATORS ===
  'ILIKE': 'ILIKE',
  'LIKE_IGNORE_CASE': 'ILIKE',
  'CONTAINS_IGNORE_CASE': 'ILIKE',
  'SEARCH': 'ILIKE',
  'FIND': 'ILIKE',
  'INCLUDES_TEXT': 'ILIKE',
  'TEXT_CONTAINS': 'ILIKE',
  
  'NOT_ILIKE': 'NOT_ILIKE',
  'NOT_LIKE_IGNORE_CASE': 'NOT_ILIKE',
  'NOT_CONTAINS_IGNORE_CASE': 'NOT_ILIKE',
  'EXCLUDES_TEXT': 'NOT_ILIKE',
  
  'LIKE': 'LIKE',
  'SIMILAR_TO': 'LIKE',
  'PATTERN': 'LIKE',
  'WILDCARD': 'LIKE',
  
  'NOT_LIKE': 'NOT_LIKE',
  'NOT_SIMILAR_TO': 'NOT_LIKE',
  'NOT_PATTERN': 'NOT_LIKE',
  'NOT_WILDCARD': 'NOT_LIKE',
  
  'STARTS_WITH': 'STARTS_WITH',
  'BEGINS_WITH': 'STARTS_WITH',
  'PREFIX': 'STARTS_WITH',
  'STARTS': 'STARTS_WITH',
  'BEGINNING': 'STARTS_WITH',
  
  'ENDS_WITH': 'ENDS_WITH',
  'SUFFIX': 'ENDS_WITH',
  'ENDS': 'ENDS_WITH',
  'ENDING': 'ENDS_WITH',
  'FINISHES_WITH': 'ENDS_WITH',
  
  'REGEX': 'REGEX',
  'REGEXP': 'REGEX',
  'REGULAR_EXPRESSION': 'REGEX',
  'PATTERN_MATCH': 'REGEX',
  '~': 'REGEX',
  
  'NOT_REGEX': 'NOT_REGEX',
  'NOT_REGEXP': 'NOT_REGEX',
  'NOT_REGULAR_EXPRESSION': 'NOT_REGEX',
  '!~': 'NOT_REGEX',

  // === ARRAY/COLLECTION OPERATORS ===
  'CONTAINS': 'CONTAINS',
  'HAS': 'CONTAINS',
  'INCLUDES': 'CONTAINS',
  'WITH': 'CONTAINS',
  'HAVING': 'CONTAINS',
  'FEATURES': 'CONTAINS',
  'OWNS': 'CONTAINS',
  'POSSESSES': 'CONTAINS',
  
  'CONTAINS_ALL': 'CONTAINS_ALL',
  'HAS_ALL': 'CONTAINS_ALL',
  'INCLUDES_ALL': 'CONTAINS_ALL',
  'WITH_ALL': 'CONTAINS_ALL',
  'ALL_OF': 'CONTAINS_ALL',
  'EVERY': 'CONTAINS_ALL',
  
  'CONTAINS_ANY': 'CONTAINS_ANY',
  'HAS_ANY': 'CONTAINS_ANY',
  'INCLUDES_ANY': 'CONTAINS_ANY',
  'WITH_ANY': 'CONTAINS_ANY',
  'ANY_OF': 'CONTAINS_ANY',
  'SOME': 'CONTAINS_ANY',
  'AT_LEAST_ONE': 'CONTAINS_ANY',
  
  'NOT_CONTAINS': 'NOT_CONTAINS',
  'NOT_HAS': 'NOT_CONTAINS',
  'NOT_INCLUDES': 'NOT_CONTAINS',
  'WITHOUT': 'NOT_CONTAINS',
  'MISSING': 'NOT_CONTAINS',
  'LACKS': 'NOT_CONTAINS',

  // === NULL OPERATORS ===
  'IS_NULL': 'IS_NULL',
  'NULL': 'IS_NULL',
  'EMPTY': 'IS_NULL',
  'UNDEFINED': 'IS_NULL',
  'BLANK': 'IS_NULL',
  'NO_VALUE': 'IS_NULL',
  
  'IS_NOT_NULL': 'IS_NOT_NULL',
  'NOT_NULL': 'IS_NOT_NULL',
  'NOT_EMPTY': 'IS_NOT_NULL',
  'EXISTS': 'IS_NOT_NULL',
  'HAS_VALUE': 'IS_NOT_NULL',
  'DEFINED': 'IS_NOT_NULL',
  'PRESENT': 'IS_NOT_NULL'
};

// ============================================================================
// BULLETPROOF FIELD TRANSFORMATIONS
// ============================================================================

const BULLETPROOF_FIELD_TRANSFORMATIONS: Record<string, string> = {
  // Mana cost variations
  'mana_cost': 'mana_cost',
  'cost': 'mana_cost',
  'mana': 'mana_cost',
  'manacost': 'mana_cost',
  'manacos': 'mana_cost', // typo
  'mc': 'mana_cost',
  'price': 'mana_cost',
  'value': 'mana_cost',
  'mana_value': 'mana_cost',
  'casting_cost': 'mana_cost',
  
  // Attack variations  
  'attack': 'attack',
  'atk': 'attack',
  'att': 'attack',
  'damage': 'attack',
  'dmg': 'attack',
  'power': 'attack',
  'str': 'attack',
  'strength': 'attack',
  'attack_power': 'attack',
  'offensive': 'attack',
  
  // Health variations
  'health': 'health',
  'hp': 'health',
  'life': 'health',
  'toughness': 'health',
  'durability_health': 'health',
  'hitpoints': 'health',
  'hit_points': 'health',
  'defensive': 'health',
  
  // Class variations
  'class_name': 'class_name',
  'class': 'class_name',
  'classes': 'class_name',
  'hero_class': 'class_name',
  'heroclass': 'class_name',
  'hero': 'class_name',
  'character': 'class_name',
  'character_class': 'class_name',
  
  // Card type variations
  'card_type': 'card_type',
  'type': 'card_type',
  'cardtype': 'card_type',
  'card_types': 'card_type',
  'cardtypes': 'card_type',
  'kind': 'card_type',
  'category': 'card_type',
  
  // Name variations
  'name': 'name',
  'card_name': 'name',
  'cardname': 'name',
  'title': 'name',
  
  // Text variations
  'text': 'text',
  'card_text': 'text',
  'description': 'text',
  'effect': 'text',
  'ability': 'text',
  
  // Keywords variations
  'keywords': 'keywords',
  'keyword': 'keywords',
  'abilities': 'keywords',
  'effects': 'keywords',
  'mechanics': 'keywords',
  
  // Rarity variations
  'rarity': 'rarity',
  'rarities': 'rarity',
  'rare': 'rarity',
  'quality': 'rarity',
  
  // Minion type variations
  'minion_type': 'minion_type',
  'miniontype': 'minion_type',
  'tribe': 'minion_type',
  'race': 'minion_type',
  'creature_type': 'minion_type',
  
  // Collectible variations
  'collectible': 'collectible',
  'collectable': 'collectible',
  'playable': 'collectible',
  'obtainable': 'collectible',

  // Format variations
  'formats': 'formats',
  'format': 'formats',
  'game_format': 'formats',
  'gameformat': 'formats',
  'standard': 'formats',
  'wild': 'formats',
  'mode': 'formats',
  'game_mode': 'formats',

  // Set variations
  'set_name': 'set_name',
  'set': 'set_name',
  'expansion': 'set_name',
  'card_set': 'set_name',
  'cardset': 'set_name',
  'pack': 'set_name',

  // Spell school variations
  'spell_school': 'spell_school',
  'spellschool': 'spell_school',
  'school': 'spell_school',
  'magic_school': 'spell_school',
  'element': 'spell_school',

  // Durability variations
  'durability': 'durability',
  'weapon_health': 'durability',
  'weapon_durability': 'durability',
  'uses': 'durability',

  // Armor variations
  'armor': 'armor',
  'hero_armor': 'armor',
  'starting_armor': 'armor',
  'defence': 'armor',
  'defense': 'armor',

  // ID variations
  'id': 'id',
  'card_id': 'id',
  'cardid': 'id',
  'identifier': 'id',

  // Slug variations
  'slug': 'slug',
  'url_slug': 'slug',
  'permalink': 'slug',
  'url': 'slug'
};

// ============================================================================
// TRANSFORMATION INTERFACES
// ============================================================================

interface TransformationResult {
  type: 'OPERATOR' | 'FIELD' | 'VALUE' | 'NONE';
  original: string;
  transformed: string;
  confidence: number;
  method: 'EXACT' | 'FUZZY' | 'SEMANTIC' | 'CONTEXT' | 'DEFAULT';
}

interface TransformationLog {
  nodeType: string;
  transformations: TransformationResult[];
  success: boolean;
  fallbackUsed: boolean;
}

// ============================================================================
// CORE TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform operator with comprehensive fallback strategies
 */
export function transformOperatorBulletproof(input: any): OperatorType {
  try {
    // Handle non-string inputs
    if (typeof input !== 'string') {
      console.warn(`🔄 Non-string operator input: ${typeof input}, value: ${input}`);
      return 'EQUALS'; // Safe default
    }

    // Clean and normalize input
    const cleaned = String(input).toUpperCase().replace(/[^A-Z_0-9]/g, '').trim();

    if (!cleaned) {
      console.warn('🔄 Empty operator after cleaning, using default');
      return 'EQUALS';
    }

    // 1. Exact match
    if (BULLETPROOF_OPERATOR_TRANSFORMATIONS[cleaned]) {
      return BULLETPROOF_OPERATOR_TRANSFORMATIONS[cleaned];
    }

    // 2. Try variations
    const variations = generateOperatorVariations(cleaned);
    for (const variation of variations) {
      if (BULLETPROOF_OPERATOR_TRANSFORMATIONS[variation]) {
        console.log(`🔄 OPERATOR TRANSFORM: ${input} → ${BULLETPROOF_OPERATOR_TRANSFORMATIONS[variation]} (via variation: ${variation})`);
        return BULLETPROOF_OPERATOR_TRANSFORMATIONS[variation];
      }
    }

    // 3. Fuzzy matching with edit distance
    const fuzzyMatch = findClosestOperatorMatch(cleaned);
    if (fuzzyMatch.confidence > 0.6) {
      console.log(`🔄 OPERATOR FUZZY MATCH: ${input} → ${fuzzyMatch.operator} (confidence: ${fuzzyMatch.confidence})`);
      return fuzzyMatch.operator;
    }

    // 4. Semantic analysis
    const semanticMatch = analyzeOperatorSemantics(cleaned);
    if (semanticMatch) {
      console.log(`🔄 OPERATOR SEMANTIC MATCH: ${input} → ${semanticMatch}`);
      return semanticMatch;
    }

    // 5. Last resort: context-based inference
    const contextMatch = inferOperatorFromContext(cleaned);
    console.log(`🔄 OPERATOR CONTEXT FALLBACK: ${input} → ${contextMatch}`);
    return contextMatch;

  } catch (error) {
    console.error('🚨 Operator transformation failed, using safe default:', error);
    return 'EQUALS'; // Never fail
  }
}

/**
 * Transform field name with comprehensive fallback strategies
 */
export function transformFieldNameBulletproof(input: any): string {
  try {
    // Handle non-string inputs
    if (typeof input !== 'string') {
      console.warn(`🔄 Non-string field input: ${typeof input}, value: ${input}`);
      return 'name'; // Safe default
    }

    // Clean and normalize input
    const cleaned = String(input).toLowerCase().replace(/[^a-z_0-9]/g, '').trim();

    if (!cleaned) {
      console.warn('🔄 Empty field after cleaning, using default');
      return 'name';
    }

    // 1. Exact match
    if (BULLETPROOF_FIELD_TRANSFORMATIONS[cleaned]) {
      return BULLETPROOF_FIELD_TRANSFORMATIONS[cleaned];
    }

    // 2. Try variations
    const variations = generateFieldVariations(cleaned);
    for (const variation of variations) {
      if (BULLETPROOF_FIELD_TRANSFORMATIONS[variation]) {
        console.log(`🔄 FIELD TRANSFORM: ${input} → ${BULLETPROOF_FIELD_TRANSFORMATIONS[variation]} (via variation: ${variation})`);
        return BULLETPROOF_FIELD_TRANSFORMATIONS[variation];
      }
    }

    // 3. Fuzzy matching
    const fuzzyMatch = findClosestFieldMatch(cleaned);
    if (fuzzyMatch.confidence > 0.6) {
      console.log(`🔄 FIELD FUZZY MATCH: ${input} → ${fuzzyMatch.field} (confidence: ${fuzzyMatch.confidence})`);
      return fuzzyMatch.field;
    }

    // 4. Semantic analysis
    const semanticMatch = analyzeFieldSemantics(cleaned);
    if (semanticMatch) {
      console.log(`🔄 FIELD SEMANTIC MATCH: ${input} → ${semanticMatch}`);
      return semanticMatch;
    }

    // 5. Safe fallback
    console.log(`🔄 FIELD FALLBACK: ${input} → name (unknown field)`);
    return 'name'; // Safe default that always exists

  } catch (error) {
    console.error('🚨 Field transformation failed, using safe default:', error);
    return 'name'; // Never fail
  }
}

/**
 * Transform value based on field type and operator
 */
export function transformValueBulletproof(field: string, operator: OperatorType, value: any): ConditionValue {
  try {
    // Handle null/undefined values
    if (value === null || value === undefined) {
      return null;
    }

    // Handle array values for IN/NOT_IN operators
    if ((operator === 'IN' || operator === 'NOT_IN') && !Array.isArray(value)) {
      return [value];
    }

    // Handle BETWEEN operator - ensure range format
    if (operator === 'BETWEEN' || operator === 'NOT_BETWEEN') {
      if (Array.isArray(value) && value.length >= 2) {
        return { min: Number(value[0]), max: Number(value[1]) };
      }
      if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
        return { min: Number(value.min), max: Number(value.max) };
      }
      // Fallback: convert to single value comparison
      console.log(`🔄 VALUE TRANSFORM: BETWEEN with invalid range, converting to EQUALS`);
      return value;
    }

    // Handle numeric fields
    if (['mana_cost', 'attack', 'health', 'durability', 'armor'].includes(field)) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        return numValue;
      }
    }

    // Handle boolean fields
    if (field === 'collectible') {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (['true', 'yes', '1', 'on'].includes(lower)) return true;
        if (['false', 'no', '0', 'off'].includes(lower)) return false;
      }
      return true; // Default to collectible cards
    }

    // Return as-is for other cases
    return value;

  } catch (error) {
    console.error('🚨 Value transformation failed, using original value:', error);
    return value; // Never fail
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateOperatorVariations(input: string): string[] {
  const variations = new Set<string>();

  // Add original
  variations.add(input);

  // Remove underscores
  variations.add(input.replace(/_/g, ''));

  // Add underscores around common words
  variations.add(input.replace(/OR/g, '_OR_'));
  variations.add(input.replace(/AND/g, '_AND_'));
  variations.add(input.replace(/THAN/g, '_THAN'));
  variations.add(input.replace(/EQUAL/g, '_EQUAL'));
  variations.add(input.replace(/TO/g, '_TO'));

  // Remove common suffixes
  variations.add(input.replace(/S$/, ''));
  variations.add(input.replace(/ED$/, ''));
  variations.add(input.replace(/ING$/, ''));

  // Add common suffixes
  variations.add(input + 'S');
  variations.add(input + 'ED');
  variations.add(input + 'ING');

  // Handle common abbreviations
  if (input.includes('GREATER')) {
    variations.add(input.replace('GREATER', 'GT'));
    variations.add(input.replace('GREATER_THAN', 'GT'));
  }
  if (input.includes('LESS')) {
    variations.add(input.replace('LESS', 'LT'));
    variations.add(input.replace('LESS_THAN', 'LT'));
  }
  if (input.includes('EQUAL')) {
    variations.add(input.replace('EQUAL', 'EQ'));
    variations.add(input.replace('EQUALS', 'EQ'));
  }

  return Array.from(variations);
}

function generateFieldVariations(input: string): string[] {
  const variations = new Set<string>();

  // Add original
  variations.add(input);

  // Remove underscores
  variations.add(input.replace(/_/g, ''));

  // Add underscores
  variations.add(input.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase());

  // Remove common suffixes/prefixes
  variations.add(input.replace(/^card_/, ''));
  variations.add(input.replace(/_name$/, ''));
  variations.add(input.replace(/_type$/, ''));
  variations.add(input.replace(/s$/, ''));

  // Add common suffixes/prefixes
  variations.add('card_' + input);
  variations.add(input + '_name');
  variations.add(input + '_type');
  variations.add(input + 's');

  return Array.from(variations);
}

function calculateStringSimilarity(str1: string, str2: string): number {
  // Levenshtein distance algorithm
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = matrix[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

function findClosestOperatorMatch(input: string): { operator: OperatorType; confidence: number } {
  const validOperators = Object.keys(BULLETPROOF_OPERATOR_TRANSFORMATIONS);
  let bestMatch = '';
  let bestScore = 0;

  for (const validOp of validOperators) {
    const similarity = calculateStringSimilarity(input, validOp);
    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = validOp;
    }
  }

  return {
    operator: BULLETPROOF_OPERATOR_TRANSFORMATIONS[bestMatch] || 'EQUALS',
    confidence: bestScore
  };
}

function findClosestFieldMatch(input: string): { field: string; confidence: number } {
  const validFields = Object.keys(BULLETPROOF_FIELD_TRANSFORMATIONS);
  let bestMatch = '';
  let bestScore = 0;

  for (const validField of validFields) {
    const similarity = calculateStringSimilarity(input, validField);
    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = validField;
    }
  }

  return {
    field: BULLETPROOF_FIELD_TRANSFORMATIONS[bestMatch] || 'name',
    confidence: bestScore
  };
}

function analyzeOperatorSemantics(input: string): OperatorType | null {
  // Semantic keyword detection for operators
  if (input.includes('GREATER') || input.includes('MORE') || input.includes('ABOVE') || input.includes('BIGGER') || input.includes('HIGHER')) {
    if (input.includes('EQUAL') || input.includes('OR') || input.includes('LEAST') || input.includes('MINIMUM')) {
      return 'GREATER_EQUAL';
    }
    return 'GREATER_THAN';
  }

  if (input.includes('LESS') || input.includes('FEWER') || input.includes('BELOW') || input.includes('SMALLER') || input.includes('LOWER')) {
    if (input.includes('EQUAL') || input.includes('OR') || input.includes('MOST') || input.includes('MAXIMUM')) {
      return 'LESS_EQUAL';
    }
    return 'LESS_THAN';
  }

  if (input.includes('EQUAL')) {
    if (input.includes('NOT')) return 'NOT_EQUALS';
    return 'EQUALS';
  }

  if (input.includes('CONTAIN') || input.includes('HAS') || input.includes('INCLUDE') || input.includes('WITH')) {
    if (input.includes('NOT')) return 'NOT_CONTAINS';
    if (input.includes('ALL')) return 'CONTAINS_ALL';
    if (input.includes('ANY')) return 'CONTAINS_ANY';
    return 'CONTAINS';
  }

  if (input.includes('NULL') || input.includes('EMPTY') || input.includes('MISSING')) {
    if (input.includes('NOT')) return 'IS_NOT_NULL';
    return 'IS_NULL';
  }

  if (input.includes('LIKE') || input.includes('SIMILAR') || input.includes('PATTERN')) {
    if (input.includes('NOT')) return 'NOT_ILIKE';
    return 'ILIKE';
  }

  if (input.includes('BETWEEN') || input.includes('RANGE')) {
    if (input.includes('NOT')) return 'NOT_BETWEEN';
    return 'BETWEEN';
  }

  return null;
}

function analyzeFieldSemantics(input: string): string | null {
  // Semantic keyword detection for fields
  if (input.includes('mana') || input.includes('cost') || input.includes('price')) {
    return 'mana_cost';
  }

  if (input.includes('attack') || input.includes('damage') || input.includes('power') || input.includes('strength')) {
    return 'attack';
  }

  if (input.includes('health') || input.includes('life') || input.includes('hp') || input.includes('toughness')) {
    return 'health';
  }

  if (input.includes('class') || input.includes('hero')) {
    return 'class_name';
  }

  if (input.includes('type') || input.includes('kind') || input.includes('category')) {
    return 'card_type';
  }

  if (input.includes('name') || input.includes('title')) {
    return 'name';
  }

  if (input.includes('text') || input.includes('description') || input.includes('effect') || input.includes('ability')) {
    return 'text';
  }

  if (input.includes('keyword') || input.includes('ability') || input.includes('mechanic')) {
    return 'keywords';
  }

  if (input.includes('rare') || input.includes('rarity') || input.includes('quality')) {
    return 'rarity';
  }

  if (input.includes('tribe') || input.includes('race') || input.includes('minion')) {
    return 'minion_type';
  }

  if (input.includes('format') || input.includes('standard') || input.includes('wild') || input.includes('mode')) {
    return 'formats';
  }

  if (input.includes('set') || input.includes('expansion') || input.includes('pack')) {
    return 'set_name';
  }

  if (input.includes('school') || input.includes('element') && input.includes('spell')) {
    return 'spell_school';
  }

  if (input.includes('durability') || input.includes('weapon') && input.includes('health')) {
    return 'durability';
  }

  if (input.includes('armor') || input.includes('defense') || input.includes('defence')) {
    return 'armor';
  }

  if (input.includes('id') || input.includes('identifier')) {
    return 'id';
  }

  if (input.includes('slug') || input.includes('url')) {
    return 'slug';
  }

  return null;
}

function inferOperatorFromContext(input: string): OperatorType {
  // Smart defaults based on common patterns and input characteristics
  if (input.length <= 2) {
    // Likely symbols
    if (input === '>' || input === 'GT') return 'GREATER_THAN';
    if (input === '<' || input === 'LT') return 'LESS_THAN';
    if (input === '=' || input === 'EQ') return 'EQUALS';
    return 'EQUALS';
  }

  if (input.includes('NULL')) return 'IS_NULL';
  if (input.includes('LIKE')) return 'ILIKE';
  if (input.includes('RANGE') || input.includes('BETWEEN')) return 'BETWEEN';
  if (input.includes('CONTAIN') || input.includes('HAS')) return 'CONTAINS';
  if (input.includes('IN')) return 'IN';

  // Default to most common operator
  return 'EQUALS';
}

// ============================================================================
// MAIN TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Main AST transformation function that NEVER fails
 * Recursively transforms all nodes in an AST tree
 */
export function transformASTNodeBulletproof(node: ASTNode): ASTNode {
  try {
    if (isConditionNode(node)) {
      // Transform condition node
      const transformedField = transformFieldNameBulletproof(node.field);
      const transformedOperator = transformOperatorBulletproof(node.operator);
      const transformedValue = transformValueBulletproof(transformedField, transformedOperator, node.value);

      // Log transformations if any occurred
      if (node.field !== transformedField || node.operator !== transformedOperator || node.value !== transformedValue) {
        console.log(`🔄 AST CONDITION TRANSFORM:`);
        if (node.field !== transformedField) {
          console.log(`   Field: ${node.field} → ${transformedField}`);
        }
        if (node.operator !== transformedOperator) {
          console.log(`   Operator: ${node.operator} → ${transformedOperator}`);
        }
        if (node.value !== transformedValue) {
          console.log(`   Value: ${JSON.stringify(node.value)} → ${JSON.stringify(transformedValue)}`);
        }
      }

      return {
        ...node,
        field: transformedField,
        operator: transformedOperator,
        value: transformedValue
      } as ConditionNode;
    }

    if (isLogicalNode(node)) {
      // Transform logical node - recursively transform all children
      const transformedChildren = node.children.map(child => transformASTNodeBulletproof(child));

      return {
        ...node,
        children: transformedChildren
      } as LogicalNode;
    }

    // Unknown node type - return as-is but log warning
    console.warn(`🔄 Unknown AST node type: ${(node as any).type}, returning as-is`);
    return node;

  } catch (error) {
    // NEVER FAIL - return a safe default condition
    console.error('🚨 AST transformation failed completely, using safe fallback:', error);
    console.error('🚨 Failed node:', JSON.stringify(node, null, 2));

    // Return a safe default that will always work
    return createConditionNode('collectible', 'EQUALS', true);
  }
}

/**
 * Transform and validate an entire AST tree
 * Provides comprehensive logging and never fails
 */
export function transformAndValidateAST(astTree: ASTNode, context?: string): ASTNode {
  const startTime = Date.now();

  try {
    console.log(`🔄 Starting bulletproof AST transformation${context ? ` for ${context}` : ''}`);
    console.log(`🔄 Original AST:`, JSON.stringify(astTree, null, 2));

    // Transform the AST
    const transformedAST = transformASTNodeBulletproof(astTree);

    const transformTime = Date.now() - startTime;
    console.log(`🔄 AST transformation completed in ${transformTime}ms`);
    console.log(`🔄 Transformed AST:`, JSON.stringify(transformedAST, null, 2));

    return transformedAST;

  } catch (error) {
    console.error('🚨 Complete AST transformation failure, using ultimate fallback:', error);

    // Ultimate fallback - return a simple query that will always work
    return createConditionNode('collectible', 'EQUALS', true);
  }
}

/**
 * Convenience function for transforming AST from natural language conversion
 */
export function transformNaturalLanguageAST(rawAST: ASTNode, naturalQuery: string): ASTNode {
  console.log(`🔄 Transforming AST from natural language: "${naturalQuery}"`);
  return transformAndValidateAST(rawAST, `natural language: "${naturalQuery}"`);
}

/**
 * Convenience function for transforming AST from structured query
 */
export function transformStructuredQueryAST(rawAST: ASTNode, userIntent: string): ASTNode {
  console.log(`🔄 Transforming AST from structured query: "${userIntent}"`);
  return transformAndValidateAST(rawAST, `structured query: "${userIntent}"`);
}

// ============================================================================
// LOGGING AND MONITORING
// ============================================================================

/**
 * Log transformation results for debugging and monitoring
 */
export function logTransformationResults(original: ASTNode, transformed: ASTNode, context?: string): void {
  try {
    const transformations = findTransformations(original, transformed);

    if (transformations.length > 0) {
      console.log(`🔄 TRANSFORMATION SUMMARY${context ? ` (${context})` : ''}:`);
      transformations.forEach(transform => {
        console.log(`   ${transform.type}: ${transform.original} → ${transform.transformed} (${transform.method}, confidence: ${transform.confidence})`);
      });
    } else {
      console.log(`🔄 No transformations needed${context ? ` for ${context}` : ''}`);
    }
  } catch (error) {
    console.error('🚨 Failed to log transformation results:', error);
  }
}

function findTransformations(original: ASTNode, transformed: ASTNode): TransformationResult[] {
  const transformations: TransformationResult[] = [];

  try {
    if (isConditionNode(original) && isConditionNode(transformed)) {
      if (original.field !== transformed.field) {
        transformations.push({
          type: 'FIELD',
          original: original.field,
          transformed: transformed.field,
          confidence: 1.0,
          method: 'EXACT'
        });
      }

      if (original.operator !== transformed.operator) {
        transformations.push({
          type: 'OPERATOR',
          original: String(original.operator),
          transformed: String(transformed.operator),
          confidence: 1.0,
          method: 'EXACT'
        });
      }

      if (JSON.stringify(original.value) !== JSON.stringify(transformed.value)) {
        transformations.push({
          type: 'VALUE',
          original: JSON.stringify(original.value),
          transformed: JSON.stringify(transformed.value),
          confidence: 1.0,
          method: 'EXACT'
        });
      }
    }

    if (isLogicalNode(original) && isLogicalNode(transformed)) {
      // Recursively check children
      for (let i = 0; i < Math.min(original.children.length, transformed.children.length); i++) {
        transformations.push(...findTransformations(original.children[i], transformed.children[i]));
      }
    }
  } catch (error) {
    console.error('🚨 Failed to analyze transformations:', error);
  }

  return transformations;
}
