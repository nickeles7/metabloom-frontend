/**
 * QueryMaster Schema Configuration
 * Authoritative schema mappings and valid values extracted from db_sql.md analysis
 * Enhanced with AST compilation support for deterministic query building
 */

import {
  OperatorType,
  OperatorDefinition,
  SQLFragment,
  ConditionValue
} from './ast-types';

// Core interface for schema mapping definitions
export interface SchemaMapping {
  table: string;
  alias: string;
  joinOn: string;
  nameField: string;
  validValues?: string[];
  idMapping?: Record<number, string>;
  additionalFields?: string[];
}

// Schema mappings based on db_sql.md analysis
export const SCHEMA_MAPPINGS: Record<string, SchemaMapping> = {
  classes: {
    table: 'classes',
    alias: 'cl',
    joinOn: 'c.class_id = cl.id',
    nameField: 'cl.name',
    validValues: [
      'Death Knight', 'Druid', 'Hunter', 'Mage', 'Paladin', 
      'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior', 
      'Neutral', 'Demon Hunter'
    ],
    idMapping: {
      1: 'Mage', 2: 'Paladin', 3: 'Hunter', 4: 'Rogue',
      5: 'Priest', 6: 'Shaman', 7: 'Warlock', 8: 'Warrior',
      9: 'Druid', 10: 'Demon Hunter', 12: 'Neutral'
    }
  },

  rarities: {
    table: 'rarities',
    alias: 'r',
    joinOn: 'c.rarity_id = r.id',
    nameField: 'r.name',
    validValues: ['Common', 'Core', 'Rare', 'Epic', 'Legendary'],
    idMapping: { 
      1: 'Common', 2: 'Core', 3: 'Rare', 4: 'Epic', 5: 'Legendary' 
    },
    additionalFields: ['r.dust_value', 'r.crafting_cost']
  },

  cardTypes: {
    table: 'card_types',
    alias: 'ct',
    joinOn: 'c.card_type_id = ct.id',
    nameField: 'ct.name',
    validValues: [
      'Hero', 'Minion', 'Spell', 'Weapon', 'HeroPower', 
      'Location', 'Reward', 'Trinket'
    ],
    idMapping: { 
      3: 'Hero', 4: 'Minion', 5: 'Spell', 7: 'Weapon', 
      10: 'HeroPower', 39: 'Location', 40: 'Reward', 44: 'Trinket' 
    }
  },

  minionTypes: {
    table: 'minion_types',
    alias: 'mt',
    joinOn: 'c.minion_type_id = mt.id',
    nameField: 'mt.name',
    validValues: [
      'All', 'Beast', 'Demon', 'Draenei', 'Dragon', 'Elemental', 
      'Mech', 'Murloc', 'Naga', 'Pirate', 'Quilboar', 'Totem', 'Undead'
    ],
    idMapping: { 
      26: 'All', 20: 'Beast', 15: 'Demon', 2: 'Draenei', 24: 'Dragon', 
      18: 'Elemental', 17: 'Mech', 14: 'Murloc', 92: 'Naga', 23: 'Pirate', 
      43: 'Quilboar', 21: 'Totem', 11: 'Undead' 
    }
  },

  spellSchools: {
    table: 'spell_schools',
    alias: 'ss',
    joinOn: 'c.spell_school_id = ss.id',
    nameField: 'ss.name',
    validValues: [
      'Arcane', 'Fire', 'Frost', 'Nature', 'Holy', 'Shadow', 
      'Fel', 'Lesser', 'Greater'
    ],
    idMapping: { 
      1: 'Arcane', 2: 'Fire', 3: 'Frost', 4: 'Nature', 5: 'Holy', 
      6: 'Shadow', 7: 'Fel', 11: 'Lesser', 12: 'Greater' 
    }
  },

  sets: {
    table: 'sets',
    alias: 's',
    joinOn: 'c.card_set_id = s.id',
    nameField: 's.name',
    additionalFields: ['s.type', 's.collectible_count', 's.collectible_revealed_count']
  },

  keywords: {
    table: 'keywords',
    alias: 'k',
    joinOn: 'ck.keyword_id = k.id',
    nameField: 'k.name',
    validValues: [
      'Adapt', 'Avenge (X)', 'Battlecry', 'Blood Gem', 'Buddy', 'Charge',
      'Colossal +X', 'Combo', 'Corpse', 'Corrupt', 'Counter', 'Dark Gift',
      'Deathrattle', 'Discover', 'Divine Shield', 'Dredge', 'Echo', 'Elusive',
      'Excavate', 'Finale', 'Forge', 'Freeze', 'Frenzy', 'Honorable Kill',
      'Imbue', 'Immune', 'Infuse', 'Inspire', 'Invoke', 'Lackey', 'Lifesteal',
      'Magnetic', 'Manathirst (X)', 'Mega-Windfury', 'Mini', 'Miniaturize',
      'Nature Spell Damage', 'Outcast', 'Overheal', 'Overkill', 'Overload: X',
      'Pass', 'Poisonous', 'Quest', 'Questline', 'Quickdraw', 'Reborn',
      'Recruit', 'Refresh', 'Rush', 'Secret', 'Sidequest', 'Silence',
      'Spare Parts', 'Spell Damage', 'Spellburst', 'Spellcraft', 'Starship',
      'Start of Game', 'Stealth', 'Taunt', 'Temporary', 'Titan', 'Tradeable',
      'Twinspell', 'Venomous', 'Windfury'
    ]
  },

  formats: {
    table: 'card_formats',
    alias: 'cf',
    joinOn: 'c.id = cf.card_id',
    nameField: 'cf.format',
    validValues: ['standard', 'wild']
  }
};

