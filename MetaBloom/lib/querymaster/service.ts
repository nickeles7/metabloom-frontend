/**
 * QueryMaster Service
 * Specialized SQL expert AI that acts as a transparent proxy between MetaForge and the database
 */

import { createGrokClient } from '../grok/client';
import { executeLambdaQuery } from '../grok/lambda-client';
import { QueryMasterRequest, QueryMasterResponse } from './types';

export class QueryMasterService {
  private client: any;
  private readonly systemPrompt: string;

  constructor() {
    this.client = createGrokClient();
// QueryMaster system prompt - complete version for embedding
this.systemPrompt = `#`;
  }

  async executeQuery(request: QueryMasterRequest): Promise<QueryMasterResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 QueryMaster executing: ${request.functionName}`);
      
      // Route to specific function handler
      switch (request.functionName) {
        case 'exploreDeckBuilding':
          return await this.handleExploreDeckBuilding(request);
        case 'fetchCardMetadata':
          return await this.handleFetchCardMetadata(request);
        case 'getCardDbfIds':
          return await this.handleCardNameLookup(request);
        default:
          throw new Error(`Unknown function: ${request.functionName}`);
      }

    } catch (error) {
      console.error('❌ QueryMaster execution failed:', error);
      return {
        success: false,
        error: `QueryMaster failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async handleExploreDeckBuilding(request: QueryMasterRequest): Promise<QueryMasterResponse> {
    const startTime = Date.now();

    // Extract parameter values from the original query for armor search
    const originalQuery = request.parameters.sqlQuery;
    const userIntent = request.parameters.userIntent;

    // Parse parameters from user intent and original query
    let queryParams: any[] = [];

    // For armor search queries, extract the classes and search pattern
    if (userIntent.toLowerCase().includes('armor') || originalQuery.toLowerCase().includes('armor')) {
      // Extract classes from original query or default to common classes
      const classMatch = originalQuery.match(/cl\.name\s+IN\s*\(['"]([^'"]+)['"],?\s*['"]([^'"]+)['"]\)/i);
      if (classMatch) {
        // For single class queries, use the first class found
        // Provide parameters for multiple LIKE clauses that QueryMaster might generate
        queryParams = [classMatch[1], '%armor%', '%armor%'];
      } else {
        // Default for armor searches - use Warlock as primary class
        // Provide parameters for multiple LIKE clauses that QueryMaster might generate
        queryParams = ['Warlock', '%armor%', '%armor%'];
      }
    }

    // CONTEXT WARMING: Prime QueryMaster with schema knowledge
    const warmerMessages = [
      { role: 'system', content: [{ type: 'text', text: this.systemPrompt }] },
      {
        role: 'user',
        content: [{
          type: 'text',
          text: 'What are the valid tables in the schema?'
        }]
      }
    ];

    // Get warmer response to prime context (we ignore the content but keep for thread continuity)
    const warmerResponse = await this.client.createChatCompletion(warmerMessages, {
      model: 'grok-3-latest',
      temperature: 0.1,
      maxTokens: 1000
    });

    // Inject QueryMaster system instruction for strict SQL constraints
    const systemInstructionMessage = {
      role: 'system' as const,
      content: [{
        type: 'text' as const,
        text: `#`
      }]
    };

    // Generate optimized SQL using QueryMaster AI with warmed context and system instruction
    const messages = [
      systemInstructionMessage, // Inject system instruction first
      ...warmerMessages,
      { role: 'assistant', content: [{ type: 'text', text: warmerResponse.choices[0].message.content }] },
      {
        role: 'user',
        content: [{
          type: 'text',
          text: `Generate a SQL query for deck building exploration:

Original Query: ${originalQuery}
User Intent: ${userIntent}
Building Context: ${request.parameters.buildingContext || 'None'}

Generate a PostgreSQL query that fulfills this intent. Use %s parameter format.`
        }]
      }
    ];

    const response = await this.client.createChatCompletion(messages, {
      model: 'grok-3-latest',
      temperature: 0.1,
      maxTokens: 4096
    });

    // Extract optimized query from response
    const optimizedQuery = this.extractSQLFromResponse(response.choices[0].message.content);

    // Execute the optimized query with extracted parameters
    const result = await executeLambdaQuery(optimizedQuery, queryParams, 'querymaster_explore_deck_building');

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        executionTime: Date.now() - startTime,
        queryGenerated: optimizedQuery
      };
    }

    return {
      success: true,
      data: result.data || [],
      executionTime: Date.now() - startTime,
      queryGenerated: optimizedQuery
    };
  }

  private async handleFetchCardMetadata(request: QueryMasterRequest): Promise<QueryMasterResponse> {
    const startTime = Date.now();
    
    // QueryMaster optimized card metadata query
    const query = `
      SELECT c.id, c.name, c.mana_cost, c.attack, c.health, c.text,
             cl.name AS class_name, ct.name AS card_type,
             array_agg(k.name) FILTER (WHERE k.name IS NOT NULL) AS keywords
      FROM cards c
      LEFT JOIN classes cl ON cl.id = c.class_id
      LEFT JOIN card_types ct ON ct.id = c.card_type_id
      LEFT JOIN card_keywords ck ON ck.card_id = c.id
      LEFT JOIN keywords k ON k.id = ck.keyword_id
      WHERE c.id = ANY(%s) AND c.collectible = true
      GROUP BY c.id, c.name, c.mana_cost, c.attack, c.health, c.text, cl.name, ct.name
      ORDER BY c.mana_cost ASC LIMIT 50
    `;

    // Execute query - response flows directly back to MetaForge
    const result = await executeLambdaQuery(query, [request.parameters.cardIds], 'querymaster_fetch_metadata');

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        executionTime: Date.now() - startTime
      };
    }

    return {
      success: true,
      data: result.data || [],
      executionTime: Date.now() - startTime
    };
  }

  private async handleCardNameLookup(request: QueryMasterRequest): Promise<QueryMasterResponse> {
    const startTime = Date.now();

    // Inject QueryMaster system instruction for strict SQL constraints
    const systemInstructionMessage = {
      role: 'system' as const,
      content: [{
        type: 'text' as const,
        text: `#`
      }]
    };

    // Use QueryMaster AI for intelligent card name cleaning and lookup
    const messages = [
      systemInstructionMessage, // Inject system instruction first
      { role: 'system', content: [{ type: 'text', text: this.systemPrompt }] },
      {
        role: 'user',
        content: [{
          type: 'text',
          text: `Clean these card names and generate SQL to find their IDs:

Card Names to Clean and Lookup:
${request.parameters.cardNames.map((name: string, index: number) => `${index + 1}. "${name}"`).join('\n')}

Requirements:
1. Remove quantity prefixes (2x, 1x, etc.)
2. Remove mana cost suffixes ((1), (2), etc.)
3. Handle fuzzy matching for slight misspellings
4. Return SQL that maps original dirty names to clean card IDs
5. Only return collectible cards (c.collectible = true)

Generate optimized PostgreSQL query that returns both the original input name and the matched card ID for mapping.`
        }]
      }
    ];

    const response = await this.client.createChatCompletion(messages, {
      model: 'grok-3-latest',
      temperature: 0.1,
      maxTokens: 4096
    });

    // Extract optimized query from response
    const optimizedQuery = this.extractSQLFromResponse(response.choices[0].message.content);

    // Execute the AI-generated query - response flows directly back to MetaForge
    const result = await executeLambdaQuery(optimizedQuery, [request.parameters.cardNames], 'querymaster_name_lookup');

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        executionTime: Date.now() - startTime,
        queryGenerated: optimizedQuery
      };
    }

    // Convert to name->ID mapping format using AI-cleaned results
    const mapping: Record<string, number> = {};
    result.data?.forEach((card: any) => {
      // Handle different possible response formats from AI-generated query
      if (card.original_name && card.id) {
        mapping[card.original_name] = card.id;
      } else if (card.name && card.id) {
        mapping[card.name] = card.id;
      }
    });

    return {
      success: true,
      data: [mapping], // Return as array for consistency
      executionTime: Date.now() - startTime,
      queryGenerated: optimizedQuery
    };
  }

  private extractSQLFromResponse(content: string): string {
    // First try to extract SQL from code blocks
    const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/) ||
                     content.match(/```\n([\s\S]*?)\n```/);

    if (sqlMatch) {
      return sqlMatch[1].trim();
    }

    // If no code blocks, try to extract SQL from text
    // Look for SELECT statements (case insensitive)
    const selectMatch = content.match(/\b(SELECT[\s\S]*?;?)\s*$/mi);
    if (selectMatch) {
      return selectMatch[1].trim();
    }

    // Look for any SQL-like pattern starting with SELECT
    const sqlPattern = content.match(/\b(SELECT[\s\S]*?)(?:\n\n|\n$|$)/mi);
    if (sqlPattern) {
      let sql = sqlPattern[1].trim();
      // Add semicolon if missing
      if (!sql.endsWith(';')) {
        sql += ';';
      }
      return sql;
    }

    // Last resort: return content but log warning
    console.warn('⚠️ Could not extract SQL from QueryMaster response, returning full content');
    return content.trim();
  }
}
