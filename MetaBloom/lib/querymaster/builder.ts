/**
 * QueryMaster Builder
 * Deterministic SQL generation from structured parameters
 */

import { SCHEMA_MAPPINGS, FIELD_MAPPINGS, QUERY_TEMPLATES, DEFAULT_FIELD_SETS } from './schema-config';

// Interface for structured deck exploration parameters
export interface ExploreDeckParams {
  searchType: 'cards' | 'synergies' | 'archetypes' | 'counters';
  
  filters: {
    classes?: string[];
    rarities?: string[];
    cardTypes?: string[];
    formats?: string[];
    minionTypes?: string[];
    spellSchools?: string[];
    keywords?: string[];
    sets?: string[];
    
    // Numeric filters
    manaCost?: {
      min?: number;
      max?: number;
      exact?: number;
    };
    attack?: {
      min?: number;
      max?: number;
      exact?: number;
    };
    health?: {
      min?: number;
      max?: number;
      exact?: number;
    };
    
    // Text search
    textContains?: string[];
    nameContains?: string[];
  };
  
  output: {
    fields: string[];
    orderBy?: {
      field: string;
      direction: 'ASC' | 'DESC';
    };
    limit?: number;
  };
  
  context: {
    userIntent: string;
    buildingContext?: string;
    conversationState?: string;
  };
}

export class QueryMasterBuilder {
  
  /**
   * Main entry point: build card search query from structured parameters
   * Returns both SQL with %s placeholders and parameters array
   */
  buildCardSearchQuery(params: ExploreDeckParams): { sql: string; params: any[] } {
    // Determine which template to use based on filters
    const templateName = this.selectQueryTemplate(params);
    const template = QUERY_TEMPLATES[templateName as keyof typeof QUERY_TEMPLATES];

    // Build each clause with parameters
    const selectClause = this.buildSelectClause(params.output.fields);
    const joinClauses = this.buildJoinClause(params.filters);
    const { whereClause, whereParams } = this.buildWhereClauseWithParams(params.filters);
    const orderByClause = this.buildOrderByClause(params.output.orderBy);
    const groupByClause = this.buildGroupByClause(params.output.fields);
    const limit = params.output.limit || 15;

    // Collect all parameters
    const allParams = [...whereParams, limit];

    // Replace template placeholders
    let query = template
      .replace('{SELECT_FIELDS}', selectClause)
      .replace('{JOIN_CLAUSES}', joinClauses)
      .replace('{WHERE_CLAUSES}', whereClause)
      .replace('{ORDER_BY}', orderByClause)
      .replace('{GROUP_BY_FIELDS}', groupByClause)
      .replace('{LIMIT}', '%s'); // Use parameter for limit

    // Clean up extra whitespace
    const sql = query.replace(/\s+/g, ' ').trim();

    return { sql, params: allParams };
  }
  
  /**
   * Select appropriate query template based on filters
   */
  private selectQueryTemplate(params: ExploreDeckParams): string {
    const hasKeywords = params.filters.keywords && params.filters.keywords.length > 0;
    const hasAggregatedFields = params.output.fields.some(field => 
      field === 'keywords' || field === 'formats'
    );
    
    if (hasAggregatedFields) {
      return 'cardSearchWithAggregation';
    } else if (hasKeywords) {
      return 'cardSearchWithKeywords';
    } else {
      return 'cardSearchBasic';
    }
  }
  
  /**
   * Build SELECT clause from requested fields
   */
  private buildSelectClause(fields: string[]): string {
    if (!fields || fields.length === 0) {
      fields = DEFAULT_FIELD_SETS.basic;
    }
    
    const selectFields = fields.map(field => {
      const mapping = FIELD_MAPPINGS[field];
      if (!mapping) {
        throw new Error(`Unknown field: ${field}`);
      }
      
      // Handle aggregated fields
      if (field === 'keywords' || field === 'formats') {
        return `${mapping} AS ${field}`;
      }
      
      return `${mapping} AS ${field}`;
    });
    
    return selectFields.join(', ');
  }
  