// ============================================================================
// AST ENHANCED SCHEMA CONFIGURATION
// ============================================================================

/**
 * Enhanced field definition for AST compilation support
 */
export interface EnhancedFieldDefinition {
  /** SQL expression for this field */
  sqlExpression: string;
  /** Data type of this field */
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'date' | 'json';
  /** Operators supported for this field */
  supportedOperators: OperatorType[];
  /** Tables that must be joined to access this field */
  requiredJoins: string[];
  /** Whether this field requires aggregation (GROUP BY) */
  requiresAggregation: boolean;
  /** Valid values for this field (for validation) */
  validValues?: string[] | number[];
  /** Validation rules for this field */
  validation?: FieldValidationRules;
  /** Performance hints for this field */
  performanceHints?: string[];
  /** Whether this field can be used in ORDER BY */
  sortable: boolean;
  /** Field description for debugging */
  description?: string;
}

/**
 * Field validation rules
 */
export interface FieldValidationRules {
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Minimum length (for strings/arrays) */
  minLength?: number;
  /** Maximum length (for strings/arrays) */
  maxLength?: number;
  /** Regex pattern (for strings) */
  pattern?: string;
  /** Custom validation function */
  customValidator?: (value: ConditionValue) => boolean;
}

/**
 * Join requirement definition
 */
export interface JoinRequirement {
  /** Table to join */
  table: string;
  /** Table alias */
  alias: string;
  /** JOIN condition */
  condition: string;
  /** JOIN type */
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  /** Whether this join is optional */
  optional: boolean;
  /** Dependencies (other joins that must be included first) */
  dependencies: string[];
}

// ============================================================================
// OPERATOR DEFINITIONS FOR AST COMPILATION
// ============================================================================

/**
 * Complete operator definitions for SQL generation
 */
export const OPERATOR_DEFINITIONS: Record<OperatorType, OperatorDefinition> = {
  // Equality operators
  EQUALS: {
    sqlTemplate: '= %s',
    parameterCount: 1
  },
  NOT_EQUALS: {
    sqlTemplate: '!= %s',
    parameterCount: 1
  },
  IN: {
    sqlTemplate: 'IN (%s)',
    parameterCount: 'array',
    valueTransform: (value: ConditionValue) => {
      const arr = Array.isArray(value) ? value : [value];
      // CRITICAL FIX: Return individual parameters, not a malformed string + parameters
      return arr;
    }
  },
  NOT_IN: {
    sqlTemplate: 'NOT IN (%s)',
    parameterCount: 'array',
    valueTransform: (value: ConditionValue) => {
      const arr = Array.isArray(value) ? value : [value];
      // CRITICAL FIX: Return individual parameters, not a malformed string + parameters
      return arr;
    }
  },

  // Comparison operators
  GREATER_THAN: {
    sqlTemplate: '> %s',
    parameterCount: 1
  },
  GREATER_EQUAL: {
    sqlTemplate: '>= %s',
    parameterCount: 1
  },
  LESS_THAN: {
    sqlTemplate: '< %s',
    parameterCount: 1
  },
  LESS_EQUAL: {
    sqlTemplate: '<= %s',
    parameterCount: 1
  },
  BETWEEN: {
    sqlTemplate: 'BETWEEN %s AND %s',
    parameterCount: 2,
    valueTransform: (value: ConditionValue) => {
      if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
        return [value.min, value.max];
      }
      throw new Error('BETWEEN operator requires RangeValue with min and max');
    }
  },
  NOT_BETWEEN: {
    sqlTemplate: 'NOT BETWEEN %s AND %s',
    parameterCount: 2,
    valueTransform: (value: ConditionValue) => {
      if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
        return [value.min, value.max];
      }
      throw new Error('NOT_BETWEEN operator requires RangeValue with min and max');
    }
  },

  // Text operators
  ILIKE: {
    sqlTemplate: 'ILIKE %s',
    parameterCount: 1,
    valueTransform: (value: ConditionValue) => [`%${value}%`]
  },
  NOT_ILIKE: {
    sqlTemplate: 'NOT ILIKE %s',
    parameterCount: 1,
    valueTransform: (value: ConditionValue) => [`%${value}%`]
  },
  LIKE: {
    sqlTemplate: 'LIKE %s',
    parameterCount: 1,
    valueTransform: (value: ConditionValue) => [`%${value}%`]
  },
  NOT_LIKE: {
    sqlTemplate: 'NOT LIKE %s',
    parameterCount: 1,
    valueTransform: (value: ConditionValue) => [`%${value}%`]
  },
  STARTS_WITH: {
    sqlTemplate: 'ILIKE %s',
    parameterCount: 1,
    valueTransform: (value: ConditionValue) => [`${value}%`]
  },
  ENDS_WITH: {
    sqlTemplate: 'ILIKE %s',
    parameterCount: 1,
    valueTransform: (value: ConditionValue) => [`%${value}`]
  },
  REGEX: {
    sqlTemplate: '~ %s',
    parameterCount: 1,
    valueTransform: (value: ConditionValue) => {
      if (typeof value === 'object' && value !== null && 'pattern' in value) {
        return [value.pattern];
      }
      return [value as string];
    }
  },
  NOT_REGEX: {
    sqlTemplate: '!~ %s',
    parameterCount: 1,
    valueTransform: (value: ConditionValue) => {
      if (typeof value === 'object' && value !== null && 'pattern' in value) {
        return [value.pattern];
      }
      return [value as string];
    }
  },

  // Array/Collection operators (require custom SQL generation)
  CONTAINS: {
    sqlTemplate: '', // Custom generation required
    parameterCount: 1,
    requiresSubquery: true,
    customSqlGenerator: (field: string, value: ConditionValue): SQLFragment => {
      if (field === 'keywords') {
        return {
          sql: 'EXISTS (SELECT 1 FROM card_keywords ck JOIN keywords k ON ck.keyword_id = k.id WHERE ck.card_id = c.id AND k.name = %s)',
          parameters: [value],
          requiredJoins: []
        };
      }
      if (field === 'formats') {
        return {
          sql: 'EXISTS (SELECT 1 FROM card_formats cf WHERE cf.card_id = c.id AND cf.format = %s)',
          parameters: [value],
          requiredJoins: []
        };
      }
      // Default array contains logic
      return {
        sql: `${field} @> ARRAY[%s]`,
        parameters: [value],
        requiredJoins: []
      };
    }
  },
  CONTAINS_ALL: {
    sqlTemplate: '', // Custom generation required
    parameterCount: 'array',
    requiresSubquery: true,
    customSqlGenerator: (field: string, value: ConditionValue): SQLFragment => {
      const arr = Array.isArray(value) ? value : [value];
      if (field === 'keywords') {
        const conditions = arr.map(() =>
          'EXISTS (SELECT 1 FROM card_keywords ck JOIN keywords k ON ck.keyword_id = k.id WHERE ck.card_id = c.id AND k.name = %s)'
        ).join(' AND ');
        return {
          sql: conditions,
          parameters: arr,
          requiredJoins: []
        };
      }
      if (field === 'formats') {
        const conditions = arr.map(() =>
          'EXISTS (SELECT 1 FROM card_formats cf WHERE cf.card_id = c.id AND cf.format = %s)'
        ).join(' AND ');
        return {
          sql: conditions,
          parameters: arr,
          requiredJoins: []
        };
      }
      return {
        sql: `${field} @> ARRAY[${arr.map(() => '%s').join(', ')}]`,
        parameters: arr,
        requiredJoins: []
      };
    }
  },
  CONTAINS_ANY: {
    sqlTemplate: '', // Custom generation required
    parameterCount: 'array',
    requiresSubquery: true,
    customSqlGenerator: (field: string, value: ConditionValue): SQLFragment => {
      const arr = Array.isArray(value) ? value : [value];
      if (field === 'keywords') {
        return {
          sql: 'EXISTS (SELECT 1 FROM card_keywords ck JOIN keywords k ON ck.keyword_id = k.id WHERE ck.card_id = c.id AND k.name IN (%s))',
          parameters: [arr.map(() => '%s').join(', '), ...arr],
          requiredJoins: []
        };
      }
      if (field === 'formats') {
        const placeholders = arr.map(() => '%s').join(', ');
        return {
          sql: `EXISTS (SELECT 1 FROM card_formats cf WHERE cf.card_id = c.id AND cf.format IN (${placeholders}))`,
          parameters: arr,
          requiredJoins: []
        };
      }
      return {
        sql: `${field} && ARRAY[${arr.map(() => '%s').join(', ')}]`,
        parameters: arr,
        requiredJoins: []
      };
    }
  },
  NOT_CONTAINS: {
    sqlTemplate: '', // Custom generation required
    parameterCount: 1,
    requiresSubquery: true,
    customSqlGenerator: (field: string, value: ConditionValue): SQLFragment => {
      if (field === 'keywords') {
        return {
          sql: 'NOT EXISTS (SELECT 1 FROM card_keywords ck JOIN keywords k ON ck.keyword_id = k.id WHERE ck.card_id = c.id AND k.name = %s)',
          parameters: [value],
          requiredJoins: []
        };
      }
      return {
        sql: `NOT (${field} @> ARRAY[%s])`,
        parameters: [value],
        requiredJoins: []
      };
    }
  },

  // Null operators
  IS_NULL: {
    sqlTemplate: 'IS NULL',
    parameterCount: 0
  },
  IS_NOT_NULL: {
    sqlTemplate: 'IS NOT NULL',
    parameterCount: 0
  }
};