  /**
   * Build JOIN clauses based on required filters and fields
   */
  private buildJoinClause(filters: ExploreDeckParams['filters']): string {
    const requiredJoins = new Set<string>();
    
    // Always include format join for Standard/Wild filtering
    requiredJoins.add('LEFT JOIN card_formats cf ON c.id = cf.card_id');
    
    // Add joins based on filters
    if (filters.classes && filters.classes.length > 0) {
      requiredJoins.add('LEFT JOIN classes cl ON c.class_id = cl.id');
    }
    
    if (filters.rarities && filters.rarities.length > 0) {
      requiredJoins.add('LEFT JOIN rarities r ON c.rarity_id = r.id');
    }
    
    if (filters.cardTypes && filters.cardTypes.length > 0) {
      requiredJoins.add('LEFT JOIN card_types ct ON c.card_type_id = ct.id');
    }
    
    if (filters.minionTypes && filters.minionTypes.length > 0) {
      requiredJoins.add('LEFT JOIN minion_types mt ON c.minion_type_id = mt.id');
    }
    
    if (filters.spellSchools && filters.spellSchools.length > 0) {
      requiredJoins.add('LEFT JOIN spell_schools ss ON c.spell_school_id = ss.id');
    }
    
    if (filters.sets && filters.sets.length > 0) {
      requiredJoins.add('LEFT JOIN sets s ON c.card_set_id = s.id');
    }
    
    // Keywords require special junction table join
    if (filters.keywords && filters.keywords.length > 0) {
      requiredJoins.add('JOIN card_keywords ck ON c.id = ck.card_id');
      requiredJoins.add('JOIN keywords k ON ck.keyword_id = k.id');
    }
    
    return Array.from(requiredJoins).join('\n    ');
  }
  