// Field mappings: logical user fields → SQL expressions (LEGACY - maintained for compatibility)
export const FIELD_MAPPINGS: Record<string, string> = {
  // Basic card fields
  id: 'c.id',
  name: 'c.name',
  slug: 'c.slug',
  mana_cost: 'c.mana_cost',
  attack: 'c.attack',
  health: 'c.health',
  durability: 'c.durability',
  armor: 'c.armor',
  text: 'c.text',
  flavor_text: 'c.flavor_text',
  image_url: 'c.image_url',
  crop_image_url: 'c.crop_image_url',
  collectible: 'c.collectible',

  // Joined reference fields
  class_name: 'cl.name',
  card_type: 'ct.name',
  rarity: 'r.name',
  minion_type: 'mt.name',
  spell_school: 'ss.name',
  set_name: 's.name',
  set_type: 's.type',

  // Additional reference fields
  dust_value: 'r.dust_value',
  crafting_cost: 'r.crafting_cost',
  collectible_count: 's.collectible_count',

  // Aggregated fields (require special handling)
  keywords: 'array_agg(DISTINCT k.name) FILTER (WHERE k.name IS NOT NULL)',
  formats: 'array_agg(DISTINCT cf.format)',

  // Special Zilliax fields
  is_zilliax_functional_module: 'c.is_zilliax_functional_module',
  is_zilliax_cosmetic_module: 'c.is_zilliax_cosmetic_module',

  // Metadata and timestamps
  metadata: 'c.metadata',
  created_at: 'c.created_at'
};

// ============================================================================
// ENHANCED FIELD MAPPINGS FOR AST COMPILATION
// ============================================================================

/**
 * Enhanced field definitions with AST compilation support
 */
export const ENHANCED_FIELD_MAPPINGS: Record<string, EnhancedFieldDefinition> = {
  // Basic card fields
  id: {
    sqlExpression: 'c.id',
    dataType: 'number',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { min: 1 },
    sortable: true,
    description: 'Unique card identifier'
  },

  name: {
    sqlExpression: 'c.name',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'ILIKE', 'NOT_ILIKE', 'LIKE', 'NOT_LIKE', 'STARTS_WITH', 'ENDS_WITH'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { minLength: 1, maxLength: 100 },
    sortable: true,
    description: 'Card name'
  },

  slug: {
    sqlExpression: 'c.slug',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'ILIKE', 'NOT_ILIKE', 'LIKE', 'NOT_LIKE', 'STARTS_WITH', 'ENDS_WITH'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { minLength: 1, maxLength: 100 },
    sortable: true,
    description: 'Card URL slug identifier'
  },

  mana_cost: {
    sqlExpression: 'c.mana_cost',
    dataType: 'number',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL', 'BETWEEN', 'NOT_BETWEEN'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { min: 0, max: 20 },
    sortable: true,
    performanceHints: ['Primary sorting field', 'Well-indexed'],
    description: 'Mana cost to play the card'
  },

  attack: {
    sqlExpression: 'c.attack',
    dataType: 'number',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL', 'BETWEEN', 'NOT_BETWEEN', 'IS_NULL', 'IS_NOT_NULL'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { min: 0, max: 50 },
    sortable: true,
    description: 'Attack value for minions and weapons'
  },

  health: {
    sqlExpression: 'c.health',
    dataType: 'number',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL', 'BETWEEN', 'NOT_BETWEEN', 'IS_NULL', 'IS_NOT_NULL'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { min: 1, max: 100 },
    sortable: true,
    description: 'Health value for minions'
  },

  durability: {
    sqlExpression: 'c.durability',
    dataType: 'number',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL', 'BETWEEN', 'NOT_BETWEEN', 'IS_NULL', 'IS_NOT_NULL'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { min: 1, max: 10 },
    sortable: true,
    description: 'Durability value for weapons'
  },

  armor: {
    sqlExpression: 'c.armor',
    dataType: 'number',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL', 'BETWEEN', 'NOT_BETWEEN', 'IS_NULL', 'IS_NOT_NULL'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { min: 1, max: 20 },
    sortable: true,
    description: 'Armor value for heroes'
  },

  text: {
    sqlExpression: 'c.text',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'ILIKE', 'NOT_ILIKE', 'LIKE', 'NOT_LIKE', 'STARTS_WITH', 'ENDS_WITH', 'REGEX', 'NOT_REGEX', 'IS_NULL', 'IS_NOT_NULL'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { maxLength: 1000 },
    sortable: false,
    performanceHints: ['Text search can be slow', 'Consider combining with other filters'],
    description: 'Card effect text'
  },

  flavor_text: {
    sqlExpression: 'c.flavor_text',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'ILIKE', 'NOT_ILIKE', 'LIKE', 'NOT_LIKE', 'STARTS_WITH', 'ENDS_WITH', 'REGEX', 'NOT_REGEX', 'IS_NULL', 'IS_NOT_NULL'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { maxLength: 500 },
    sortable: false,
    description: 'Card flavor text'
  },

  image_url: {
    sqlExpression: 'c.image_url',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'ILIKE', 'NOT_ILIKE', 'LIKE', 'NOT_LIKE', 'STARTS_WITH', 'ENDS_WITH', 'IS_NULL', 'IS_NOT_NULL'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { maxLength: 500 },
    sortable: false,
    description: 'Card image URL'
  },

  crop_image_url: {
    sqlExpression: 'c.crop_image_url',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'ILIKE', 'NOT_ILIKE', 'LIKE', 'NOT_LIKE', 'STARTS_WITH', 'ENDS_WITH', 'IS_NULL', 'IS_NOT_NULL'],
    requiredJoins: [],
    requiresAggregation: false,
    validation: { maxLength: 500 },
    sortable: false,
    description: 'Card cropped image URL'
  },

  collectible: {
    sqlExpression: 'c.collectible',
    dataType: 'boolean',
    supportedOperators: ['EQUALS', 'NOT_EQUALS'],
    requiredJoins: [],
    requiresAggregation: false,
    validValues: ['true', 'false'],
    sortable: true,
    description: 'Whether the card is collectible by players'
  },

  // Joined reference fields
  class_name: {
    sqlExpression: 'cl.name',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'],
    requiredJoins: ['classes'],
    requiresAggregation: false,
    validValues: SCHEMA_MAPPINGS.classes.validValues,
    sortable: true,
    description: 'Hero class name'
  },

  card_type: {
    sqlExpression: 'ct.name',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'],
    requiredJoins: ['card_types'],
    requiresAggregation: false,
    validValues: SCHEMA_MAPPINGS.cardTypes.validValues,
    sortable: true,
    description: 'Card type (Minion, Spell, Weapon, etc.)'
  },

  rarity: {
    sqlExpression: 'r.name',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'],
    requiredJoins: ['rarities'],
    requiresAggregation: false,
    validValues: SCHEMA_MAPPINGS.rarities.validValues,
    sortable: true,
    description: 'Card rarity level'
  },

  minion_type: {
    sqlExpression: 'mt.name',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'],
    requiredJoins: ['minion_types'],
    requiresAggregation: false,
    validValues: SCHEMA_MAPPINGS.minionTypes.validValues,
    sortable: true,
    description: 'Minion tribe/type'
  },

  spell_school: {
    sqlExpression: 'ss.name',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'],
    requiredJoins: ['spell_schools'],
    requiresAggregation: false,
    validValues: SCHEMA_MAPPINGS.spellSchools.validValues,
    sortable: true,
    description: 'Spell school classification'
  },

  set_name: {
    sqlExpression: 's.name',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'ILIKE', 'NOT_ILIKE'],
    requiredJoins: ['sets'],
    requiresAggregation: false,
    sortable: true,
    description: 'Card set/expansion name'
  },

  set_type: {
    sqlExpression: 's.type',
    dataType: 'string',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN'],
    requiredJoins: ['sets'],
    requiresAggregation: false,
    sortable: true,
    description: 'Card set type'
  },

  dust_value: {
    sqlExpression: 'r.dust_value',
    dataType: 'number',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL', 'BETWEEN', 'NOT_BETWEEN'],
    requiredJoins: ['rarities'],
    requiresAggregation: false,
    validation: { min: 0 },
    sortable: true,
    description: 'Dust value when disenchanted'
  },

  crafting_cost: {
    sqlExpression: 'r.crafting_cost',
    dataType: 'number',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL', 'BETWEEN', 'NOT_BETWEEN'],
    requiredJoins: ['rarities'],
    requiresAggregation: false,
    validation: { min: 0 },
    sortable: true,
    description: 'Dust cost to craft'
  },

  collectible_count: {
    sqlExpression: 's.collectible_count',
    dataType: 'number',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL', 'BETWEEN', 'NOT_BETWEEN'],
    requiredJoins: ['sets'],
    requiresAggregation: false,
    validation: { min: 0 },
    sortable: true,
    description: 'Number of collectible cards in set'
  },

  // Special Zilliax fields
  is_zilliax_functional_module: {
    sqlExpression: 'c.is_zilliax_functional_module',
    dataType: 'boolean',
    supportedOperators: ['EQUALS', 'NOT_EQUALS'],
    requiredJoins: [],
    requiresAggregation: false,
    validValues: ['true', 'false'],
    sortable: true,
    description: 'Whether card is a Zilliax functional module'
  },

  is_zilliax_cosmetic_module: {
    sqlExpression: 'c.is_zilliax_cosmetic_module',
    dataType: 'boolean',
    supportedOperators: ['EQUALS', 'NOT_EQUALS'],
    requiredJoins: [],
    requiresAggregation: false,
    validValues: ['true', 'false'],
    sortable: true,
    description: 'Whether card is a Zilliax cosmetic module'
  },

  // Metadata and timestamps
  metadata: {
    sqlExpression: 'c.metadata',
    dataType: 'json',
    supportedOperators: ['IS_NULL', 'IS_NOT_NULL'],
    requiredJoins: [],
    requiresAggregation: false,
    sortable: false,
    description: 'Card metadata JSON'
  },

  created_at: {
    sqlExpression: 'c.created_at',
    dataType: 'date',
    supportedOperators: ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL', 'BETWEEN', 'NOT_BETWEEN'],
    requiredJoins: [],
    requiresAggregation: false,
    sortable: true,
    description: 'Card creation timestamp'
  },

  // Special aggregated fields
  keywords: {
    sqlExpression: 'array_agg(DISTINCT k.name) FILTER (WHERE k.name IS NOT NULL)',
    dataType: 'array',
    supportedOperators: ['CONTAINS', 'CONTAINS_ALL', 'CONTAINS_ANY', 'NOT_CONTAINS'],
    requiredJoins: ['card_keywords', 'keywords'],
    requiresAggregation: true,
    validValues: SCHEMA_MAPPINGS.keywords.validValues,
    sortable: false,
    performanceHints: ['Keyword searches require complex joins', 'Consider limiting other filters'],
    description: 'Card keywords/abilities'
  },

  formats: {
    sqlExpression: 'array_agg(DISTINCT cf.format)',
    dataType: 'array',
    supportedOperators: ['CONTAINS', 'CONTAINS_ALL', 'CONTAINS_ANY', 'NOT_CONTAINS'],
    requiredJoins: ['card_formats'],
    requiresAggregation: true,
    validValues: SCHEMA_MAPPINGS.formats.validValues,
    sortable: false,
    description: 'Game formats where card is legal'
  }
};