  /**
   * Build WHERE clause from filters with parameterized queries
   * Returns both the clause and parameters array
   */
  private buildWhereClauseWithParams(filters: ExploreDeckParams['filters']): { whereClause: string; whereParams: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    // Class filtering
    if (filters.classes && filters.classes.length > 0) {
      const placeholders = filters.classes.map(() => '%s').join(', ');
      conditions.push(`cl.name IN (${placeholders})`);
      params.push(...filters.classes);
    }

    // Rarity filtering
    if (filters.rarities && filters.rarities.length > 0) {
      const placeholders = filters.rarities.map(() => '%s').join(', ');
      conditions.push(`r.name IN (${placeholders})`);
      params.push(...filters.rarities);
    }

    // Card type filtering
    if (filters.cardTypes && filters.cardTypes.length > 0) {
      const placeholders = filters.cardTypes.map(() => '%s').join(', ');
      conditions.push(`ct.name IN (${placeholders})`);
      params.push(...filters.cardTypes);
    }

    // Minion type filtering
    if (filters.minionTypes && filters.minionTypes.length > 0) {
      const placeholders = filters.minionTypes.map(() => '%s').join(', ');
      conditions.push(`mt.name IN (${placeholders})`);
      params.push(...filters.minionTypes);
    }

    // Spell school filtering
    if (filters.spellSchools && filters.spellSchools.length > 0) {
      const placeholders = filters.spellSchools.map(() => '%s').join(', ');
      conditions.push(`ss.name IN (${placeholders})`);
      params.push(...filters.spellSchools);
    }

    // Keyword filtering
    if (filters.keywords && filters.keywords.length > 0) {
      const placeholders = filters.keywords.map(() => '%s').join(', ');
      conditions.push(`k.name IN (${placeholders})`);
      params.push(...filters.keywords);
    }

    // Format filtering
    if (filters.formats && filters.formats.length > 0) {
      const placeholders = filters.formats.map(() => '%s').join(', ');
      conditions.push(`cf.format IN (${placeholders})`);
      params.push(...filters.formats);
    }

    // Set filtering
    if (filters.sets && filters.sets.length > 0) {
      const placeholders = filters.sets.map(() => '%s').join(', ');
      conditions.push(`s.name IN (${placeholders})`);
      params.push(...filters.sets);
    }

    // Numeric range filtering
    if (filters.manaCost) {
      if (filters.manaCost.exact !== undefined) {
        conditions.push(`c.mana_cost = %s`);
        params.push(filters.manaCost.exact);
      } else {
        if (filters.manaCost.min !== undefined) {
          conditions.push(`c.mana_cost >= %s`);
          params.push(filters.manaCost.min);
        }
        if (filters.manaCost.max !== undefined) {
          conditions.push(`c.mana_cost <= %s`);
          params.push(filters.manaCost.max);
        }
      }
    }

    if (filters.attack) {
      if (filters.attack.exact !== undefined) {
        conditions.push(`c.attack = %s`);
        params.push(filters.attack.exact);
      } else {
        if (filters.attack.min !== undefined) {
          conditions.push(`c.attack >= %s`);
          params.push(filters.attack.min);
        }
        if (filters.attack.max !== undefined) {
          conditions.push(`c.attack <= %s`);
          params.push(filters.attack.max);
        }
      }
    }

    if (filters.health) {
      if (filters.health.exact !== undefined) {
        conditions.push(`c.health = %s`);
        params.push(filters.health.exact);
      } else {
        if (filters.health.min !== undefined) {
          conditions.push(`c.health >= %s`);
          params.push(filters.health.min);
        }
        if (filters.health.max !== undefined) {
          conditions.push(`c.health <= %s`);
          params.push(filters.health.max);
        }
      }
    }

    // Text search filtering
    if (filters.textContains && filters.textContains.length > 0) {
      const textConditions = filters.textContains.map(() => `c.text ILIKE %s`);
      conditions.push(`(${textConditions.join(' AND ')})`);
      // Add wildcards to text search parameters
      params.push(...filters.textContains.map(text => `%${text}%`));
    }

    if (filters.nameContains && filters.nameContains.length > 0) {
      const nameConditions = filters.nameContains.map(() => `c.name ILIKE %s`);
      conditions.push(`(${nameConditions.join(' AND ')})`);
      // Add wildcards to name search parameters
      params.push(...filters.nameContains.map(name => `%${name}%`));
    }

    // Combine all conditions
    const whereClause = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';
    return { whereClause, whereParams: params };
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use buildWhereClauseWithParams instead
   */
  private buildWhereClause(filters: ExploreDeckParams['filters']): string {
    const { whereClause } = this.buildWhereClauseWithParams(filters);
    return whereClause;
  }
  
  /**
   * Build ORDER BY clause
   */
  private buildOrderByClause(orderBy?: { field: string; direction: 'ASC' | 'DESC' }): string {
    if (!orderBy) {
      return 'ORDER BY c.mana_cost ASC, c.name ASC';
    }
    
    const fieldMapping = FIELD_MAPPINGS[orderBy.field];
    if (!fieldMapping) {
      return 'ORDER BY c.mana_cost ASC, c.name ASC';
    }
    
    return `ORDER BY ${fieldMapping} ${orderBy.direction}, c.name ASC`;
  }
  
  /**
   * Build GROUP BY clause for aggregated queries
   */
  private buildGroupByClause(fields: string[]): string {
    const hasAggregatedFields = fields.some(field => 
      field === 'keywords' || field === 'formats'
    );
    
    if (!hasAggregatedFields) {
      return '';
    }
    
    // Group by all non-aggregated fields
    const groupByFields = fields
      .filter(field => field !== 'keywords' && field !== 'formats')
      .map(field => FIELD_MAPPINGS[field])
      .filter(Boolean);
    
    return groupByFields.length > 0 ? groupByFields.join(', ') : 'c.id';
  }
}