// ============================================================================
// JOIN REQUIREMENTS MAPPING
// ============================================================================

/**
 * Complete join requirements for table relationships
 */
export const JOIN_REQUIREMENTS: Record<string, JoinRequirement> = {
  classes: {
    table: 'classes',
    alias: 'cl',
    condition: 'c.class_id = cl.id',
    type: 'LEFT',
    optional: true,
    dependencies: []
  },

  card_types: {
    table: 'card_types',
    alias: 'ct',
    condition: 'c.card_type_id = ct.id',
    type: 'LEFT',
    optional: true,
    dependencies: []
  },

  rarities: {
    table: 'rarities',
    alias: 'r',
    condition: 'c.rarity_id = r.id',
    type: 'LEFT',
    optional: true,
    dependencies: []
  },

  minion_types: {
    table: 'minion_types',
    alias: 'mt',
    condition: 'c.minion_type_id = mt.id',
    type: 'LEFT',
    optional: true,
    dependencies: []
  },

  spell_schools: {
    table: 'spell_schools',
    alias: 'ss',
    condition: 'c.spell_school_id = ss.id',
    type: 'LEFT',
    optional: true,
    dependencies: []
  },

  sets: {
    table: 'sets',
    alias: 's',
    condition: 'c.set_id = s.id',
    type: 'LEFT',
    optional: true,
    dependencies: []
  },

  card_keywords: {
    table: 'card_keywords',
    alias: 'ck',
    condition: 'c.id = ck.card_id',
    type: 'INNER',
    optional: false,
    dependencies: []
  },

  keywords: {
    table: 'keywords',
    alias: 'k',
    condition: 'ck.keyword_id = k.id',
    type: 'INNER',
    optional: false,
    dependencies: ['card_keywords']
  },

  card_formats: {
    table: 'card_formats',
    alias: 'cf',
    condition: 'c.id = cf.card_id',
    type: 'LEFT',
    optional: true,
    dependencies: []
  }
};

// ============================================================================
// UTILITY FUNCTIONS FOR AST INTEGRATION
// ============================================================================

/**
 * Get enhanced field definition by name
 */
export function getEnhancedFieldDefinition(fieldName: string): EnhancedFieldDefinition | undefined {
  return ENHANCED_FIELD_MAPPINGS[fieldName];
}

/**
 * Check if a field supports a specific operator
 */
export function isOperatorSupportedForField(fieldName: string, operator: OperatorType): boolean {
  const fieldDef = getEnhancedFieldDefinition(fieldName);
  return fieldDef?.supportedOperators.includes(operator) ?? false;
}

/**
 * Get all required joins for a set of fields
 */
export function getRequiredJoinsForFields(fieldNames: string[]): string[] {
  const requiredJoins = new Set<string>();

  fieldNames.forEach(fieldName => {
    const fieldDef = getEnhancedFieldDefinition(fieldName);
    if (fieldDef) {
      fieldDef.requiredJoins.forEach(join => requiredJoins.add(join));
    }
  });

  return Array.from(requiredJoins);
}

/**
 * Get join requirements in dependency order
 */
export function getOrderedJoinRequirements(joinNames: string[]): JoinRequirement[] {
  const result: JoinRequirement[] = [];
  const processed = new Set<string>();
  const processing = new Set<string>(); // CRITICAL FIX: Track processing state for circular dependency detection

  function addJoinWithDependencies(joinName: string) {
    if (processed.has(joinName)) return;

    // CRITICAL FIX: Detect circular dependencies
    if (processing.has(joinName)) {
      throw new Error(`Circular JOIN dependency detected: ${joinName}. Processing chain: ${Array.from(processing).join(' -> ')} -> ${joinName}`);
    }

    const joinReq = JOIN_REQUIREMENTS[joinName];
    if (!joinReq) {
      console.warn(`JOIN requirement not found: ${joinName}`);
      return;
    }

    // CRITICAL FIX: Mark as processing before recursion
    processing.add(joinName);

    try {
      // Add dependencies first
      joinReq.dependencies.forEach(dep => addJoinWithDependencies(dep));

      result.push(joinReq);
      processed.add(joinName);
    } finally {
      // CRITICAL FIX: Always remove from processing set
      processing.delete(joinName);
    }
  }

  joinNames.forEach(joinName => addJoinWithDependencies(joinName));
  return result;
}

/**
 * Validate field value against field definition
 */
export function validateFieldValue(fieldName: string, value: ConditionValue): { isValid: boolean; error?: string } {
  const fieldDef = getEnhancedFieldDefinition(fieldName);
  if (!fieldDef) {
    return { isValid: false, error: `Unknown field: ${fieldName}` };
  }

  // Check valid values
  if (fieldDef.validValues && !Array.isArray(value)) {
    const isValidValue = fieldDef.validValues.some(validValue => {
      // Handle both string and number comparisons
      return String(validValue) === String(value) || validValue === value;
    });

    if (!isValidValue) {
      return {
        isValid: false,
        error: `Invalid value for ${fieldName}. Valid values: ${fieldDef.validValues.join(', ')}`
      };
    }
  }

  // Check validation rules
  if (fieldDef.validation) {
    const validation = fieldDef.validation;

    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return { isValid: false, error: `Value ${value} is below minimum ${validation.min} for ${fieldName}` };
      }
      if (validation.max !== undefined && value > validation.max) {
        return { isValid: false, error: `Value ${value} is above maximum ${validation.max} for ${fieldName}` };
      }
    }

    if (typeof value === 'string') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        return { isValid: false, error: `Value too short for ${fieldName} (minimum ${validation.minLength} characters)` };
      }
      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        return { isValid: false, error: `Value too long for ${fieldName} (maximum ${validation.maxLength} characters)` };
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        return { isValid: false, error: `Value does not match required pattern for ${fieldName}` };
      }
    }

    if (validation.customValidator && !validation.customValidator(value)) {
      return { isValid: false, error: `Custom validation failed for ${fieldName}` };
    }
  }

  return { isValid: true };
}

/**
 * Get operator definition by type
 */
export function getOperatorDefinition(operator: OperatorType): OperatorDefinition {
  return OPERATOR_DEFINITIONS[operator];
}

/**
 * Check if field requires aggregation
 */
export function fieldRequiresAggregation(fieldName: string): boolean {
  const fieldDef = getEnhancedFieldDefinition(fieldName);
  return fieldDef?.requiresAggregation ?? false;
}

/**
 * Get performance hints for a field
 */
export function getFieldPerformanceHints(fieldName: string): string[] {
  const fieldDef = getEnhancedFieldDefinition(fieldName);
  return fieldDef?.performanceHints ?? [];
}

// Query templates for different search types (LEGACY - maintained for compatibility)
export const QUERY_TEMPLATES = {
  cardSearchBasic: `
    SELECT {SELECT_FIELDS}
    FROM cards c
    {JOIN_CLAUSES}
    WHERE c.collectible = true
    {WHERE_CLAUSES}
    {ORDER_BY}
    LIMIT {LIMIT}
  `,

  cardSearchWithKeywords: `
    SELECT DISTINCT {SELECT_FIELDS}
    FROM cards c
    {JOIN_CLAUSES}
    WHERE c.collectible = true
    {WHERE_CLAUSES}
    {ORDER_BY}
    LIMIT {LIMIT}
  `,

  cardSearchWithAggregation: `
    SELECT {SELECT_FIELDS}
    FROM cards c
    {JOIN_CLAUSES}
    WHERE c.collectible = true
    {WHERE_CLAUSES}
    GROUP BY {GROUP_BY_FIELDS}
    {ORDER_BY}
    LIMIT {LIMIT}
  `
};

// Default field sets for common queries
export const DEFAULT_FIELD_SETS = {
  basic: ['id', 'name', 'mana_cost', 'attack', 'health', 'text', 'class_name', 'card_type', 'rarity'],
  detailed: ['id', 'name', 'mana_cost', 'attack', 'health', 'text', 'class_name', 'card_type', 'rarity', 'minion_type', 'spell_school', 'set_name'],
  withImages: ['id', 'name', 'mana_cost', 'attack', 'health', 'text', 'class_name', 'card_type', 'rarity', 'image_url'],
  withKeywords: ['id', 'name', 'mana_cost', 'attack', 'health', 'text', 'class_name', 'card_type', 'rarity', 'keywords']
};

// ============================================================================
// BACKWARD COMPATIBILITY HELPERS
// ============================================================================

/**
 * Convert enhanced field mapping back to simple string mapping for legacy code
 */
export function getSimpleFieldMapping(fieldName: string): string | undefined {
  const enhanced = getEnhancedFieldDefinition(fieldName);
  return enhanced?.sqlExpression;
}

/**
 * Get all available field names
 */
export function getAllFieldNames(): string[] {
  return Object.keys(ENHANCED_FIELD_MAPPINGS);
}

/**
 * Get fields that support a specific operator
 */
export function getFieldsSupportingOperator(operator: OperatorType): string[] {
  return Object.entries(ENHANCED_FIELD_MAPPINGS)
    .filter(([_, fieldDef]) => fieldDef.supportedOperators.includes(operator))
    .map(([fieldName, _]) => fieldName);
}

/**
 * Get sortable fields
 */
export function getSortableFields(): string[] {
  return Object.entries(ENHANCED_FIELD_MAPPINGS)
    .filter(([_, fieldDef]) => fieldDef.sortable)
    .map(([fieldName, _]) => fieldName);
}

/**
 * Get aggregated fields (require GROUP BY)
 */
export function getAggregatedFields(): string[] {
  return Object.entries(ENHANCED_FIELD_MAPPINGS)
    .filter(([_, fieldDef]) => fieldDef.requiresAggregation)
    .map(([fieldName, _]) => fieldName);
}

/**
 * Migration helper: convert ExploreDeckParams filters to AST-compatible format
 */
export function validateLegacyFilters(filters: Record<string, any>): {
  valid: Record<string, any>;
  invalid: Record<string, string>;
} {
  const valid: Record<string, any> = {};
  const invalid: Record<string, string> = {};

  Object.entries(filters).forEach(([fieldName, value]) => {
    const fieldDef = getEnhancedFieldDefinition(fieldName);
    if (!fieldDef) {
      invalid[fieldName] = `Unknown field: ${fieldName}`;
      return;
    }

    const validation = validateFieldValue(fieldName, value);
    if (validation.isValid) {
      valid[fieldName] = value;
    } else {
      invalid[fieldName] = validation.error || 'Validation failed';
    }
  });

  return { valid, invalid };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Types are already exported above where they are defined
