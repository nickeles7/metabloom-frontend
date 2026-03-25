/**
 * Grok Function Calling Support
 * Handles deck building and other function calls for Grok AI
 */

import { encode, FormatType } from 'deckstrings';
import { GrokMessage, GrokResponse } from './client';
import { getGrokService } from './service';
import { executeLambdaQuery } from './lambda-client';
import { createServerLogger, ServerQuickLog } from '../logging/server';
import { PerformanceTimer } from '../logging';

// QueryMaster imports
import { QueryMasterService } from '../querymaster/service';
import { QueryMasterBuilder, ExploreDeckParams } from '../querymaster/builder';
import { ParamValidator } from '../querymaster/validator';

// AST imports
import {
  ASTQueryCompiler,
  compileAST
} from '../querymaster/ast-compiler';
import {
  transformAndValidateAST,
  transformNaturalLanguageAST,
  logTransformationResults
} from '../querymaster/ast-transformer';
import {
  ASTNode,
  LogicalNode,
  ConditionNode,
  ASTOutputSpecification,
  ASTQueryContext,
  createConditionNode,
  createLogicalNode
} from '../querymaster/ast-types';

// Import ambiguity resolution system
import {
  detectQueryAmbiguity,
  handleAmbiguousQuery,
  parseUserClarification,
  EnhancedUserIntentResult,
  HEARTHSTONE_OP_DEFINITIONS
} from './ambiguity-resolver';
import { getConversationStateManager, generateSessionId } from './conversation-state';

/**
 * Select the best domain default based on ambiguous terms
 */
function selectBestDomainDefault(ambiguousTerms: string[]): {
  orderBy: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  reasoning: string;
} {
  // If no ambiguous terms, default to high stats
  if (ambiguousTerms.length === 0) {
    return {
      orderBy: HEARTHSTONE_OP_DEFINITIONS.high_stats.orderBy,
      reasoning: HEARTHSTONE_OP_DEFINITIONS.high_stats.reasoning
    };
  }

  // Map terms to preferred strategies
  const termStrategies: Record<string, keyof typeof HEARTHSTONE_OP_DEFINITIONS> = {
    'OP': 'high_stats',
    'overpowered': 'high_stats',
    'strong': 'high_stats',
    'powerful': 'game_impact',
    'best': 'value_efficiency',
    'good': 'value_efficiency',
    'meta': 'meta_dominance',
    'broken': 'high_stats',
    'insane': 'high_stats',
    'competitive': 'meta_dominance',
    'viable': 'value_efficiency'
  };

  // Find the best strategy for the primary ambiguous term
  const primaryTerm = ambiguousTerms[0].toLowerCase();
  const strategy = termStrategies[primaryTerm] || 'high_stats';

  return {
    orderBy: HEARTHSTONE_OP_DEFINITIONS[strategy].orderBy,
    reasoning: HEARTHSTONE_OP_DEFINITIONS[strategy].reasoning
  };
}

// Intent Detection Types - Phase 1: Pure Classification Only
export interface UserIntentResult {
  intentType: 'CARD_SEARCH' | 'DECK_BUILDING' | 'GENERAL_CHAT' | 'GREETING' | 'QUESTION';
  confidence: number;
  // Phase 1: Removed interpretation fields (extractedParams, reasoning)
  // These will be handled by separate interpretation functions in Phase 2
}

/**
 * Phase 1 Helper: Create placeholder context for AST functions
 * This ensures AST system continues working while we transition to pure classification
 */
export function createPlaceholderASTContext(
  intentType: string,
  userMessage: string,
  buildingContext?: string
): ASTQueryContext {
  // Generate basic context based on intent type
  const intentDescriptions = {
    'CARD_SEARCH': 'User is searching for specific cards',
    'DECK_BUILDING': 'User is building or modifying a deck',
    'GENERAL_CHAT': 'User is having a general conversation',
    'GREETING': 'User is greeting or acknowledging',
    'QUESTION': 'User is asking a question'
  };

  return {
    userIntent: intentDescriptions[intentType as keyof typeof intentDescriptions] || 'User interaction',
    buildingContext,
    sessionId: generateSessionId()
  };
}

// Phase 2: Reasoning Layer Types
export interface UserQueryInterpretation {
  /** Structured query specification ready for AST consumption */
  querySpec: {
    /** AST conditions derived from user intent */
    conditions: ASTNode[];
    /** Output specification with fields, ordering, limits */
    outputSpec: ASTOutputSpecification;
    /** Query context with reasoning metadata */
    context: {
      userIntent: string;
      buildingContext?: string;
      sessionId?: string;
    };
  };
  /** Explicit reasoning assumptions made during interpretation */
  assumptions: string[];
  /** Suggested clarification questions for ambiguous cases */
  clarificationSuggestions: string[];
  /** Confidence in the interpretation (0.0-1.0) */
  confidence: number;
  /** Human-readable explanation of reasoning process */
  reasoning: string;
}

// Re-export GrokMessage for external use
export type { GrokMessage, GrokResponse };

// Initialize QueryMaster service
const queryMaster = new QueryMasterService();

// Initialize deterministic builder components
const queryBuilder = new QueryMasterBuilder();
const paramValidator = new ParamValidator();

// Structured error logging
interface FlowExecutionLog {
  flow: 'DETERMINISTIC_BUILDER' | 'QUERYMASTER_AI' | 'ORIGINAL_FALLBACK';
  success: boolean;
  executionTime: number;
  totalTime: number;
  resultCount?: number;
  errorType?: string;
  errorMessage?: string;
  fallbackReason?: string;
  validationErrors?: any[];
  correctionApplied?: boolean;
  complexityScore?: number; // CRITICAL FIX: Add complexity score for AST error analysis
}

// 🗑️ REMOVED: Legacy QueryMaster feature flags - Stage 3 cleanup
// Legacy environment variables eliminated: ENABLE_QUERYMASTER, USE_DETERMINISTIC_BUILDER
// AST system is now the primary and only system for card search functionality

// NOTE: QueryMaster system instruction constant removed from main conversation flow
// The instruction is now only defined and used within the QueryMaster service internal AI calls
// This prevents QueryMaster from responding directly to users in the main conversation

// NOTE: QueryMaster system instruction injection functions removed from main conversation flow
// These functions were causing QueryMaster to respond directly to users instead of staying in background
// QueryMaster system instructions are now only injected in the QueryMaster service internal AI calls
// This ensures MetaForge handles all user-facing responses while QueryMaster stays as a backend service

// Types for deck building
export interface DeckCard {
  name: string;
  count: number;
  dbfId?: number;
}

export interface BuildDeckRequest {
  heroClass: string;
  format: 'Standard' | 'Wild' | 'Classic';
  deckName?: string;
  cards?: DeckCard[];
  dbfIds?: number[];
}

export interface BuildDeckResponse {
  success: boolean;
  deckCode?: string;
  formattedDeck?: string;
  error?: string;
}

interface EnhancedDeckCard {
  cardId: number;
  name: string;
  manaCost: number | null;
  attack: number | null;
  health: number | null;
  text: string | null;
  class: string | null;
  type: string | null;
  keywords: string[] | null;
  count: number;
}

interface EnhancedDeckResponse {
  success: boolean;
  deckCode?: string;
  hero?: string;
  format?: string;
  cardCount?: number;
  cards?: EnhancedDeckCard[];
  formattedDeck?: string;
  error?: string;
}

// Database query types
export interface DatabaseQueryRequest {
  query_id: string;
  params: any[];
}

export interface DatabaseQueryResponse {
  success: boolean;
  data?: any[];
  error?: string;
  execution_time_ms?: number;
}

// Enhanced response interface for structured card exploration
export interface ExploreCardsResponse {
  success: boolean;
  data?: any[];
  error?: string;
  execution_time_ms?: number;
  metadata?: {
    resultCount?: number;
    sqlGenerated?: string;
    validationErrors?: any[];
    validationWarnings?: any[];
    validationCorrections?: any[];
    correctedParams?: any;
    totalExecutionTime?: number;
    flow?: string;
    stage?: string;
    errorType?: string;
  };
}

// Interface for exploreDeckBuilding function
export interface ExploreDeckBuildingRequest {
  sqlQuery: string;
  userIntent: string;
  buildingContext?: string;
}

// Function definitions for Grok
export const ENCODE_DECK_FUNCTION = {
  type: 'function',
  function: {
    name: 'encodeDeck',
    description: 'Encode a Hearthstone deck into a deck code for in-game import. Automatically detects hero class and format from the deck list.',
    parameters: {
      type: 'object',
      properties: {
        deckList: {
          type: 'string',
          description: 'The deck list in newline-separated format with card counts. Each line should contain one card in the format "1 Card Name" or "2 Card Name". Example:\n1 Ancient Mysteries\n1 Audio Amplifier\n2 Conjure Mana Biscuit\n2 Photon Cannon\n2 Rewind'
        },
        heroClass: {
          type: 'string',
          description: 'The hero class (optional - will be detected from deck list if not provided)',
          enum: ['Druid', 'Mage', 'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Warlock', 'Demon Hunter']
        },
        format: {
          type: 'string',
          description: 'The game format (optional - will be detected or default to Standard)',
          enum: ['Standard', 'Wild', 'Classic']
        },
        deckName: {
          type: 'string',
          description: 'Name of the deck (optional)'
        }
      },
      required: ['deckList']
    }
  }
};

export const DECODE_DECK_FUNCTION = {
  type: 'function',
  function: {
    name: 'decodeDeck',
    description: 'Present the complete, pre-analyzed Hearthstone deck data in a conversational format. The deck code has already been automatically decoded by the system, all card data retrieved from the database, and a complete analysis prepared. Your role is to present this authoritative, complete deck information confidently to the user - no re-decoding or interpretation needed.',
    parameters: {
      type: 'object',
      properties: {
        deckCode: {
          type: 'string',
          description: 'The Hearthstone deck code that was auto-processed by the system (e.g., AAECAZICBKqBB5KDB6+HB6yIBw2HnwSunwSA1ASB1ASiswbDugbW+gbggQf3gQeIgwewhwfAhwekiQcAAA==). The complete deck analysis is already prepared and ready for presentation.'
        }
      },
      required: ['deckCode']
    }
  }
};

export const FETCH_CARD_METADATA_FUNCTION = {
  type: 'function',
  function: {
    name: 'fetchCardMetadata',
    description: 'Fetch detailed card information from database using card IDs. Returns card names, mana costs, attack, health, text, class, type, and keywords for strategic analysis.',
    parameters: {
      type: 'object',
      properties: {
        cardIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of card IDs (DBF IDs) to look up detailed information for'
        }
      },
      required: ['cardIds']
    }
  }
};



export const EXPLORE_DECK_BUILDING_FUNCTION = {
  type: 'function',
  function: {
    name: 'exploreDeckBuilding',
    description: 'Execute flexible SQL queries for conversational deck building exploration. Can search any card criteria, explore synergies, and build decks incrementally through conversation.',
    parameters: {
      type: 'object',
      properties: {
        sqlQuery: {
          type: 'string',
          description: 'Custom SQL SELECT query using Hearthstone database schema. Must include c.collectible = true for playable cards. Example: SELECT c.name, c.mana_cost FROM cards c JOIN classes cl ON c.class_id = cl.id WHERE cl.name = %s AND c.mana_cost <= %s'
        },
        userIntent: {
          type: 'string',
          description: 'What the user is exploring (e.g., "finding aggressive early game cards", "looking for Hunter synergies", "exploring tribal options")'
        },
        buildingContext: {
          type: 'string',
          description: 'Current deck building progress or constraints (e.g., "already have early game covered", "focusing on Beast synergy", "need more removal")',
          default: 'Starting fresh deck exploration'
        }
      },
      required: ['sqlQuery', 'userIntent']
    }
  }
};

export const EXPLORE_CARDS_FUNCTION = {
  type: 'function',
  function: {
    name: 'exploreCards',
    description: 'Search cards using structured parameters with deterministic SQL generation. No AI fallbacks - pure structured input to database results. Use when user query can be expressed as structured filters.',
    parameters: {
      type: 'object',
      properties: {
        searchType: {
          type: 'string',
          enum: ['cards', 'synergies', 'archetypes', 'counters'],
          description: 'Type of search to perform',
          default: 'cards'
        },
        filters: {
          type: 'object',
          properties: {
            classes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Card classes (e.g., ["Hunter", "Mage"])'
            },
            rarities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Card rarities (e.g., ["Common", "Rare"])'
            },
            cardTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Card types (e.g., ["Minion", "Spell"])'
            },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords (e.g., ["Rush", "Taunt"])'
            },
            manaCost: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
                exact: { type: 'number' }
              },
              description: 'Mana cost constraints'
            },
            attack: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
                exact: { type: 'number' }
              },
              description: 'Attack value constraints'
            },
            health: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
                exact: { type: 'number' }
              },
              description: 'Health value constraints'
            },
            textContains: {
              type: 'array',
              items: { type: 'string' },
              description: 'Text search terms'
            },
            nameContains: {
              type: 'array',
              items: { type: 'string' },
              description: 'Name search terms'
            }
          },
          description: 'Search filters to apply'
        },
        output: {
          type: 'object',
          properties: {
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Fields to return (e.g., ["name", "mana_cost", "attack"])',
              default: ['name', 'mana_cost', 'attack', 'health', 'class_name']
            },
            orderBy: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                direction: { type: 'string', enum: ['ASC', 'DESC'] }
              },
              description: 'Sort order'
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return',
              default: 15,
              maximum: 50
            }
          },
          required: ['fields'],
          description: 'Output configuration'
        },
        context: {
          type: 'object',
          properties: {
            userIntent: { type: 'string' },
            buildingContext: { type: 'string' }
          },
          required: ['userIntent'],
          description: 'Context information'
        }
      },
      required: ['filters', 'output', 'context']
    }
  }
};

// Intent Detection Function - RUNS ON EVERY MESSAGE - Phase 1: Pure Classification
export const DETECT_USER_INTENT_FUNCTION = {
  type: 'function',
  function: {
    name: 'detectUserIntent',
    description: 'REQUIRED: Classify user message intent type with confidence score. Pure classification only - no parameter extraction. This function MUST be called on every user message to ensure proper system routing.',
    parameters: {
      type: 'object',
      properties: {
        userMessage: {
          type: 'string',
          description: 'The current user message to analyze for intent classification. Extract this from the most recent user message in the conversation.'
        },
        intentType: {
          type: 'string',
          enum: ['CARD_SEARCH', 'DECK_BUILDING', 'INQUIRY', 'GENERAL_CHAT', 'GREETING', 'QUESTION'],
          description: 'Primary intent category detected from user message'
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Confidence level in intent classification (0.0 to 1.0)'
        }
      },
      required: ['userMessage', 'intentType', 'confidence']
    }
  }
};

// Phase 2: Query Interpretation Function - Reasoning Layer
export const INTERPRET_USER_QUERY_FUNCTION = {
  type: 'function',
  function: {
    name: 'interpretUserQuery',
    description: 'Phase 2: Convert classified intent and user message into structured query specifications for AST execution. Provides domain reasoning and explicit assumptions.',
    parameters: {
      type: 'object',
      properties: {
        userMessage: {
          type: 'string',
          description: 'The original user message to interpret'
        },
        intentType: {
          type: 'string',
          enum: ['CARD_SEARCH', 'DECK_BUILDING', 'INQUIRY', 'GENERAL_CHAT', 'GREETING', 'QUESTION'],
          description: 'Intent type from Phase 1 classification'
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Classification confidence from Phase 1'
        },
        ambiguityInfo: {
          type: 'object',
          description: 'Optional ambiguity detection results',
          properties: {
            ambiguityScore: { type: 'number' },
            ambiguousTerms: { type: 'array', items: { type: 'string' } },
            clarificationNeeded: { type: 'boolean' }
          }
        },
        conversationContext: {
          type: 'array',
          items: { type: 'string' },
          description: 'Recent conversation history for context'
        }
      },
      required: ['userMessage', 'intentType', 'confidence']
    }
  }
};

// New AST-powered exploration function
export const EXPLORE_CARDS_AST_FUNCTION = {
  type: 'function',
  function: {
    name: 'exploreCardsAST',
    description: 'Intelligent card search for deck building using logical query structures. Designed for strategic card discovery with smart filtering, ordering, and result curation. Use this for all card searches - it handles everything from simple "Mage cards" to complex "early-game tempo cards with board presence".',
    parameters: {
      type: 'object',
      properties: {
        logicalQuery: {
          type: 'object',
          description: `Logical query structure for strategic card discovery. Use these proven deck-building patterns:

🎯 DECK-BUILDING QUERY PATTERNS:

Early Game (1-3 mana): Focus on board presence and tempo
{"type": "AND", "children": [
  {"type": "CONDITION", "field": "mana_cost", "operator": "BETWEEN", "value": {"min": 1, "max": 3}},
  {"type": "CONDITION", "field": "card_type", "operator": "EQUALS", "value": "Minion"}
]}

Mid Game (4-6 mana): Value and board control
{"type": "AND", "children": [
  {"type": "CONDITION", "field": "mana_cost", "operator": "BETWEEN", "value": {"min": 4, "max": 6}},
  {"type": "OR", "children": [
    {"type": "CONDITION", "field": "keywords", "operator": "CONTAINS_ANY", "value": ["Taunt", "Rush", "Battlecry"]},
    {"type": "CONDITION", "field": "attack", "operator": "GREATER_EQUAL", "value": 4}
  ]}
]}

Late Game (7+ mana): Game-ending threats
{"type": "AND", "children": [
  {"type": "CONDITION", "field": "mana_cost", "operator": "GREATER_EQUAL", "value": 7},
  {"type": "OR", "children": [
    {"type": "CONDITION", "field": "keywords", "operator": "CONTAINS", "value": "Battlecry"},
    {"type": "CONDITION", "field": "attack", "operator": "GREATER_EQUAL", "value": 6}
  ]}
]}

Class-Specific Synergy:
{"type": "AND", "children": [
  {"type": "CONDITION", "field": "class_name", "operator": "IN", "value": ["Hunter", "Neutral"]},
  {"type": "CONDITION", "field": "keywords", "operator": "CONTAINS_ANY", "value": ["Beast", "Rush"]}
]}

Utility/Removal Spells:
{"type": "AND", "children": [
  {"type": "CONDITION", "field": "card_type", "operator": "EQUALS", "value": "Spell"},
  {"type": "OR", "children": [
    {"type": "CONDITION", "field": "text", "operator": "ILIKE", "value": "deal damage"},
    {"type": "CONDITION", "field": "text", "operator": "ILIKE", "value": "destroy"}
  ]}
]}`,
          properties: {
            type: {
              type: 'string',
              enum: ['AND', 'OR', 'NOT', 'CONDITION'],
              description: 'Type of AST node - logical operator or leaf condition'
            },
            children: {
              type: 'array',
              description: 'Child nodes for logical operators (AND, OR, NOT)',
              items: { type: 'object' }
            },
            field: {
              type: 'string',
              description: 'Field name for CONDITION nodes (e.g., class_name, mana_cost, keywords)',
              enum: ['class_name', 'mana_cost', 'attack', 'health', 'text', 'keywords', 'card_type', 'rarity', 'minion_type', 'name', 'formats']
            },
            operator: {
              type: 'string',
              description: 'Comparison operator for CONDITION nodes',
              enum: ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GREATER_THAN', 'GREATER_EQUAL', 'LESS_THAN', 'LESS_EQUAL', 'BETWEEN', 'ILIKE', 'NOT_ILIKE', 'CONTAINS', 'CONTAINS_ALL', 'CONTAINS_ANY', 'NOT_CONTAINS']
            },
            value: {
              description: 'Value to compare against for CONDITION nodes. Can be string, number, array, or range object {min, max}'
            }
          },
          required: ['type']
        },
        output: {
          type: 'object',
          description: `Smart result formatting for deck building. Use these strategic configurations:

🎯 DECK-BUILDING OUTPUT STRATEGIES:

For Early Game Cards (prioritize stats and tempo):
{
  "fields": ["name", "mana_cost", "attack", "health", "keywords", "card_type"],
  "orderBy": [
    {"field": "mana_cost", "direction": "ASC"},
    {"field": "attack", "direction": "DESC"},
    {"field": "health", "direction": "DESC"}
  ],
  "limit": 15
}

For Utility/Removal (prioritize effect over stats):
{
  "fields": ["name", "mana_cost", "text", "keywords", "card_type", "class_name"],
  "orderBy": [
    {"field": "mana_cost", "direction": "ASC"},
    {"field": "name", "direction": "ASC"}
  ],
  "limit": 10
}

For Synergy Cards (show tribal/keyword connections):
{
  "fields": ["name", "mana_cost", "attack", "health", "keywords", "minion_type", "class_name"],
  "orderBy": [
    {"field": "keywords", "direction": "DESC"},
    {"field": "mana_cost", "direction": "ASC"}
  ],
  "limit": 12
}

For Diverse Deck Building (balanced representation):
{
  "fields": ["name", "mana_cost", "attack", "health", "keywords", "card_type", "class_name"],
  "orderBy": [
    {"field": "mana_cost", "direction": "ASC"},
    {"field": "card_type", "direction": "ASC"},
    {"field": "attack", "direction": "DESC"}
  ],
  "limit": 20
}`,
          properties: {
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Fields to include in results',
              default: ['name', 'mana_cost', 'attack', 'health', 'class_name', 'card_type']
            },
            orderBy: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  direction: { type: 'string', enum: ['ASC', 'DESC'] }
                }
              },
              description: 'Sort order specification'
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return',
              default: 15,
              maximum: 50
            }
          },
          required: ['fields']
        },
        context: {
          type: 'object',
          description: `Strategic context for intelligent card discovery. Provide clear intent for better results:

🎯 EFFECTIVE CONTEXT EXAMPLES:

For Deck Building:
{
  "userIntent": "Building an aggressive Hunter deck focused on early board control",
  "buildingContext": "Need 1-3 mana minions with good stats and Beast synergy"
}

For Card Discovery:
{
  "userIntent": "Finding removal spells for a control Mage deck",
  "buildingContext": "Looking for efficient ways to clear enemy minions"
}

For Synergy Exploration:
{
  "userIntent": "Exploring Dragon tribal cards for a Priest deck",
  "buildingContext": "Want cards that benefit from having Dragons in hand or play"
}

For Meta Analysis:
{
  "userIntent": "Analyzing powerful late-game threats",
  "buildingContext": "Comparing high-cost finisher cards across classes"
}

💡 CONTEXT TIPS:
- Be specific about deck archetype (aggro, control, midrange, combo)
- Mention key synergies or themes you're exploring
- Include mana range or game phase (early/mid/late game)
- Specify if you want class cards, neutrals, or both`,
          properties: {
            userIntent: {
              type: 'string',
              description: 'What the user is trying to accomplish'
            },
            buildingContext: {
              type: 'string',
              description: 'Deck building context or constraints'
            }
          },
          required: ['userIntent']
        }
      },
      required: ['logicalQuery', 'output', 'context']
    }
  }
};

// Natural language to AST conversion function
export const EXPLORE_CARDS_NATURAL_FUNCTION = {
  type: 'function',
  function: {
    name: 'exploreCardsNatural',
    description: 'Convert natural language card search into AST structure and execute. Use when user provides natural language that needs to be converted to logical structure.',
    parameters: {
      type: 'object',
      properties: {
        naturalQuery: {
          type: 'string',
          description: 'Natural language description of the card search (e.g., "Mage cards with Rush or Taunt, under 5 mana, not legendary")'
        },
        output: {
          type: 'object',
          description: 'Output specification for query results',
          properties: {
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Fields to include in results',
              default: ['name', 'mana_cost', 'attack', 'health', 'class_name', 'card_type']
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return',
              default: 15,
              maximum: 50
            }
          }
        },
        context: {
          type: 'object',
          description: 'Query context and user intent',
          properties: {
            userIntent: {
              type: 'string',
              description: 'What the user is trying to accomplish'
            },
            buildingContext: {
              type: 'string',
              description: 'Deck building context or constraints'
            }
          },
          required: ['userIntent']
        }
      },
      required: ['naturalQuery', 'context']
    }
  }
};

// Phase 2: Structured Query Execution Function - Consumes Reasoning Output
export const EXECUTE_STRUCTURED_QUERY_FUNCTION = {
  type: 'function',
  function: {
    name: 'executeStructuredQuery',
    description: 'Phase 2: Execute structured query specification from reasoning layer. Consumes pre-interpreted query conditions and output specifications.',
    parameters: {
      type: 'object',
      properties: {
        querySpec: {
          type: 'object',
          description: 'Structured query specification from reasoning layer',
          properties: {
            conditions: {
              type: 'array',
              items: { type: 'object' },
              description: 'Pre-compiled AST condition nodes from interpretation'
            },
            outputSpec: {
              type: 'object',
              description: 'Output specification with fields, ordering, limits',
              properties: {
                fields: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Fields to include in results'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum results to return'
                },
                orderBy: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      direction: { type: 'string', enum: ['ASC', 'DESC'] }
                    }
                  }
                }
              },
              required: ['fields']
            },
            context: {
              type: 'object',
              description: 'Query context from reasoning',
              properties: {
                userIntent: { type: 'string' },
                sessionId: { type: 'string' }
              }
            }
          },
          required: ['conditions', 'outputSpec', 'context']
        },
        reasoning: {
          type: 'object',
          description: 'Reasoning metadata for transparency',
          properties: {
            assumptions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Explicit assumptions made during interpretation'
            },
            clarificationSuggestions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Suggested follow-up questions'
            },
            confidence: {
              type: 'number',
              description: 'Interpretation confidence'
            }
          }
        }
      },
      required: ['querySpec']
    }
  }
};

export const AVAILABLE_FUNCTIONS = [
  DETECT_USER_INTENT_FUNCTION,        // Phase 1: Pure classification
  INTERPRET_USER_QUERY_FUNCTION,      // Phase 2: Reasoning layer
  EXECUTE_STRUCTURED_QUERY_FUNCTION,  // Phase 2: Structured execution
  ENCODE_DECK_FUNCTION,
  DECODE_DECK_FUNCTION,
  FETCH_CARD_METADATA_FUNCTION,
  EXPLORE_CARDS_AST_FUNCTION,         // Legacy AST function
  EXPLORE_CARDS_NATURAL_FUNCTION,     // Legacy natural language function
  // Legacy functions (will be deprecated)
  EXPLORE_DECK_BUILDING_FUNCTION,
  EXPLORE_CARDS_FUNCTION
];

// ===== INTENT-BASED FUNCTION EXPOSURE =====

// Hearthstone function - no callable params
export const HEARTHSTONE_FUNCTION = {
  type: 'function',
  function: {
    name: 'Hearthstone',
    description: `You are MetaForge, a casual AI assistant for Hearthstone players. Your role is to help with deck-building, card discovery, strategy discussion, and deck codes.

Speak casually — like a helpful teammate. Use brief greetings:
- "Hey!"
- "What's up?"
- "Sup?"

### IMPORTANT: Be concise. Match the user's energy. If they say "hey" just say "hey" back.

Never list or explain your capabilities unless directly asked "what can you do?" Just help naturally.

🧠 **How You Think:**

You understand player language and translate it smartly:
- "tribe/race/type" → minion types
- "Rush/Taunt/Battlecry" → card keywords  
- "deal damage/gain armor" → card text effects
- "Spell/Minion/Weapon" → card types
- "Common/Legendary" → card rarities
- "Mage/Warlock/Neutral" → card classes
- "standard/wild" → game formats
- "attack/health/mana" → card stats`,
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
};

// Functions for casual interactions (greetings, general chat)
export const CASUAL_FUNCTIONS = [HEARTHSTONE_FUNCTION]; // Hearthstone context function

// Functions for structured card operations
export const STRUCTURED_FUNCTIONS = [
  INTERPRET_USER_QUERY_FUNCTION,      // Phase 2: Reasoning layer
  EXECUTE_STRUCTURED_QUERY_FUNCTION,  // Phase 2: Structured execution
  FETCH_CARD_METADATA_FUNCTION,
  EXPLORE_CARDS_AST_FUNCTION,         // Legacy AST function
  EXPLORE_CARDS_NATURAL_FUNCTION,     // Legacy natural language function
  // Legacy functions (will be deprecated)
  EXPLORE_DECK_BUILDING_FUNCTION,
  EXPLORE_CARDS_FUNCTION
];

// Pure chat - no functions exposed
export const NO_FUNCTIONS: any[] = [];

// ===== TOKEN OPTIMIZATION SYSTEM =====

interface MessageTrimOptions {
  maxMessages: number;
  maxTokens: number;
  preserveSystemPrompt: boolean;
}

/**
 * CRITICAL: Trim conversation history to prevent exponential token growth
 * Implements sliding window approach to maintain recent context while reducing costs
 */
function trimConversationHistory(
  messages: GrokMessage[],
  options: MessageTrimOptions = {
    maxMessages: 8,
    maxTokens: 6000,
    preserveSystemPrompt: true
  }
): GrokMessage[] {
  // Always preserve system prompt (first message) if it exists
  const systemPrompt = options.preserveSystemPrompt && messages[0]?.role === 'system'
    ? [messages[0]]
    : [];

  const conversationMessages = options.preserveSystemPrompt
    ? messages.slice(1)
    : messages;

  // Keep only recent messages (sliding window)
  const recentMessages = conversationMessages.slice(-options.maxMessages);

  // Estimate token count (1 token ≈ 4 characters for English)
  const estimateTokens = (msgs: GrokMessage[]) => {
    const textContent = msgs.map(m => {
      const content = m.content?.[0];
      if (typeof content === 'string') return content;
      return content?.text || '';
    }).join(' ');
    return Math.ceil(textContent.length / 4);
  };

  // Trim by token count if still too large
  let currentTokens = estimateTokens(systemPrompt);
  const trimmedByTokens = [];

  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokens([recentMessages[i]]);
    if (currentTokens + messageTokens <= options.maxTokens) {
      trimmedByTokens.unshift(recentMessages[i]);
      currentTokens += messageTokens;
    } else {
      break;
    }
  }

  const finalMessages = [...systemPrompt, ...trimmedByTokens];

  // Log optimization results
  const logger = createServerLogger('token-optimization');
  logger.info('PERFORMANCE', {
    operation: 'conversation_trimming',
    originalMessages: messages.length,
    trimmedMessages: finalMessages.length,
    reductionPercentage: Math.round(((messages.length - finalMessages.length) / messages.length) * 100),
    estimatedTokens: currentTokens,
    tokenOptimizationActive: true
  });

  return finalMessages;
}



// 🗑️ REMOVED: testExploreDeckBuilding - Legacy test function eliminated in Stage 2 cleanup

/**
 * Test function for DBF ID encoding
 */
export async function testDbfIdEncoding(): Promise<void> {
  console.log('🧪 Testing DBF ID encoding...');

  // Test with your DBF IDs
  const testDbfIds = [
    103530, 103530,  // 2x Wound Prey
    120786,          // 1x Zergling
    113116, 113116,  // 2x Evolution Chamber
    106574, 106574,  // 2x Extraterrestrial Egg
    115191, 115191,  // 2x Nerubian Egg
    120429, 120429,  // 2x Patchwork Pals
    103531, 103531,  // 2x Spawning Pool
    66861,           // 1x Terrorscale Stalker
    108887,          // 1x Amphibian's Spirit
    109662, 109662,  // 2x Hydralisk
    114884, 114884,  // 2x Nydus Worm
    69616,           // 1x Terrible Chef
    117302,          // 1x Workhorse
    66856,           // 1x R.C. Rampage
    103529,          // 1x Zilliax Deluxe 3000
    116673, 116673,  // 2x Pylon Module
    114849,          // 1x Ticking Module
    105472,          // 1x Kerrigan, Queen of Blades
    113321,          // 1x Additional card
    114213, 114213   // 2x Additional card
  ];

  const result = await handleBuildDeck({
    heroClass: 'Hunter',
    format: 'Standard',
    deckName: 'Test Zerg Hunter',
    dbfIds: testDbfIds
  });

  if (result.success) {
    console.log('✅ DBF ID encoding successful!');
    console.log('🎯 Deck Code:', result.deckCode);
    console.log('📋 Formatted Deck:', result.formattedDeck?.substring(0, 200) + '...');
  } else {
    console.log('❌ DBF ID encoding failed:', result.error);
  }
}

// Hero class to DBF ID mapping
const HERO_CLASS_TO_DBF: Record<string, number> = {
  'Druid': 274,
  'Hunter': 31,
  'Mage': 637,
  'Paladin': 671,
  'Priest': 813,
  'Rogue': 930,
  'Shaman': 1066,
  'Warlock': 893,
  'Warrior': 7,
  'Demon Hunter': 56550
};

// Format mapping - CONFIRMED VALUES from deckstrings v3.1.2 test
// FT_WILD: 1, FT_STANDARD: 2, FT_CLASSIC: 3, FT_TWIST: 4
const FORMAT_MAPPING: Record<string, FormatType> = {
  'Standard': 2, // FT_STANDARD (confirmed)
  'Wild': 1,     // FT_WILD (confirmed)
  'Classic': 3   // FT_CLASSIC (confirmed)
};

/**
 * ORIGINAL: Get card DBF IDs from card names using PostgreSQL database (preserved as fallback)
 * Replaces the previous mock card database with real database lookup
 */
export async function originalGetCardDbfIds(cardNames: string[]): Promise<Record<string, number>> {
  try {
    OptimizedConsole.info(`🔍 Looking up ${cardNames.length} card names in PostgreSQL database...`);

    // Validate input
    if (!cardNames || cardNames.length === 0) {
      OptimizedConsole.warn('⚠️ No card names provided for lookup');
      return {};
    }

    // Filter out empty/invalid card names
    const validCardNames = cardNames.filter(name => name && typeof name === 'string' && name.trim().length > 0);
    if (validCardNames.length === 0) {
      OptimizedConsole.warn('⚠️ No valid card names found after filtering');
      return {};
    }

    // PostgreSQL query to find cards by name - use individual parameters like AST queries
    const placeholders = validCardNames.map((_, index) => `%s`).join(', ');
    const query = `
      SELECT c.id, c.name
      FROM cards c
      WHERE c.name IN (${placeholders})
      AND c.collectible = true
    `;
    const params = validCardNames;

    // Call Lambda API with automatic network resilience
    const result = await executeLambdaQuery(query, params, 'card_name_lookup');

    if (!result.success) {
      OptimizedConsole.error('❌ Database lookup failed:', result.error);
      return {}; // Return empty object on failure - graceful degradation
    }

    // Convert database result to name → dbfId mapping
    const cardDbfIds: Record<string, number> = {};
    if (result.data && Array.isArray(result.data)) {
      for (const card of result.data) {
        if (card.name && card.id) {
          cardDbfIds[card.name] = card.id;
        }
      }
    }

    OptimizedConsole.info(`✅ Found ${Object.keys(cardDbfIds).length}/${validCardNames.length} cards in database`);

    // Log missing cards for debugging
    const foundNames = Object.keys(cardDbfIds);
    const missingNames = validCardNames.filter(name => !foundNames.includes(name));
    if (missingNames.length > 0) {
      OptimizedConsole.warn(`⚠️ Cards not found in database: ${missingNames.join(', ')}`);
    }

    return cardDbfIds;

  } catch (error) {
    OptimizedConsole.error('❌ Error looking up card names:', error);
    return {}; // Return empty object on error - graceful degradation
  }
}

/**
 * AST-powered card name to ID lookup (replaces QueryMaster AI)
 * Production implementation for deck encoding operations
 */
export async function getCardDbfIdsAST(cardNames: string[]): Promise<Record<string, number>> {
  console.log(`🔍 AST Production: Looking up ${cardNames.length} card names...`);

  // Build AST query for name lookup
  const astQuery: ASTNode = createLogicalNode('AND', [
    createConditionNode('name', 'IN', cardNames),
    createConditionNode('collectible', 'EQUALS', true)
  ]);

  const output: ASTOutputSpecification = {
    fields: ['id', 'name'],
    limit: 100 // Allow more than default for large deck lists
  };

  const context: ASTQueryContext = {
    userIntent: 'Card name to ID lookup for deck encoding'
  };

  // Execute AST query - let errors bubble up for fallback handling
  const result = await handleExploreCardsAST({
    logicalQuery: astQuery,
    output,
    context
  });

  if (!result.success || !result.data) {
    throw new Error(`AST card name lookup failed: ${result.error || 'No data returned'}`);
  }

  // Convert to name → id mapping
  const mapping: Record<string, number> = {};
  result.data.forEach((card: any) => {
    if (card.name && card.id) {
      mapping[card.name] = card.id;
    }
  });

  console.log(`✅ AST Production: Found ${Object.keys(mapping).length}/${cardNames.length} cards`);
  return mapping;
}

/**
 * AST-powered card metadata lookup (replaces QueryMaster AI)
 * Production implementation for deck decoding operations
 */
export async function fetchCardMetadataAST(cardIds: number[]): Promise<any[]> {
  // Use optimized logging for AST production
  const { createOptimizedGrokLogger, OptimizedConsole } = require('../logging/optimized-logger');
  const astLogger = createOptimizedGrokLogger();

  OptimizedConsole.info(`🔍 AST Production: Fetching metadata for ${cardIds.length} cards...`);

  // Build AST query for metadata lookup
  const astQuery: ASTNode = createConditionNode('id', 'IN', cardIds);

  const output: ASTOutputSpecification = {
    fields: [
      'id', 'name', 'mana_cost', 'attack', 'health', 'text',
      'class_name', 'card_type', 'rarity', 'keywords'
    ],
    limit: 100, // Allow more than default for large decks
    orderBy: [{ field: 'mana_cost', direction: 'ASC' }]
  };

  const context: ASTQueryContext = {
    userIntent: 'Card metadata lookup for deck decoding'
  };

  // Execute AST query - let errors bubble up for fallback handling
  const result = await handleExploreCardsAST({
    logicalQuery: astQuery,
    output,
    context
  });

  if (!result.success || !result.data) {
    throw new Error(`AST card metadata lookup failed: ${result.error || 'No data returned'}`);
  }

  console.log(`✅ AST Production: Retrieved metadata for ${result.data.length} cards`);
  return result.data;
}

/**
 * Auto-detect class from card names using PostgreSQL database
 * Format is now provided by Grok (user input) - no longer auto-detected
 * Follows the established Lambda API gateway pattern
 */
async function autoDetectClass(cardNames: string[]): Promise<{
  heroClass: string;
  confidence: number;
  analysis: string;
}> {
  try {
    console.log(`🔍 Auto-detecting class and format from ${cardNames.length} card names...`);

    // Validate input
    if (!cardNames || cardNames.length === 0) {
      return { heroClass: 'Druid', confidence: 0, analysis: 'No cards provided' };
    }

    // PostgreSQL query following established pattern (only need class_id, not format)
    const placeholders = cardNames.map((_, index) => `%s`).join(', ');
    const query = `
      SELECT c.id, c.name, c.class_id
      FROM cards c
      WHERE c.name IN (${placeholders})
      AND c.collectible = true
    `;
    const params = cardNames;

    // Call Lambda API with automatic network resilience (following established pattern)
    const result = await executeLambdaQuery(query, params, 'auto_detect_class_only');

    if (!result.success) {
      console.error('❌ Auto-detection database lookup failed:', result.error);
      return { heroClass: 'Druid', confidence: 0, analysis: 'Database lookup failed' };
    }

    // Process results following established pattern
    const classVotes: Record<number, number> = {};

    if (result.data && Array.isArray(result.data)) {
      console.log(`🔍 Database returned ${result.data.length} card records for class auto-detection:`);

      for (const card of result.data) {
        console.log(`📊 Card: "${card.name}" -> class_id: ${card.class_id}`);

        // Count class votes (exclude neutral = 12)
        if (card.class_id && card.class_id !== 12) {
          classVotes[card.class_id] = (classVotes[card.class_id] || 0) + 1;
        }
      }

      console.log(`🗳️ Class votes:`, classVotes);
    }

    // Determine dominant class
    const classIds = Object.keys(classVotes).map(id => parseInt(id));
    if (classIds.length === 0) {
      return { heroClass: 'Druid', confidence: 0, analysis: 'No class-specific cards found' };
    }

    const dominantClassId = classIds.reduce((a, b) =>
      classVotes[a] > classVotes[b] ? a : b
    );

    // Map class ID to class name (CORRECTED based on official Blizzard API)
    const classIdToName: Record<number, string> = {
      1: 'Death Knight', 2: 'Druid', 3: 'Hunter', 4: 'Mage', 5: 'Paladin',
      6: 'Priest', 7: 'Rogue', 8: 'Shaman', 9: 'Warlock', 10: 'Warrior', 14: 'Demon Hunter'
    };

    const heroClass = classIdToName[dominantClassId] || 'Druid';

    // Calculate confidence
    const totalClassCards = Object.values(classVotes).reduce((a, b) => a + b, 0);
    const dominantClassCount = classVotes[dominantClassId] || 0;
    const confidence = totalClassCards > 0 ? (dominantClassCount / totalClassCards) * 100 : 0;

    const analysis = `Found ${dominantClassCount}/${totalClassCards} class-specific cards for ${heroClass}`;

    console.log(`✅ Auto-detected class: ${heroClass} (${confidence.toFixed(1)}% confidence)`);

    return { heroClass, confidence, analysis };

  } catch (error) {
    console.error('❌ Auto-detection failed:', error);
    return { heroClass: 'Druid', confidence: 0, analysis: 'Error during detection' };
  }
}

/**
 * Auto-detect class from DBF IDs using PostgreSQL database
 * Format is now provided by Grok (user input) - no longer auto-detected
 * Follows the established Lambda API gateway pattern
 */
async function autoDetectClassFromDbfIds(dbfIds: number[]): Promise<{
  heroClass: string;
  confidence: number;
  analysis: string;
}> {
  try {
    console.log(`🔍 Auto-detecting class from ${dbfIds.length} DBF IDs...`);

    // Validate input
    if (!dbfIds || dbfIds.length === 0) {
      return { heroClass: 'Druid', confidence: 0, analysis: 'No DBF IDs provided' };
    }

    // PostgreSQL query following established pattern (only need class_id, not format)
    const placeholders = dbfIds.map((_, index) => `%s`).join(', ');
    const query = `
      SELECT c.id, c.name, c.class_id
      FROM cards c
      WHERE c.id IN (${placeholders})
      AND c.collectible = true
    `;
    const params = dbfIds;

    // Call Lambda API with automatic network resilience (following established pattern)
    const result = await executeLambdaQuery(query, params, 'auto_detect_class_from_dbf_ids');

    if (!result.success) {
      console.error('❌ Auto-detection from DBF IDs failed:', result.error);
      return { heroClass: 'Druid', confidence: 0, analysis: 'Database lookup failed' };
    }

    // Process results following established pattern
    const classVotes: Record<number, number> = {};

    if (result.data && Array.isArray(result.data)) {
      console.log(`🔍 Database returned ${result.data.length} card records for class auto-detection:`);

      for (const card of result.data) {
        console.log(`📊 Card: "${card.name}" -> class_id: ${card.class_id}`);

        // Count class votes (exclude neutral = 12)
        if (card.class_id && card.class_id !== 12) {
          classVotes[card.class_id] = (classVotes[card.class_id] || 0) + 1;
        }
      }

      console.log(`🗳️ Class votes:`, classVotes);
    }

    // Determine dominant class
    const classIds = Object.keys(classVotes).map(id => parseInt(id));
    if (classIds.length === 0) {
      return { heroClass: 'Druid', confidence: 0, analysis: 'No class-specific cards found' };
    }

    const dominantClassId = classIds.reduce((a, b) =>
      classVotes[a] > classVotes[b] ? a : b
    );

    const classIdToName: Record<number, string> = {
      1: 'Death Knight', 2: 'Druid', 3: 'Hunter', 4: 'Mage', 5: 'Paladin',
      6: 'Priest', 7: 'Rogue', 8: 'Shaman', 9: 'Warlock', 10: 'Warrior', 14: 'Demon Hunter'
    };

    const heroClass = classIdToName[dominantClassId] || 'Druid';
    const totalClassCards = Object.values(classVotes).reduce((a, b) => a + b, 0);
    const dominantClassCount = classVotes[dominantClassId] || 0;
    const confidence = totalClassCards > 0 ? (dominantClassCount / totalClassCards) * 100 : 0;
    const analysis = `Found ${dominantClassCount}/${totalClassCards} class-specific cards for ${heroClass}`;

    console.log(`✅ Auto-detected class from DBF IDs: ${heroClass} (${confidence.toFixed(1)}% confidence)`);

    return { heroClass, confidence, analysis };

  } catch (error) {
    console.error('❌ Auto-detection from DBF IDs failed:', error);
    return { heroClass: 'Druid', confidence: 0, analysis: 'Error during detection' };
  }
}

/**
 * Parse deck list from natural language text - supports both newline AND comma-separated formats
 */
function parseDeckList(deckListText: string): {
  heroClass?: string;
  format?: string;
  deckName?: string;
  cards: Array<{ name: string; count: number }>;
  dbfIds?: number[];
} {
  console.log('🔍 Parsing deck list:', deckListText.substring(0, 300) + '...');

  // First split by newlines to handle metadata and structured formats
  const lines = deckListText.split('\n').map(line => line.trim()).filter(line => line);

  let heroClass: string | undefined;
  let format: string | undefined;
  let deckName: string | undefined;
  const cards: Array<{ name: string; count: number }> = [];
  const dbfIds: number[] = [];

  // Process each line for metadata and cards
  for (const line of lines) {
    // Extract class
    if (line.toLowerCase().includes('class:') || line.toLowerCase().includes('hero:')) {
      const match = line.match(/(?:class|hero):\s*(\w+)/i);
      if (match) heroClass = match[1];
      continue;
    }

    // Extract format
    if (line.toLowerCase().includes('format:')) {
      const match = line.match(/format:\s*(\w+)/i);
      if (match) format = match[1];
      continue;
    }

    // Extract deck name
    if (line.startsWith('###') || line.startsWith('# ') && !line.includes('x ')) {
      deckName = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    // Check for DBF ID arrays
    if (line.includes('[') && line.includes(']')) {
      const arrayMatch = line.match(/\[([^\]]+)\]/);
      if (arrayMatch) {
        const ids = arrayMatch[1].split(',').map(id => parseInt(id.trim().replace(/"/g, ''))).filter(id => !isNaN(id));
        dbfIds.push(...ids);
      }
      continue;
    }

    // ENHANCED: Parse cards from BOTH newline-separated AND comma-separated formats
    parseCardsFromLine(line, cards);
  }

  console.log(`✅ Parsed ${cards.length} cards from deck list`);
  return { heroClass, format, deckName, cards, dbfIds: dbfIds.length > 0 ? dbfIds : undefined };
}

/**
 * Smart comma splitting that preserves card names with commas
 * Distinguishes between commas that separate cards vs commas within card names
 */
function smartCommaSplit(line: string): string[] {
  // If the line doesn't contain commas, return as single entry
  if (!line.includes(',')) {
    return [line.trim()].filter(entry => entry);
  }

  // Check if this looks like a single card with quantity prefix (e.g., "2x Gnomelia, S.A.F.E. Pilot")
  // Pattern: starts with number + 'x' + space, then card name with possible commas
  const singleCardWithQuantityMatch = line.match(/^\s*\d+x?\s+.+$/);
  if (singleCardWithQuantityMatch) {
    return [line.trim()];
  }

  // Check if this looks like a single card name without quantity (e.g., "Gnomelia, S.A.F.E. Pilot")
  // Heuristic: if there are no numbers or 'x' characters, treat as single card name
  const hasQuantityIndicators = /\d+x?|\bx\b/i.test(line);
  if (!hasQuantityIndicators) {
    return [line.trim()];
  }

  // For complex cases, split by comma but try to be smart about it
  // Look for patterns like "2x CardName, 1x OtherCard" vs "CardName, Part of Name"
  const parts = line.split(',').map(part => part.trim());
  const smartEntries: string[] = [];
  let currentEntry = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // If this part starts with a quantity (e.g., "2x", "1x"), it's likely a new card
    const startsWithQuantity = /^\s*\d+x?\s+/.test(part);

    if (startsWithQuantity && currentEntry) {
      // Save the previous entry and start a new one
      smartEntries.push(currentEntry.trim());
      currentEntry = part;
    } else if (startsWithQuantity && !currentEntry) {
      // Start a new entry
      currentEntry = part;
    } else {
      // This part doesn't start with quantity, so it's likely part of the current card name
      currentEntry += (currentEntry ? ', ' : '') + part;
    }
  }

  // Don't forget the last entry
  if (currentEntry) {
    smartEntries.push(currentEntry.trim());
  }

  return smartEntries.filter(entry => entry);
}

/**
 * Parse cards from a single line - handles both individual cards and comma-separated lists
 */
function parseCardsFromLine(line: string, cards: Array<{ name: string; count: number }>): void {
  // Skip obvious metadata lines
  if (line.toLowerCase().includes('class:') || line.toLowerCase().includes('format:') ||
      line.toLowerCase().includes('deck:') || line.toLowerCase().includes('total:') ||
      line.toLowerCase().includes('strategy:') || line.length < 3) {
    return;
  }

  // CRITICAL FIX: Smart comma splitting to handle comma-separated lists while preserving card names with commas
  // First, try to detect if this line contains multiple cards or just one card with commas in the name
  const entries = smartCommaSplit(line);

  for (const entry of entries) {
    // Extract cards (format: "2x Card Name", "1x (3) Card Name", or just "Card Name 2")
    // Enhanced regex to handle various formats including the problematic comma-separated format
    const cardMatch = entry.match(/(?:#\s*)?(?:(\d+)x?\s+)?(?:\(\d+\)\s+)?(.+?)(?:\s+(\d+))?$/);

    if (cardMatch) {
      const countFromPrefix = cardMatch[1] ? parseInt(cardMatch[1]) : undefined;
      const countFromSuffix = cardMatch[3] ? parseInt(cardMatch[3]) : undefined;
      const cardName = cardMatch[2].trim();

      // Determine count: prefix takes priority, then suffix, then default to 1
      const count = countFromPrefix || countFromSuffix || 1;

      // Validate count and card name
      if (count >= 1 && count <= 2 && cardName && cardName.length > 1) {
        // Clean up card name (remove any remaining formatting artifacts)
        const cleanName = cardName.replace(/^\d+x?\s*/, '').replace(/\s+\d+$/, '').trim();
        if (cleanName && !cleanName.match(/^[\d\s]+$/)) { // Avoid pure numbers
          cards.push({ name: cleanName, count });
          console.log(`📋 Parsed card: ${count}x ${cleanName}`);
        }
      }
    }
  }
}

/**
 * ORIGINAL: Handle encode deck function call (preserved as fallback)
 */
export async function originalHandleEncodeDeck(request: {
  deckList: string;
  heroClass?: string;
  format?: string;
  deckName?: string;
}): Promise<BuildDeckResponse> {
  try {
    // Parse the deck list
    const parsed = parseDeckList(request.deckList);

    // AUTO-DETECT CLASS: Override any user-provided class
    // USE GROK-PROVIDED FORMAT: Grok will ask user for format
    let heroClass: string;
    let format: string;

    // Format must be provided by Grok (user input) - required parameter
    format = request.format || 'Standard'; // Fallback to Standard if somehow not provided
    console.log(`📅 Using format: ${format} (provided by Grok)`);

    if (parsed.cards && parsed.cards.length > 0) {
      // Auto-detect ONLY class from card names
      console.log('🤖 Auto-detecting class from card names (overriding any user input)...');
      const cardNames = parsed.cards.map(card => card.name);
      console.log(`📋 Parsed card names for auto-detection: ${cardNames.join(', ')}`);
      const detection = await autoDetectClass(cardNames);
      heroClass = detection.heroClass;
      console.log(`🎯 Auto-detection result: ${detection.analysis} (${detection.confidence.toFixed(1)}% confidence)`);

    } else if (parsed.dbfIds && parsed.dbfIds.length > 0) {
      // Auto-detect ONLY class from DBF IDs
      console.log('🤖 Auto-detecting class from DBF IDs (overriding any user input)...');
      const detection = await autoDetectClassFromDbfIds(parsed.dbfIds);
      heroClass = detection.heroClass;
      console.log(`🎯 Auto-detection result: ${detection.analysis} (${detection.confidence.toFixed(1)}% confidence)`);

    } else {
      // No cards to analyze - use fallback
      console.log('⚠️ No cards provided for auto-detection - using fallback values');
      heroClass = request.heroClass || parsed.heroClass || 'Druid';
    }

    // Log if we're overriding user input for class
    if (request.heroClass && request.heroClass !== heroClass) {
      console.log(`⚠️ Overriding user-provided class "${request.heroClass}" with detected "${heroClass}"`);
    }

    const deckName = request.deckName || parsed.deckName;

    // Use the existing buildDeck logic
    const buildRequest: BuildDeckRequest = {
      heroClass,
      format: format as 'Standard' | 'Wild' | 'Classic',
      deckName,
      cards: parsed.dbfIds ? undefined : parsed.cards,
      dbfIds: parsed.dbfIds
    };

    return await handleBuildDeck(buildRequest);

  } catch (error) {
    console.error('Error encoding deck:', error);
    return {
      success: false,
      error: `Failed to encode deck: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Hardcoded fallback for common Hearthstone cards when database is unavailable
 */
function getHardcodedCardIds(cardNames: string[]): Record<string, number> {
  const hardcodedCards: Record<string, number> = {
    // Common Warlock cards
    'Sire Denathrius': 78065,
    'Twisting Nether': 398,
    'Cataclysm': 1003,
    'Hellfire': 306,
    'Defile': 42790,
    'Voidwalker': 340,
    'Flame Imp': 85,
    'Kobold Librarian': 43158,
    'Vulgar Homunculus': 43417,
    'Imp Gang Boss': 2031,
    'Despicable Dreadlord': 42447,
    'Voidlord': 43294,
    'Abyssal Summoner': 42024,
    'Dread Infernal': 170,
    'Felguard': 119,
    'Doomguard': 507,
    'Aranasi Broodmother': 49184,
    'Dark Pact': 43339,
    'Touch of the Nathrezim': 78062,
    "Malchezaar's Imp": 39117,

    // Common Neutral cards
    'Loatheb': 7746,
    'Sludge Belcher': 7749,
    'Antique Healbot': 12227,
    'Abomination': 597,
    'Anubisath Sentinel': 27210,
    "Al'ar": 78063,
    'Amorphous Slime': 78064,
    'Black Hole': 78066,
    'Crane Game': 78067
  };

  const result: Record<string, number> = {};
  for (const cardName of cardNames) {
    if (hardcodedCards[cardName]) {
      result[cardName] = hardcodedCards[cardName];
      console.log(`✅ Found hardcoded ID for ${cardName}: ${hardcodedCards[cardName]}`);
    }
  }

  return result;
}

/**
 * Transform AI-generated deck data into parseable format
 */
function transformDeckInput(deckList: string): string {
  console.log('🔄 Input deck list:', deckList.substring(0, 500) + '...');

  // If it's already in the expected format, return as-is
  if (deckList.includes('x ') && !deckList.includes('|') && !deckList.includes('\t') && !deckList.includes('Card Name')) {
    console.log('✅ Deck list already in correct format');
    return deckList;
  }

  // Transform table format to parseable format
  const lines = deckList.split('\n').map(line => line.trim()).filter(line => line);
  const transformedLines: string[] = [];

  console.log(`🔍 Processing ${lines.length} lines for transformation`);

  for (const line of lines) {
    // Skip headers, separators, and metadata
    if (line.includes('Card Name') || line.includes('---') ||
        line.includes('Mana Cost') || line.includes('Type') ||
        line.includes('Attack') || line.includes('Health') ||
        line.includes('Keywords') || line.includes('Text') ||
        line.includes('Count') || line.length < 3 ||
        line.includes('Hero Class') || line.includes('Format') ||
        line.includes('Total Cards') || line.includes('Strategy')) {
      continue;
    }

    // Handle lines that already look like "2x Card Name" or "1x Card Name"
    const alreadyFormattedMatch = line.match(/^(\d+)x\s+(.+)$/);
    if (alreadyFormattedMatch) {
      transformedLines.push(line);
      continue;
    }

    // Handle tab-separated format: "CardName\tManaCost\tType\t...\tCount"
    if (line.includes('\t')) {
      const parts = line.split('\t').map(p => p.trim()).filter(p => p);
      if (parts.length >= 2) {
        const cardName = parts[0];
        const count = parts[parts.length - 1]; // Count is last column

        // Validate count is a number
        const countMatch = count.match(/^(\d+)$/);
        if (countMatch && cardName && cardName !== '-') {
          transformedLines.push(`${countMatch[1]}x ${cardName}`);
          console.log(`✅ Transformed tab format: ${countMatch[1]}x ${cardName}`);
        }
      }
    }

    // Handle space-separated format: "CardName ManaCost Type ... Count"
    else {
      // Try to match pattern where card name comes first, followed by stats, ending with count
      const parts = line.split(/\s+/);
      if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1];
        const countMatch = lastPart.match(/^(\d+)$/);
        if (countMatch) {
          // Find where the card name ends (before first number that's not part of name)
          let nameEndIndex = 0;
          for (let i = 0; i < parts.length - 1; i++) {
            if (/^\d+$/.test(parts[i])) {
              nameEndIndex = i;
              break;
            }
          }

          if (nameEndIndex > 0) {
            const cardName = parts.slice(0, nameEndIndex).join(' ');
            const count = countMatch[1];
            if (cardName && count) {
              transformedLines.push(`${count}x ${cardName}`);
              console.log(`✅ Transformed space format: ${count}x ${cardName}`);
            }
          }
        }
      }
    }
  }

  // If we found transformed lines, use them; otherwise return original
  if (transformedLines.length > 0) {
    console.log(`🔄 Successfully transformed ${transformedLines.length} cards from AI format`);
    const result = transformedLines.join('\n');
    console.log('🔄 Final transformed result:', result.substring(0, 300) + '...');
    return result;
  }

  console.log('⚠️ No transformation applied, returning original');
  return deckList;
}

/**
 * Handle encode deck function call (QueryMaster Integration - Hybrid Split)
 */
export async function handleEncodeDeck(request: {
  deckList: string;
  heroClass?: string;
  format?: string;
  deckName?: string;
}): Promise<BuildDeckResponse> {
  try {
    // TRANSFORMATION LAYER: Convert AI output to expected format
    const transformedDeckList = transformDeckInput(request.deckList);
    console.log('🔄 Deck list transformation:', {
      original: request.deckList.substring(0, 200) + '...',
      transformed: transformedDeckList.substring(0, 200) + '...'
    });

    // PART 1: MetaForge handles deck list parsing (exactly as original)
    const parsed = parseDeckList(transformedDeckList);
    if (!parsed.cards || parsed.cards.length === 0) {
      // If transformation failed, try original parsing as fallback
      const originalParsed = parseDeckList(request.deckList);
      if (!originalParsed.cards || originalParsed.cards.length === 0) {
        return { success: false, error: "No valid cards found in deck list" };
      }
      // Use original parsed data if transformation didn't work
      Object.assign(parsed, originalParsed);
    }

    // CONTEXT EXTRACTION: Try to extract hero class and format from AI context
    if (!parsed.heroClass && !request.heroClass) {
      // Look for class mentions in the deck list text
      const classMatch = request.deckList.match(/(?:Hero Class|Class):\s*(\w+)/i) ||
                        request.deckList.match(/(\w+)\s+(?:Wild|Standard)\s+deck/i) ||
                        request.deckList.match(/this\s+(\w+)\s+deck/i);
      if (classMatch) {
        parsed.heroClass = classMatch[1];
        console.log(`🎯 Extracted hero class from context: ${parsed.heroClass}`);
      }
    }

    if (!parsed.format && !request.format) {
      // Look for format mentions in the deck list text
      const formatMatch = request.deckList.match(/Format:\s*(Wild|Standard|Classic)/i) ||
                         request.deckList.match(/(Wild|Standard|Classic)\s+deck/i);
      if (formatMatch) {
        parsed.format = formatMatch[1];
        console.log(`🎯 Extracted format from context: ${parsed.format}`);
      }
    }

    // Extract card names for database lookup
    const cardNames = parsed.cards.map(card => card.name);

    // PART 2: Delegate card name->ID lookup to AST/QueryMaster/SQL
    let cardDbfIds: Record<string, number> = {};
    const USE_AST_FOR_LOOKUPS = process.env.USE_AST_FOR_LOOKUPS === 'true';

    if (USE_AST_FOR_LOOKUPS) {
      try {
        cardDbfIds = await getCardDbfIdsAST(cardNames);

        // Check if we got all cards
        const missingCards = cardNames.filter(name => !cardDbfIds[name]);
        if (missingCards.length > 0) {
          console.warn(`⚠️ AST Production: Missing cards: ${missingCards.join(', ')}, trying fallback`);
          throw new Error(`Missing cards: ${missingCards.join(', ')}`);
        }
      } catch (error) {
        console.warn('⚠️ AST Production: Name lookup failed, using original implementation fallback');
        // 🗑️ REMOVED: QueryMaster fallback - Stage 3 cleanup
        // Direct fallback to original implementation since QueryMaster is eliminated
        cardDbfIds = await originalGetCardDbfIds(cardNames);
      }
    } else {
      // 🗑️ REMOVED: QueryMaster branch - Stage 3 cleanup
      try {
        const result = await queryMaster.executeQuery({
          functionName: 'getCardDbfIds',
          parameters: { cardNames },
          intent: `Convert card names to DBF IDs for deck encoding`,
          context: `Looking up ${cardNames.length} card names`
        });

        if (result.success && result.data && result.data[0]) {
          cardDbfIds = result.data[0];
        } else {
          throw new Error(result.error || 'Failed to lookup card names');
        }

      } catch (error) {
        console.warn('⚠️ QueryMaster name lookup failed, using SQL fallback');
        cardDbfIds = await originalGetCardDbfIds(cardNames);
      }
    }

    // 🗑️ REMOVED: QueryMaster branch - Stage 3 cleanup
    // Direct use of original implementation since QueryMaster is eliminated
    if (!cardDbfIds) {
      console.log('🔄 Falling back to original card lookup method');
      cardDbfIds = await originalGetCardDbfIds(cardNames);
    }

    // FALLBACK: If database lookup fails, try hardcoded common cards
    if (!cardDbfIds || Object.keys(cardDbfIds).length === 0) {
      console.log('⚠️ Database lookup failed, using hardcoded fallback for common cards');
      cardDbfIds = getHardcodedCardIds(cardNames);
    }

    // PART 3: MetaForge handles deck building and encoding (exactly as original)
    // Check for missing cards
    const missingCards = cardNames.filter(name => !cardDbfIds[name]);
    if (missingCards.length > 0) {
      console.log(`❌ Missing cards after all lookups: ${missingCards.join(', ')}`);
      return {
        success: false,
        error: `Unknown cards: ${missingCards.join(', ')}. Database lookup may be experiencing issues.`
      };
    }

    // Build cards array for deckstrings
    const cards = parsed.cards.map(card => [
      cardDbfIds[card.name],
      card.count
    ]);

    // Auto-detect hero class and validate format (use existing logic from original)
    let heroClass: string;
    let format: string;

    // Format must be provided by Grok (user input) - required parameter
    format = request.format || 'Standard'; // Fallback to Standard if somehow not provided
    console.log(`📅 Using format: ${format} (provided by Grok)`);

    if (parsed.cards && parsed.cards.length > 0) {
      // Auto-detect ONLY class from card names
      console.log('🤖 Auto-detecting class from card names (overriding any user input)...');
      const cardNames = parsed.cards.map(card => card.name);
      console.log(`📋 Parsed card names for auto-detection: ${cardNames.join(', ')}`);
      const detection = await autoDetectClass(cardNames);
      heroClass = detection.heroClass;
      console.log(`🎯 Auto-detection result: ${detection.analysis} (${detection.confidence.toFixed(1)}% confidence)`);
    } else {
      // No cards to analyze - use fallback
      console.log('⚠️ No cards provided for auto-detection - using fallback values');
      heroClass = request.heroClass || parsed.heroClass || 'Druid';
    }

    // Log if we're overriding user input for class
    if (request.heroClass && request.heroClass !== heroClass) {
      console.log(`⚠️ Overriding user-provided class "${request.heroClass}" with detected "${heroClass}"`);
    }

    const deckName = request.deckName || parsed.deckName;

    // Use the existing buildDeck logic
    const buildRequest: BuildDeckRequest = {
      heroClass,
      format: format as 'Standard' | 'Wild' | 'Classic',
      deckName,
      cards: parsed.dbfIds ? undefined : parsed.cards,
      dbfIds: parsed.dbfIds
    };

    return await handleBuildDeck(buildRequest);

  } catch (error) {
    console.error('Error in encodeDeck:', error);
    return {
      success: false,
      error: `Failed to encode deck: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * ORIGINAL: Handle decode deck function call with full card metadata (preserved as fallback)
 */
export async function originalHandleDecodeDeck(request: { deckCode: string }): Promise<EnhancedDeckResponse> {
  try {
    // Use existing decoder from deckcode module
    const { decodeDeckCode, getFormatName } = await import('../deckcode/decoder');
    const decodedDeck = decodeDeckCode(request.deckCode);

    if (decodedDeck) {
      // Map hero DBF ID to class name
      const heroNames: Record<number, string> = {
        274: 'Druid', 31: 'Hunter', 637: 'Mage', 671: 'Paladin',
        813: 'Priest', 930: 'Rogue', 1066: 'Shaman', 893: 'Warlock',
        7: 'Warrior', 56550: 'Demon Hunter'
      };

      const heroClass = heroNames[decodedDeck.heroes[0]] || `Unknown (DBF ID: ${decodedDeck.heroes[0]})`;
      const format = getFormatName(decodedDeck.format);
      const totalCards = decodedDeck.cards.reduce((sum, [, count]) => sum + count, 0);

      // Extract all unique card IDs for metadata lookup
      const cardIds = decodedDeck.cards.map(([dbfId]) => dbfId);

      console.log(`🔍 Fetching metadata for ${cardIds.length} unique cards in deck...`);

      // Fetch full card metadata for all cards in the deck
      const metadataResponse = await originalHandleFetchCardMetadata({ cardIds });

      if (!metadataResponse.success) {
        console.warn('⚠️ Failed to fetch card metadata, returning basic deck structure only');
        // Fallback to basic response if metadata fetch fails
        return {
          success: true,
          deckCode: request.deckCode,
          hero: heroClass,
          format: format,
          cardCount: totalCards,
          cards: decodedDeck.cards.map(([dbfId, count]) => ({
            cardId: dbfId,
            name: `Card ID ${dbfId}`,
            manaCost: null,
            attack: null,
            health: null,
            text: null,
            class: null,
            type: null,
            keywords: null,
            count: count
          })),
          formattedDeck: `### Decoded Deck
# Class: ${heroClass}
# Format: ${format}
# Total Cards: ${totalCards}

${decodedDeck.cards.map(([dbfId, count]) => `# ${count}x Card ID ${dbfId}`).join('\n')}

${request.deckCode}`
        };
      }

      // Create a map of card ID to metadata for quick lookup
      const cardMetadataMap = new Map();
      if (metadataResponse.data) {
        for (const card of metadataResponse.data) {
          cardMetadataMap.set(card.id, card);
        }
      }

      // Build enhanced cards array with full metadata
      const enhancedCards = decodedDeck.cards.map(([dbfId, count]) => {
        const metadata = cardMetadataMap.get(dbfId);

        if (metadata) {
          return {
            cardId: dbfId,
            name: metadata.name,
            manaCost: metadata.cost || metadata.mana_cost,
            attack: metadata.attack,
            health: metadata.health,
            text: metadata.text,
            class: metadata.class || metadata.class_name,
            type: metadata.type || metadata.card_type,
            keywords: metadata.keywords,
            count: count
          };
        } else {
          // Fallback for cards not found in database
          console.warn(`⚠️ Card metadata not found for ID ${dbfId}`);
          return {
            cardId: dbfId,
            name: `Unknown Card (ID: ${dbfId})`,
            manaCost: null,
            attack: null,
            health: null,
            text: null,
            class: null,
            type: null,
            keywords: null,
            count: count
          };
        }
      });

      // Generate formatted deck string with card names
      const formattedDeckWithNames = `### ${heroClass} Deck
# Format: ${format}
# Total Cards: ${totalCards}

${enhancedCards.map(card =>
  `# ${card.count}x ${card.name}${card.manaCost !== null ? ` (${card.manaCost})` : ''}`
).join('\n')}

${request.deckCode}`;

      return {
        success: true,
        deckCode: request.deckCode,
        hero: heroClass,
        format: format,
        cardCount: totalCards,
        cards: enhancedCards,
        // formattedDeck: formattedDeckWithNames
      };
    } else {
      return {
        success: false,
        error: 'Invalid deck code or failed to decode'
      };
    }

  } catch (error) {
    console.error('Error decoding deck with metadata:', error);
    return {
      success: false,
      error: `Failed to decode deck: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Handle decode deck function call (QueryMaster Integration - Hybrid Split)
 */
export async function handleDecodeDeck(request: { deckCode: string }): Promise<EnhancedDeckResponse> {
  try {
    console.log('🔍 Decoding deck code:', request.deckCode);

    // SMART DETECTION: Check if input is already auto-processed data or raw deck code
    const isAutoProcessedData = request.deckCode.includes('[DECODED DECK DATA:]') ||
                               request.deckCode.includes('SYSTEM INSTRUCTION:') ||
                               request.deckCode.length > 200; // Auto-processed data is much longer

    if (isAutoProcessedData) {
      console.log('🤖 DETECTED: Auto-processed deck data - presenting conversationally');

      // The auto-processing system has already done all the heavy lifting:
      // - Decoded the deck code
      // - Retrieved all card data from database
      // - Formatted complete analysis
      // Our role is just conversational presentation of this authoritative data

      return {
        success: true,
        formattedDeck: request.deckCode, // The complete analysis is already formatted and ready
        deckCode: request.deckCode.match(/\b[A-Za-z0-9+/]{20,150}={0,2}\b/)?.[0] || 'auto-processed'
      };
    } else {
      console.log('📝 DETECTED: Raw deck code - processing normally');
    }

    // PART 1: MetaForge handles system/library logic (deckstrings processing)
    const { decodeDeckCode, getFormatName } = await import('../deckcode/decoder');

    // Validate and decode using deckstrings library
    const decodedDeck = decodeDeckCode(request.deckCode);
    if (!decodedDeck) {
      return { success: false, error: "Invalid deck code" };
    }

    // Extract card IDs from decoded deck
    const cardIds = decodedDeck.cards.map(([dbfId]) => dbfId);

    OptimizedConsole.info(`🔍 Decoding deck with ${cardIds.length} unique cards`);

    // PART 2: Use direct database lookup for better debugging
    let cardData: any[] = [];

    try {
      OptimizedConsole.info('🔍 Fetching card metadata from database...');
      const fallbackResult = await originalHandleFetchCardMetadata({ cardIds });
      cardData = fallbackResult.data || [];

      OptimizedConsole.info(`✅ Database returned ${cardData.length}/${cardIds.length} cards`);

      // Log which cards were found vs missing (optimized)
      const foundCardIds = cardData.map(card => card.id);
      const missingCardIds = cardIds.filter(id => !foundCardIds.includes(id));

      if (missingCardIds.length > 0) {
        OptimizedConsole.warn(`❌ Missing cards with IDs: ${missingCardIds.length} cards`);

        // Debug individual missing cards only at DEBUG level
        if (process.env.LOG_LEVEL === 'DEBUG') {
          for (const missingId of missingCardIds.slice(0, 3)) { // Only check first 3 to avoid spam
            try {
              const singleResult = await originalHandleFetchCardMetadata({ cardIds: [missingId] });
              if (singleResult.success && singleResult.data && singleResult.data.length > 0) {
                OptimizedConsole.log(`✅ DEBUG: Individual lookup found card ${missingId}:`, singleResult.data[0].name);
              } else {
                OptimizedConsole.log(`❌ DEBUG: Individual lookup failed for card ${missingId}`);
              }
            } catch (error) {
              OptimizedConsole.log(`❌ DEBUG: Individual lookup error for card ${missingId}:`, error instanceof Error ? error.message : String(error));
            }
          }
        }
      }

    } catch (error) {
      OptimizedConsole.error('❌ Database lookup failed:', error);
      cardData = [];
    }

    // PART 3: MetaForge handles response formatting (exactly as original)
    const cardMap = new Map(cardData.map(card => [card.id, card]));

    OptimizedConsole.info(`🔍 Created card map with ${cardMap.size} entries`);

    // Map hero class and format (use existing helper functions)
    const heroNames: Record<number, string> = {
      274: 'Druid', 31: 'Hunter', 637: 'Mage', 671: 'Paladin',
      813: 'Priest', 930: 'Rogue', 1066: 'Shaman', 893: 'Warlock',
      7: 'Warrior', 56550: 'Demon Hunter'
    };

    const heroClass = heroNames[decodedDeck.heroes[0]] || `Unknown (DBF ID: ${decodedDeck.heroes[0]})`;
    const format = getFormatName(decodedDeck.format);
    const totalCards = decodedDeck.cards.reduce((sum, [, count]) => sum + count, 0);

    // Build enhanced cards array with metadata
    const enhancedCards = decodedDeck.cards.map(([dbfId, count]) => {
      const metadata = cardMap.get(dbfId);

      if (metadata) {
        console.log(`🔍 DEBUG: Card ${dbfId} metadata:`, {
          name: metadata.name,
          cost: metadata.cost,
          mana_cost: metadata.mana_cost,
          class: metadata.class,
          class_name: metadata.class_name,
          type: metadata.type,
          card_type: metadata.card_type,
          availableFields: Object.keys(metadata)
        });

        return {
          cardId: dbfId,
          name: metadata.name,
          manaCost: metadata.cost || metadata.mana_cost,
          attack: metadata.attack,
          health: metadata.health,
          text: metadata.text,
          class: metadata.class || metadata.class_name,
          type: metadata.type || metadata.card_type,
          keywords: metadata.keywords,
          count: count
        };
      } else {
        // Fallback for cards not found in database
        console.warn(`⚠️ DEBUG: Card metadata not found for ID ${dbfId} - cardMap has keys:`, Array.from(cardMap.keys()));
        return {
          cardId: dbfId,
          name: `Unknown Card (ID: ${dbfId})`,
          manaCost: null,
          attack: null,
          health: null,
          text: null,
          class: null,
          type: null,
          keywords: null,
          count: count
        };
      }
    });

    return {
      success: true,
      deckCode: request.deckCode,
      hero: heroClass,
      format: format,
      cardCount: totalCards,
      cards: enhancedCards
    };

  } catch (error) {
    console.error('Error in decodeDeck:', error);
    return {
      success: false,
      error: `Failed to decode deck: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Handle deck building function call - supports both card names and DBF IDs
 */
export async function handleBuildDeck(request: BuildDeckRequest): Promise<BuildDeckResponse> {
  try {
    // Validate hero class
    const heroDbfId = HERO_CLASS_TO_DBF[request.heroClass];
    if (!heroDbfId) {
      return {
        success: false,
        error: `Unknown hero class: ${request.heroClass}`
      };
    }

    // Validate format
    const format = FORMAT_MAPPING[request.format];
    if (format === undefined) {
      return {
        success: false,
        error: `Unknown format: ${request.format}`
      };
    }

    // Validate input - must have either cards or dbfIds
    if (!request.cards && !request.dbfIds) {
      return {
        success: false,
        error: 'Must provide either cards array or dbfIds array'
      };
    }

    if (request.cards && request.dbfIds) {
      return {
        success: false,
        error: 'Cannot provide both cards and dbfIds - choose one input method'
      };
    }

    let cards: Array<[number, number]>;

    // Handle DBF IDs input (direct encoding)
    if (request.dbfIds) {
      console.log(`🎯 Using DBF IDs directly: ${request.dbfIds.length} cards`);

      // Validate deck size
      if (request.dbfIds.length !== 30) {
        return {
          success: false,
          error: `Deck must have exactly 30 cards, found ${request.dbfIds.length}`
        };
      }

      // Count occurrences of each DBF ID
      const cardCounts = new Map<number, number>();
      for (const dbfId of request.dbfIds) {
        cardCounts.set(dbfId, (cardCounts.get(dbfId) || 0) + 1);
      }

      // Convert to cards array
      cards = Array.from(cardCounts.entries());

      console.log(`🃏 Processed ${cards.length} unique cards from DBF IDs`);
    }
    // Handle card names input (requires lookup)
    else if (request.cards) {
      console.log(`🔍 Looking up card names: ${request.cards.length} unique cards`);

      // Log the exact card names being looked up for debugging
      const cardNames = request.cards.map(card => card.name);
      console.log(`📋 Card names to lookup: ${cardNames.join(', ')}`);

      // Get DBF IDs for all cards using PostgreSQL database
      const cardDbfIds = await originalGetCardDbfIds(cardNames);

      // Enhanced debugging for missing cards
      const foundCards = Object.keys(cardDbfIds);
      const missingCards = cardNames.filter(name => !cardDbfIds[name]);

      console.log(`✅ Found cards: ${foundCards.join(', ')}`);
      if (missingCards.length > 0) {
        console.log(`❌ Missing cards: ${missingCards.join(', ')}`);
        return {
          success: false,
          error: `Unknown cards: ${missingCards.join(', ')}`
        };
      }

      // Build cards array for encoding
      cards = request.cards.map(card => [
        cardDbfIds[card.name],
        card.count
      ]);

      console.log(`🃏 Processed ${cards.length} cards from names`);
    } else {
      return {
        success: false,
        error: 'Internal error: no valid input method found'
      };
    }

    // Generate deck code
    console.log(`🔧 Encoding deck with ${cards.length} unique cards...`);
    const deckCode = encode({
      cards,
      heroes: [heroDbfId],
      format
    });

    // Format deck for display
    const formattedDeck = formatDeckDisplay(request, deckCode);

    console.log(`✅ Successfully generated deck code: ${deckCode}`);

    return {
      success: true,
      deckCode,
      formattedDeck
    };

  } catch (error) {
    console.error('Error building deck:', error);
    return {
      success: false,
      error: `Failed to build deck: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Handle find cards with keywords function call
 */


/**
 * ORIGINAL: Handle fetch card metadata function call (preserved as fallback)
 */
export async function originalHandleFetchCardMetadata(request: { cardIds: number[] }): Promise<DatabaseQueryResponse> {
  try {
    console.log(`🔍 Fetching metadata for ${request.cardIds.length} cards...`);

    // Validate input
    if (!request.cardIds || !Array.isArray(request.cardIds) || request.cardIds.length === 0) {
      return {
        success: false,
        error: 'cardIds array is required and must not be empty'
      };
    }

    // Validate card IDs are numbers
    const invalidIds = request.cardIds.filter(id => typeof id !== 'number' || id <= 0);
    if (invalidIds.length > 0) {
      return {
        success: false,
        error: `Invalid card IDs: ${invalidIds.join(', ')}`
      };
    }

    // Execute database query using resilient Lambda client
    const placeholders = request.cardIds.map((_, index) => `%s`).join(', ');
    const query = `SELECT c.id, c.name, c.mana_cost, c.attack, c.health, c.text, cl.name AS class_name, ct.name AS card_type, array_agg(k.name) FILTER (WHERE k.name IS NOT NULL) AS keywords FROM cards c LEFT JOIN classes cl ON cl.id = c.class_id LEFT JOIN card_types ct ON ct.id = c.card_type_id LEFT JOIN card_keywords ck ON ck.card_id = c.id LEFT JOIN keywords k ON k.id = ck.keyword_id WHERE c.id IN (${placeholders}) AND c.collectible = true GROUP BY c.id, c.name, c.mana_cost, c.attack, c.health, c.text, cl.name, ct.name ORDER BY c.mana_cost ASC LIMIT 50`;
    const params = request.cardIds;

    // Call Lambda API with automatic network resilience
    const result = await executeLambdaQuery(query, params);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        execution_time_ms: result.execution_time_ms
      };
    }

    console.log(`✅ Successfully retrieved ${result.data?.length || 0} card records`);

    // Normalize field names for consistent access
    const normalizedData = result.data?.map((card: any) => ({
      ...card,
      cost: card.mana_cost || card.cost,
      type: card.card_type || card.type,
      class: card.class_name || card.class
    })) || [];

    return {
      success: true,
      data: normalizedData,
      execution_time_ms: result.execution_time_ms
    };

  } catch (error) {
    console.error('Error fetching card metadata:', error);
    return {
      success: false,
      error: `Failed to fetch card metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Handle fetch card metadata function call (QueryMaster Integration)
 */
export async function handleFetchCardMetadata(request: { cardIds: number[] }): Promise<DatabaseQueryResponse> {
  const logger = createServerLogger('fetch-card-metadata');
  const timer = new PerformanceTimer('fetch-card-metadata', 'handleFetchCardMetadata');

  logger.info('FUNCTION_CALLED', {
    function: 'handleFetchCardMetadata',
    cardCount: request.cardIds.length,
    // 🗑️ REMOVED: useQueryMaster flag - Stage 3 cleanup
    cardIds: request.cardIds.slice(0, 10) // Log first 10 IDs for debugging
  });

  // 🗑️ REMOVED: QueryMaster branch - Stage 3 cleanup
  // Direct use of original implementation since QueryMaster is eliminated
  {
    try {
      logger.info('FUNCTION_CALLED', {
        function: 'queryMaster.executeQuery',
        delegatedFunction: 'fetchCardMetadata',
        cardCount: request.cardIds.length
      });

      const result = await queryMaster.executeQuery({
        functionName: 'fetchCardMetadata',
        parameters: request,
        intent: `Fetch detailed card metadata`,
        context: `Looking up ${request.cardIds.length} card IDs`
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Return in same format as original function
      return {
        success: true,
        data: result.data || [],
        execution_time_ms: result.executionTime
      };

    } catch (error) {
      console.warn('⚠️ QueryMaster failed, falling back to original implementation');
      // Fall through to original implementation
    }
  }

  // Fallback to original implementation
  return originalHandleFetchCardMetadata(request);
}

/**
 * ORIGINAL: Handle explore deck building function call (preserved as fallback)
 */
export async function originalHandleExploreDeckBuilding(request: ExploreDeckBuildingRequest): Promise<DatabaseQueryResponse> {
  try {
    console.log(`🔍 Exploring deck building: ${request.userIntent}`);
    console.log(`📋 Building context: ${request.buildingContext || 'Starting fresh deck exploration'}`);
    console.log(`🔧 SQL Query: ${request.sqlQuery.substring(0, 200)}${request.sqlQuery.length > 200 ? '...' : ''}`);

    // Validate input
    if (!request.sqlQuery || typeof request.sqlQuery !== 'string' || request.sqlQuery.trim().length === 0) {
      return {
        success: false,
        error: 'sqlQuery is required and must be a non-empty string'
      };
    }

    if (!request.userIntent || typeof request.userIntent !== 'string' || request.userIntent.trim().length === 0) {
      return {
        success: false,
        error: 'userIntent is required and must be a non-empty string'
      };
    }

    // Basic SQL validation - ensure it's a SELECT query
    const trimmedQuery = request.sqlQuery.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      return {
        success: false,
        error: 'Only SELECT queries are allowed for deck exploration'
      };
    }

    // Check for dangerous keywords (basic client-side validation, Lambda has comprehensive validation)
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
    for (const keyword of dangerousKeywords) {
      if (trimmedQuery.includes(keyword)) {
        return {
          success: false,
          error: `Dangerous SQL keyword '${keyword}' not allowed in deck exploration queries`
        };
      }
    }

    // Recommend including collectible filter if not present
    if (!request.sqlQuery.toLowerCase().includes('collectible')) {
      console.warn('⚠️ Query does not include collectible filter - may return non-playable cards');
    }

    // Execute database query using resilient Lambda client
    // The Lambda's handle_custom_query function will perform comprehensive security validation
    const result = await executeLambdaQuery(request.sqlQuery, [], 'explore_deck_building');

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        execution_time_ms: result.execution_time_ms
      };
    }

    console.log(`✅ Deck exploration query successful: ${result.data?.length || 0} results found`);
    console.log(`⏱️ Query executed in ${result.execution_time_ms}ms`);

    // ENHANCED LOGGING: Show summary of data being returned to Grok (optimized)
    OptimizedConsole.info(`🔍 Database results: ${result.data?.length || 0} cards found`);

    // Full detailed results only at DEBUG level
    if (process.env.LOG_LEVEL === 'DEBUG' && result.data && result.data.length > 0) {
      OptimizedConsole.log('\n🔍 === DATABASE RESULTS BEING SENT TO GROK ===');
      result.data.forEach((card, index) => {
        OptimizedConsole.log(`[${index}] ${card.name || 'Unknown'} (${card.mana_cost || '?'} mana)`);
        OptimizedConsole.log(`    Text: "${card.text || 'No text'}"`);
        OptimizedConsole.log(`    Stats: ${card.attack || '?'}/${card.health || '?'}`);
        OptimizedConsole.log(`    Class: ${card.class_name || 'Unknown'}`);
        OptimizedConsole.log('');
      });
      OptimizedConsole.log('=== END DATABASE RESULTS ===\n');
    }

    return {
      success: true,
      data: result.data || [],
      execution_time_ms: result.execution_time_ms
    };

  } catch (error) {
    console.error('Error in deck building exploration:', error);
    return {
      success: false,
      error: `Failed to explore deck building: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Log flow execution results with structured format
 */
function logFlowExecution(log: FlowExecutionLog, userIntent: string): void {
  const logger = createServerLogger('querymaster-flow');

  const logData = {
    operation: 'explore_deck_building',
    flow: log.flow,
    success: log.success,
    userIntent: userIntent.substring(0, 100),
    executionTime: log.executionTime,
    totalTime: log.totalTime,
    resultCount: log.resultCount,
    errorType: log.errorType,
    errorMessage: log.errorMessage?.substring(0, 200),
    fallbackReason: log.fallbackReason,
    validationErrors: log.validationErrors?.length || 0,
    correctionApplied: log.correctionApplied,
    timestamp: new Date().toISOString()
  };

  // Optimized QueryMaster result logging
  if (log.success) {
    logger.info('FUNCTION_COMPLETED', logData);
    OptimizedConsole.info(`✅ QueryMaster SUCCESS: ${log.flow} - ${log.resultCount} cards in ${log.totalTime}ms`);
    if (log.correctionApplied) {
      OptimizedConsole.info(`🔧 Auto-corrections applied: ${log.validationErrors} issues fixed`);
    }
  } else {
    logger.warn('FUNCTION_FAILED', logData);
    OptimizedConsole.warn(`❌ QueryMaster FAILED: ${log.flow} - ${log.errorType}`);
    OptimizedConsole.warn(`🔄 Fallback reason: ${log.fallbackReason}`);
  }

  // Full detailed logging only at DEBUG level
  if (process.env.LOG_LEVEL === 'DEBUG') {
    const separator = "=".repeat(80);
    OptimizedConsole.log(`\n${separator}`);
    OptimizedConsole.log(`🎯 QUERYMASTER FLOW RESULT`);
    OptimizedConsole.log(`${separator}`);
    OptimizedConsole.log(`⏱️  Time: ${log.totalTime}ms (execution: ${log.executionTime}ms)`);
    OptimizedConsole.log(`💭 User Intent: "${userIntent.substring(0, 60)}${userIntent.length > 60 ? '...' : ''}"`);
    OptimizedConsole.log(`${separator}\n`);
  }
}

/**
 * Create structured error response with fallback guidance
 */
function createStructuredError(
  errorType: string,
  message: string,
  fallbackAction: 'USE_AI_FLOW' | 'USE_ORIGINAL' | 'RETRY_WITH_CORRECTIONS',
  details?: any
): { error: any; shouldFallback: boolean; fallbackReason: string } {
  const structuredError = {
    type: errorType,
    message,
    fallbackAction,
    details,
    timestamp: new Date().toISOString(),
    flow: 'DETERMINISTIC_BUILDER'
  };

  const shouldFallback = fallbackAction !== 'RETRY_WITH_CORRECTIONS';
  const fallbackReason = shouldFallback ? `${errorType}: ${message}` : '';

  console.log('🚨 Structured Error:', JSON.stringify(structuredError, null, 2));

  return {
    error: structuredError,
    shouldFallback,
    fallbackReason
  };
}

/**
 * Extract structured parameters from user message and intent for deterministic SQL building
 */
async function extractExploreDeckParams(
  userMessage: string,
  userIntent: string,
  buildingContext?: string
): Promise<ExploreDeckParams> {
  // Use Grok AI to extract structured parameters from natural language
  const grokService = getGrokService();

  const extractionPrompt = `
You are a parameter extraction AI. Extract structured search parameters from the user's deck building request.

User Intent: "${userIntent}"
Building Context: "${buildingContext || 'Starting fresh deck exploration'}"

EXAMPLES:
"priest legendary cards for standard" → {"classes": ["Priest"], "rarities": ["Legendary"], "formats": ["standard"]}
"hunter cards with rush under 5 mana" → {"classes": ["Hunter"], "keywords": ["Rush"], "manaCost": {"max": 5}}
"dragon minions" → {"minionTypes": ["Dragon"], "cardTypes": ["Minion"]}
"powerful cards" → {} (no specific filters)

Extract the following information and return ONLY a valid JSON object:

{
  "searchType": "cards",
  "filters": {
    "classes": [], // Extract: Priest, Hunter, Mage, etc.
    "rarities": [], // Extract: Common, Rare, Epic, Legendary
    "cardTypes": [], // Extract: Minion, Spell, Weapon
    "minionTypes": [], // Extract: Dragon, Beast, Elemental, etc.
    "spellSchools": [], // Extract: Fire, Frost, Arcane, etc.
    "keywords": [], // Extract: Rush, Taunt, Divine Shield, etc.
    "formats": [], // Extract: standard, wild
    "manaCost": {}, // Extract: {"min": X, "max": Y} or {"exact": Z}
    "textContains": [] // Extract: words that should be in card text
  },
  "output": {
    "fields": ["name", "mana_cost", "attack", "health", "class_name", "text"],
    "orderBy": {"field": "mana_cost", "direction": "ASC"},
    "limit": 15
  },
  "context": {
    "userIntent": "${userIntent}",
    "buildingContext": "${buildingContext || ''}"
  }
}

CRITICAL RULES:
- Look for implicit filters: "priest legendary" = classes AND rarities
- Extract mana costs: "under 5 mana" = {"max": 5}, "3 mana" = {"exact": 3}
- Extract creature types: "dragon cards" = minionTypes: ["Dragon"]
- Extract keywords: "rush cards" = keywords: ["Rush"]
- Extract formats: "for standard" = formats: ["standard"]
- Only include filters that are mentioned or strongly implied
- Return ONLY the JSON object, no other text
`;

  try {
    const response = await grokService.sendMessage(extractionPrompt);
    const parsed = JSON.parse(response);

    // Validate the structure
    if (!parsed.searchType) parsed.searchType = 'cards';
    if (!parsed.filters) parsed.filters = {};
    if (!parsed.output) parsed.output = { fields: ['name', 'mana_cost', 'attack', 'health', 'class_name'], limit: 15 };
    if (!parsed.context) parsed.context = { userIntent, buildingContext };

    return parsed as ExploreDeckParams;

  } catch (error) {
    console.warn('⚠️ Parameter extraction failed, using fallback:', error);

    // Fallback to basic parameters
    return {
      searchType: 'cards',
      filters: {},
      output: {
        fields: ['name', 'mana_cost', 'attack', 'health', 'class_name', 'text'],
        limit: 15
      },
      context: {
        userIntent,
        buildingContext
      }
    };
  }
}

// 🗑️ REMOVED: handleExploreDeckBuilding - Legacy function eliminated in Stage 2 cleanup
// Monitoring confirmed zero usage during UI testing - AST system handles all requests

/**
 * Get flow execution statistics for observability
 * 🗑️ UPDATED: Legacy QueryMaster flags removed - Stage 3 cleanup
 */
export function getFlowExecutionStats(): {
  astSystemEnabled: boolean;
  flowPriority: string[];
  fallbackChain: string;
} {
  // 🗑️ REMOVED: Legacy QueryMaster and deterministic builder flags
  // AST system is now the primary and only system
  const flowPriority = ['AST_SYSTEM', 'ORIGINAL_FALLBACK'];

  return {
    astSystemEnabled: true, // AST system is always enabled now
    flowPriority,
    fallbackChain: flowPriority.join(' → ')
  };
}

/**
 * 🚨 STAGE 2 MONITORING: Summary function for legacy function usage validation
 * Call this after UI testing to see which functions were actually used
 */
export function getStage2ValidationSummary(): {
  monitoringActive: boolean;
  legacyFunctionsMarkedForRemoval: string[];
  astFunctionsActive: string[];
  validationInstructions: string;
} {
  return {
    monitoringActive: true,
    legacyFunctionsMarkedForRemoval: [
      'handleExploreDeckBuilding',
      'handleExploreCards'
    ],
    astFunctionsActive: [
      'handleExploreCardsAST',
      'handleExploreCardsNatural',
      'handleDetectUserIntent'
    ],
    validationInstructions: `
🚨 STAGE 2 VALIDATION INSTRUCTIONS:
1. Test card search functionality through the UI
2. Test deck building functionality through the UI
3. Check console/logs for FUNCTION_CALLED events with legacyFunction: true
4. If no legacy functions are called, they can be safely removed
5. If legacy functions are called, investigate why AST system isn't handling those cases

Look for log entries with:
- component: 'legacy-explore-deck-building' or 'legacy-explore-cards'
- event: 'FUNCTION_CALLED', 'FUNCTION_COMPLETED', or 'FUNCTION_FAILED'
- legacyFunction: true
- stage2ValidationNote: explanatory message
    `.trim()
  };
}

// 🗑️ REMOVED: handleExploreCards - Legacy function eliminated in Stage 2 cleanup
// Monitoring confirmed zero usage during UI testing - AST system handles all requests

// 🗑️ REMOVED: testExploreCards and related test functions - Legacy test suite eliminated in Stage 2 cleanup

// 🗑️ REMOVED: testDeterministicBuilder - Legacy test function eliminated in Stage 2 cleanup

/**
 * Format deck for display
 */
function formatDeckDisplay(request: BuildDeckRequest, deckCode: string): string {
  let formatted = `### ${request.deckName || 'Custom Deck'}\n`;
  formatted += `# Class: ${request.heroClass}\n`;
  formatted += `# Format: ${request.format}\n`;
  formatted += `# Deck Code: ${deckCode}\n\n`;

  // List cards if available
  if (request.cards) {
    for (const card of request.cards) {
      formatted += `# ${card.count}x ${card.name}\n`;
    }
  } else if (request.dbfIds) {
    // Count DBF IDs for display
    const cardCounts = new Map<number, number>();
    for (const dbfId of request.dbfIds) {
      cardCounts.set(dbfId, (cardCounts.get(dbfId) || 0) + 1);
    }

    Array.from(cardCounts.entries()).forEach(([dbfId, count]) => {
      formatted += `# ${count}x Card ID ${dbfId}\n`;
    });
  }

  formatted += `\n${deckCode}\n`;

  return formatted;
}

/**
 * Safely parse JSON with comprehensive error handling
 */
function safeParseJSON(jsonString: string | undefined | null, context: string = 'JSON'): { success: true; data: any } | { success: false; error: string } {
  // CRITICAL FIX: Check for undefined/null BEFORE any property access
  if (jsonString === undefined || jsonString === null) {
    console.error(`🚨 JSON Parse Error [${context}]: Input is ${jsonString === undefined ? 'undefined' : 'null'}`);
    return {
      success: false,
      error: `Invalid JSON input: received ${jsonString === undefined ? 'undefined' : 'null'}`
    };
  }

  // Input validation
  if (typeof jsonString !== 'string') {
    console.error(`🚨 JSON Parse Error [${context}]: Input is not a string, received:`, typeof jsonString);
    return {
      success: false,
      error: `Invalid JSON input: expected string, received ${typeof jsonString}`
    };
  }

  if (jsonString.trim().length === 0) {
    console.error(`🚨 JSON Parse Error [${context}]: Empty string provided`);
    return {
      success: false,
      error: 'Invalid JSON input: empty string'
    };
  }

  // Common malformation pattern detection
  const trimmed = jsonString.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    console.error(`🚨 JSON Parse Error [${context}]: JSON doesn't start with { or [, content:`, trimmed.substring(0, 100));
    return {
      success: false,
      error: 'Invalid JSON format: must start with { or ['
    };
  }

  try {
    const parsed = JSON.parse(jsonString);
    console.log(`✅ JSON Parse Success [${context}]: Successfully parsed ${typeof parsed}`);
    return { success: true, data: parsed };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';

    // ENHANCED: Special handling for position 353 error pattern
    const isPosition353Error = errorMessage.includes('position 353') || errorMessage.includes('column 354');
    const isMultipleJSONError = errorMessage.includes('Unexpected non-whitespace character after JSON');

    if (isPosition353Error || isMultipleJSONError) {
      console.error(`🎯 POSITION 353 ERROR DETECTED [${context}]:`, {
        error: errorMessage,
        inputLength: jsonString.length,
        isPosition353: isPosition353Error,
        isMultipleJSON: isMultipleJSONError,
        // Show content around the error position
        contentAround353: jsonString.substring(350, 360),
        // Show the boundary where valid JSON likely ends
        firstBrace: jsonString.indexOf('}'),
        lastBrace: jsonString.lastIndexOf('}'),
        // Character analysis around position 353
        charCodes353: Array.from(jsonString.substring(350, 360)).map((char, i) => ({
          position: 350 + i,
          char,
          code: char.charCodeAt(0)
        }))
      });

      // Try to extract the first valid JSON object
      const firstJSONMatch = jsonString.match(/^(\{[^}]*\})/);
      if (firstJSONMatch) {
        console.log(`🔧 Attempting to parse first JSON object only: "${firstJSONMatch[1].substring(0, 100)}..."`);
        try {
          const parsed = JSON.parse(firstJSONMatch[1]);
          console.log(`✅ Successfully parsed first JSON object as fallback`);
          return { success: true, data: parsed };
        } catch (fallbackError) {
          console.error(`❌ Fallback parsing also failed:`, fallbackError);
        }
      }
    }

    console.error(`🚨 JSON Parse Error [${context}]:`, {
      error: errorMessage,
      input: jsonString.substring(0, 200) + (jsonString.length > 200 ? '...' : ''),
      inputLength: jsonString.length
    });

    return {
      success: false,
      error: `JSON parsing failed: ${errorMessage}`
    };
  }
}

// ============================================================================
// AST-POWERED EXPLORATION HANDLERS
// ============================================================================

/**
 * TEMPORARY: Convert AST to legacy ExploreDeckParams for testing
 * This allows us to test AST function calls while using the existing working infrastructure
 */
function convertASTToLegacyParams(astNode: ASTNode, output: ASTOutputSpecification): ExploreDeckParams {
  const filters: any = {};

  // Extract filters from AST node
  if (astNode.type === 'CONDITION') {
    const condition = astNode as any;

    switch (condition.field) {
      case 'class_name':
        if (condition.operator === 'EQUALS') {
          filters.classes = [condition.value];
        } else if (condition.operator === 'IN') {
          filters.classes = condition.value;
        }
        break;

      case 'mana_cost':
        if (condition.operator === 'BETWEEN') {
          filters.manaCost = { min: condition.value.min, max: condition.value.max };
        } else if (condition.operator === 'LESS_THAN') {
          filters.manaCost = { max: condition.value - 1 };
        } else if (condition.operator === 'GREATER_THAN') {
          filters.manaCost = { min: condition.value + 1 };
        }
        break;

      case 'keywords':
        if (condition.operator === 'CONTAINS') {
          filters.keywords = [condition.value];
        } else if (condition.operator === 'CONTAINS_ANY') {
          filters.keywords = condition.value;
        }
        break;

      case 'text':
        if (condition.operator === 'ILIKE') {
          filters.textContains = [condition.value];
        }
        break;

      case 'card_type':
        if (condition.operator === 'EQUALS') {
          filters.cardTypes = [condition.value];
        }
        break;

      case 'minion_type':
        if (condition.operator === 'EQUALS') {
          filters.minionTypes = [condition.value];
        }
        break;
    }
  } else if (astNode.type === 'AND' && (astNode as any).children) {
    // Process AND conditions by merging filters
    for (const child of (astNode as any).children) {
      const childParams = convertASTToLegacyParams(child, output);
      Object.assign(filters, childParams.filters);
    }
  }

  // Default filters for Dragon minions if no specific filters found
  if (Object.keys(filters).length === 0) {
    filters.minionTypes = ['Dragon'];
    filters.manaCost = { min: 5 }; // Late game
  }

  return {
    searchType: 'cards' as const,
    filters,
    output: {
      fields: output.fields,
      limit: output.limit || 15
    },
    context: {
      userIntent: 'AST test mode conversion'
    }
  };
}

/**
 * Handle AST-powered card exploration with direct AST input
 */
export async function handleExploreCardsAST(request: {
  logicalQuery: ASTNode;
  output: ASTOutputSpecification;
  context: ASTQueryContext;
}): Promise<ExploreCardsResponse> {
  const logger = createServerLogger('explore-cards-ast');
  const startTime = Date.now();

  logger.info('FUNCTION_CALLED', {
    function: 'handleExploreCardsAST',
    userIntent: request.context.userIntent,
    buildingContext: request.context.buildingContext,
    outputFields: request.output.fields,
    astNodeType: request.logicalQuery.type
  });

  try {
    // 🔄 BULLETPROOF AST TRANSFORMATION - NEVER FAILS
    logger.info('AST_TRANSFORMATION_START', {
      originalAST: request.logicalQuery,
      userIntent: request.context.userIntent
    });

    const transformedAST = transformAndValidateAST(
      request.logicalQuery,
      `handleExploreCardsAST: ${request.context.userIntent}`
    );

    logger.info('AST_TRANSFORMATION_COMPLETE', {
      transformedAST: transformedAST,
      transformationTime: Date.now() - startTime
    });

    // Log transformation results for debugging
    logTransformationResults(request.logicalQuery, transformedAST, 'handleExploreCardsAST');

    // Compile transformed AST to SQL using the new compiler
    const compiledQuery = await compileAST(
      transformedAST, // Use transformed AST instead of raw AI AST
      request.output,
      request.context
    );

    logger.info('FUNCTION_CALLED', {
      complexityScore: compiledQuery.metadata.complexityScore,
      tablesJoined: compiledQuery.metadata.tablesJoined,
      optimizationsApplied: compiledQuery.metadata.optimizationsApplied,
      estimatedResultSize: compiledQuery.metadata.estimatedResultSize
    });

    // Execute the compiled query - THIS IS THE ACTUAL AST LAMBDA CALL
    // Use optimized AST logging
    const { createOptimizedGrokLogger } = require('../logging/optimized-logger');
    const astLogger = createOptimizedGrokLogger();
    astLogger.logASTCompilation(
      request.logicalQuery,
      compiledQuery.sql,
      0, // Result count will be updated after execution
      Date.now() - startTime
    );

    const result = await executeLambdaQuery(
      compiledQuery.sql,
      compiledQuery.parameters,
      'ast_compiler'
    );

    const totalTime = Date.now() - startTime;

    if (result.success) {
      logger.info('FUNCTION_CALLED', {
        resultCount: result.data?.length || 0,
        executionTime: result.execution_time_ms,
        totalTime,
        performanceHints: compiledQuery.metadata.performanceHints
      });

      return {
        success: true,
        data: result.data,
        execution_time_ms: result.execution_time_ms,
        metadata: {
          resultCount: result.data?.length || 0,
          sqlGenerated: compiledQuery.sql,
          totalExecutionTime: totalTime,
          flow: 'AST_COMPILER',
          stage: 'compilation_and_execution',
          ...compiledQuery.metadata
        }
      };
    } else {
      console.error('❌ AST Query Execution Failed:', {
        error: result.error,
        sql: compiledQuery.sql.substring(0, 200) + '...',
        parameterCount: compiledQuery.parameters.length
      });

      return {
        success: false,
        error: result.error || 'Query execution failed',
        metadata: {
          sqlGenerated: compiledQuery.sql,
          totalExecutionTime: totalTime,
          flow: 'AST_COMPILER',
          stage: 'execution_failed',
          errorType: 'EXECUTION_ERROR'
        }
      };
    }

  } catch (error) {
    const totalTime = Date.now() - startTime;

    console.error('❌ AST Test Mode Failed:', error instanceof Error ? error.message : 'Unknown error');

    return {
      success: false,
      error: `AST compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        totalExecutionTime: totalTime,
        flow: 'AST_COMPILER',
        stage: 'compilation_failed',
        errorType: 'COMPILATION_ERROR'
      }
    };
  }
}

/**
 * Handle intent detection - RUNS ON EVERY MESSAGE
 */
export async function handleDetectUserIntent(request: {
  userMessage: string;
  conversationContext?: string[];
}): Promise<UserIntentResult> {
  const logger = createServerLogger('detect-user-intent');

  // CRITICAL FIX: Validate request parameters before accessing properties
  if (!request || typeof request.userMessage !== 'string') {
    console.error('🚨 Invalid request parameters for detectUserIntent:', {
      request: request,
      userMessageType: typeof request?.userMessage,
      userMessage: request?.userMessage
    });

    return {
      intentType: 'GENERAL_CHAT',
      confidence: 0.1
    };
  }

  logger.info('FUNCTION_CALLED', {
    function: 'handleDetectUserIntent',
    messageLength: request.userMessage.length,
    hasContext: !!request.conversationContext
  });

  try {
    // Use Grok to analyze the user's intent
    const grokService = getGrokService();

    const intentAnalysisPrompt = `Classify this user message intent. Focus only on classification - no parameter extraction.

USER MESSAGE: "${request.userMessage}"

INTENT CATEGORIES:
- CARD_SEARCH: Looking for specific cards with clear parameters (class, mana cost, keywords, etc.)
- DECK_BUILDING: Building, modifying, or analyzing complete decks with clear specifications (NOT decode/encode operations)
- INQUIRY: Vague requests needing parameter gathering before card search or deck building can proceed
- GENERAL_CHAT: Casual conversation, asking about game mechanics, strategy discussion, deck code operations (decode/encode)
- GREETING: Hello, thanks, goodbye, acknowledgments
- QUESTION: Asking about how something works, rules, explanations

CLASSIFICATION REQUIREMENTS:
1. Choose the PRIMARY intent (most likely category)
2. Rate confidence 0.0-1.0 (be honest about uncertainty)
3. NO parameter extraction - classification only

EXAMPLES:
"Find Rush cards" → CARD_SEARCH, confidence: 0.95
"Build me a Mage deck" → DECK_BUILDING, confidence: 0.9
"Wanna help me build a deck?" → INQUIRY, confidence: 0.9
"Can you help me find some cards?" → INQUIRY, confidence: 0.9
"I need help with my collection" → INQUIRY, confidence: 0.85
"Decode this deck code" → GENERAL_CHAT, confidence: 0.9
"Encode my deck list" → GENERAL_CHAT, confidence: 0.9
"What's the meta like?" → GENERAL_CHAT, confidence: 0.8
"Hello there" → GREETING, confidence: 1.0
"What's the best strategy?" → GENERAL_CHAT, confidence: 0.8

Return ONLY a JSON object with this exact structure:
{
  "intentType": "CARD_SEARCH|DECK_BUILDING|GENERAL_CHAT|GREETING|QUESTION",
  "confidence": 0.0-1.0
}`;

    const response = await grokService.sendMessage(intentAnalysisPrompt);

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in intent analysis response');
    }

    const intentResult = JSON.parse(jsonMatch[0]) as UserIntentResult;

    // Validate result
    const validIntents = ['CARD_SEARCH', 'DECK_BUILDING', 'INQUIRY', 'GENERAL_CHAT', 'GREETING', 'QUESTION'];
    if (!validIntents.includes(intentResult.intentType)) {
      throw new Error(`Invalid intent type: ${intentResult.intentType}`);
    }

    if (typeof intentResult.confidence !== 'number' || intentResult.confidence < 0 || intentResult.confidence > 1) {
      throw new Error(`Invalid confidence value: ${intentResult.confidence}`);
    }

    logger.info('FUNCTION_COMPLETED', {
      intentType: intentResult.intentType,
      confidence: intentResult.confidence
    });

    return intentResult;

  } catch (error) {
    console.error('Intent detection error:', error);

    // Ensure we have a proper error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during intent detection';

    // Log the error properly
    logger.info('FUNCTION_CALLED', {
      error: errorMessage,
      userMessage: request?.userMessage ? request.userMessage.substring(0, 100) : 'undefined',
      fallbackUsed: true
    });

    // Fallback to GENERAL_CHAT with low confidence
    return {
      intentType: 'GENERAL_CHAT',
      confidence: 0.1
    };
  }
}

/**
 * Phase 2: Handle query interpretation - Reasoning Layer
 * Converts classified intent and user message into structured query specifications
 */
export async function handleInterpretUserQuery(request: {
  userMessage: string;
  intentType: string;
  confidence: number;
  ambiguityInfo?: {
    ambiguityScore: number;
    ambiguousTerms: string[];
    clarificationNeeded: boolean;
  };
  conversationContext?: string[];
}): Promise<UserQueryInterpretation> {
  const logger = createServerLogger('interpret-user-query');

  logger.info('FUNCTION_CALLED', {
    function: 'handleInterpretUserQuery',
    intentType: request.intentType,
    confidence: request.confidence,
    hasAmbiguity: !!request.ambiguityInfo,
    ambiguityScore: request.ambiguityInfo?.ambiguityScore
  });

  // Validate request parameters
  if (!request || typeof request.userMessage !== 'string' || !request.intentType) {
    console.error('🚨 Invalid request parameters for interpretUserQuery:', {
      request: request,
      userMessageType: typeof request?.userMessage,
      intentType: request?.intentType
    });

    return {
      querySpec: {
        conditions: [],
        outputSpec: {
          fields: ['name', 'mana_cost', 'class_name'],
          limit: 10,
          orderBy: [{ field: 'name', direction: 'ASC' }]
        },
        context: {
          userIntent: 'Error in query interpretation',
          sessionId: generateSessionId()
        }
      },
      assumptions: ['Error occurred during interpretation'],
      clarificationSuggestions: [],
      confidence: 0.1,
      reasoning: 'Invalid or missing parameters in interpretation request'
    };
  }

  try {
    const grokService = getGrokService();

    // Build reasoning prompt focused on domain knowledge and structured output
    const reasoningPrompt = `You are a Hearthstone domain expert that converts user queries into structured database specifications.

USER MESSAGE: "${request.userMessage}"
INTENT TYPE: ${request.intentType}
CLASSIFICATION CONFIDENCE: ${request.confidence}
${request.ambiguityInfo ? `AMBIGUITY INFO: Score=${request.ambiguityInfo.ambiguityScore}, Terms=[${request.ambiguityInfo.ambiguousTerms.join(', ')}]` : ''}

YOUR TASK: Convert this into structured query specifications for AST execution.

DOMAIN KNOWLEDGE:
- "Cheap" cards typically mean mana cost ≤ 3
- "Expensive" cards typically mean mana cost ≥ 7
- "Early game" = mana cost 1-3, "Mid game" = 4-6, "Late game" = 7+
- "Big" minions usually mean attack ≥ 5 or health ≥ 5
- "Small" minions usually mean attack ≤ 2 and health ≤ 3
- Popular keywords: Rush, Taunt, Battlecry, Deathrattle, Divine Shield
- Classes: Mage, Hunter, Paladin, Priest, Rogue, Shaman, Warlock, Warrior, Demon Hunter, Death Knight, Neutral

AVAILABLE FIELDS:
- class_name, mana_cost, attack, health, text, keywords, card_type, rarity, minion_type, name, formats

REASONING REQUIREMENTS:
1. Make explicit assumptions about ambiguous terms
2. Suggest clarifications for unclear queries
3. Provide structured AST conditions
4. Include appropriate output specification
5. Rate your interpretation confidence

Return ONLY a JSON object with this structure:
{
  "querySpec": {
    "conditions": [/* AST condition nodes */],
    "outputSpec": {
      "fields": ["name", "mana_cost", "attack", "health", "class_name", "card_type"],
      "limit": 15,
      "orderBy": [{"field": "mana_cost", "direction": "ASC"}]
    },
    "context": {
      "userIntent": "Detailed interpretation of user intent",
      "sessionId": "generated-session-id"
    }
  },
  "assumptions": ["List of explicit assumptions made"],
  "clarificationSuggestions": ["Suggested follow-up questions"],
  "confidence": 0.0-1.0,
  "reasoning": "Explanation of interpretation process"
}`;

    const response = await grokService.sendMessage(reasoningPrompt);

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON interpretation found in AI response');
    }

    const interpretation = JSON.parse(jsonMatch[0]) as UserQueryInterpretation;

    // Add session ID if not provided
    if (!interpretation.querySpec.context.sessionId) {
      interpretation.querySpec.context.sessionId = generateSessionId();
    }

    logger.info('FUNCTION_COMPLETED', {
      confidence: interpretation.confidence,
      assumptionsCount: interpretation.assumptions.length,
      clarificationsCount: interpretation.clarificationSuggestions.length,
      conditionsCount: interpretation.querySpec.conditions.length
    });

    return interpretation;

  } catch (error) {
    console.error('Query interpretation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during interpretation';

    logger.info('FUNCTION_ERROR', {
      error: errorMessage,
      userMessage: request.userMessage.substring(0, 100),
      fallbackUsed: true
    });

    // Fallback interpretation
    return {
      querySpec: {
        conditions: [],
        outputSpec: {
          fields: ['name', 'mana_cost', 'class_name'],
          limit: 10,
          orderBy: [{ field: 'name', direction: 'ASC' }]
        },
        context: {
          userIntent: `Error interpreting ${request.intentType} query`,
          sessionId: generateSessionId()
        }
      },
      assumptions: [`Error occurred during interpretation: ${errorMessage}`],
      clarificationSuggestions: ['Could you please rephrase your request?'],
      confidence: 0.1,
      reasoning: `Interpretation failed: ${errorMessage}`
    };
  }
}

/**
 * Phase 2: Handle structured query execution - Consumes reasoning output
 * Executes pre-interpreted query specifications from the reasoning layer
 */
export async function handleExecuteStructuredQuery(request: {
  querySpec: {
    conditions: ASTNode[];
    outputSpec: ASTOutputSpecification;
    context: {
      userIntent: string;
      sessionId?: string;
    };
  };
  reasoning?: {
    assumptions: string[];
    clarificationSuggestions: string[];
    confidence: number;
  };
}): Promise<ExploreCardsResponse & { reasoning?: any }> {
  const logger = createServerLogger('execute-structured-query');
  const startTime = Date.now();

  logger.info('FUNCTION_CALLED', {
    function: 'handleExecuteStructuredQuery',
    conditionsCount: request.querySpec.conditions.length,
    userIntent: request.querySpec.context.userIntent,
    confidence: request.reasoning?.confidence
  });

  try {
    // Convert conditions array to single AST node
    let astQuery: ASTNode;

    if (request.querySpec.conditions.length === 0) {
      // No conditions - return all cards with output spec
      astQuery = createConditionNode('collectible', 'EQUALS', true);
    } else if (request.querySpec.conditions.length === 1) {
      // Single condition
      astQuery = request.querySpec.conditions[0];
    } else {
      // Multiple conditions - combine with AND
      astQuery = createLogicalNode('AND', request.querySpec.conditions);
    }

    // Execute using existing AST handler
    const result = await handleExploreCardsAST({
      logicalQuery: astQuery,
      output: request.querySpec.outputSpec,
      context: {
        userIntent: request.querySpec.context.userIntent,
        sessionId: request.querySpec.context.sessionId
      }
    });

    // Enhance result with reasoning metadata if provided
    if (request.reasoning && result.success) {
      return {
        ...result,
        reasoning: {
          assumptions: request.reasoning.assumptions,
          clarificationSuggestions: request.reasoning.clarificationSuggestions,
          confidence: request.reasoning.confidence,
          interpretationUsed: true
        }
      };
    }

    return result;

  } catch (error) {
    const totalTime = Date.now() - startTime;

    console.error('❌ Structured Query Execution Failed:', error instanceof Error ? error.message : 'Unknown error');

    return {
      success: false,
      error: `Structured query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        totalExecutionTime: totalTime,
        flow: 'STRUCTURED_QUERY',
        stage: 'execution_failed',
        errorType: 'EXECUTION_ERROR'
      }
    };
  }
}

/**
 * Handle natural language to AST conversion and execution
 */
export async function handleExploreCardsNatural(request: {
  naturalQuery: string;
  output?: Partial<ASTOutputSpecification>;
  context: ASTQueryContext;
}): Promise<ExploreCardsResponse> {
  const logger = createServerLogger('explore-cards-natural');
  const startTime = Date.now();

  logger.info('FUNCTION_CALLED', {
    function: 'handleExploreCardsNatural',
    naturalQuery: request.naturalQuery,
    userIntent: request.context.userIntent
  });

  try {
    // 🧠 NEW: Detect ambiguity in the natural query
    const ambiguityInfo = detectQueryAmbiguity(request.naturalQuery);

    console.log(`🧠 Ambiguity detected in "${request.naturalQuery}": Score=${ambiguityInfo.ambiguityScore}, Terms=[${ambiguityInfo.ambiguousTerms.join(', ')}]`);

    // Convert natural language to AST using AI
    const rawAstTree = await convertNaturalLanguageToAST(
      request.naturalQuery,
      request.context.userIntent,
      request.context.buildingContext
    );

    // 🔄 BULLETPROOF AST TRANSFORMATION - NEVER FAILS
    logger.info('AST_TRANSFORMATION_START', {
      originalAST: rawAstTree,
      naturalQuery: request.naturalQuery
    });

    const astTree = transformNaturalLanguageAST(rawAstTree, request.naturalQuery);

    logger.info('AST_TRANSFORMATION_COMPLETE', {
      transformedAST: astTree,
      transformationTime: Date.now() - startTime
    });

    // 🧠 NEW: Intelligent ordering based on ambiguity detection
    let intelligentOrdering: Array<{ field: string; direction: 'ASC' | 'DESC' }>;

    if (ambiguityInfo.clarificationNeeded) {
      // Use domain intelligence for ambiguous queries
      const defaultStrategy = selectBestDomainDefault(ambiguityInfo.ambiguousTerms);
      intelligentOrdering = defaultStrategy.orderBy;

      console.log(`🧠 Using intelligent ordering: ${defaultStrategy.reasoning}`);
    } else {
      // Use default ordering for non-ambiguous queries
      intelligentOrdering = [
        { field: 'mana_cost', direction: 'ASC' },
        { field: 'name', direction: 'ASC' }
      ];
    }

    // Build output specification with intelligent ordering
    const outputSpec: ASTOutputSpecification = {
      fields: request.output?.fields || ['name', 'mana_cost', 'attack', 'health', 'class_name', 'card_type'],
      limit: request.output?.limit || 15,
      orderBy: request.output?.orderBy || intelligentOrdering
    };

    // Use the AST handler to execute the query
    return await handleExploreCardsAST({
      logicalQuery: astTree,
      output: outputSpec,
      context: request.context
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;

    console.error('❌ Natural Language AST Conversion Failed:', error instanceof Error ? error.message : 'Unknown error');

    return {
      success: false,
      error: `Natural language conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        totalExecutionTime: totalTime,
        flow: 'NATURAL_TO_AST',
        stage: 'conversion_failed',
        errorType: 'CONVERSION_ERROR'
      }
    };
  }
}

/**
 * Convert natural language to AST structure using AI
 */
async function convertNaturalLanguageToAST(
  naturalQuery: string,
  userIntent: string,
  buildingContext?: string
): Promise<ASTNode> {
  const grokService = getGrokService();

  const astConversionPrompt = `You are an expert at converting natural language card search queries into Abstract Syntax Tree (AST) structures for Hearthstone card database queries.

AVAILABLE AST NODE TYPES:
- AND: All child conditions must be true
- OR: Any child condition can be true
- NOT: Negates the child condition
- CONDITION: Leaf node with field/operator/value

AVAILABLE FIELDS:
- class_name: Card class (Mage, Hunter, etc.)
- mana_cost: Mana cost (0-20)
- attack: Attack value (0-50)
- health: Health value (1-100)
- text: Card text (use ILIKE for partial matches)
- keywords: Card abilities (Rush, Taunt, etc.) - use CONTAINS operator
- card_type: Card type (Minion, Spell, Weapon)
- rarity: Card rarity (Common, Rare, Epic, Legendary)
- minion_type: Minion tribe (Beast, Dragon, etc.)
- name: Card name
- formats: Game formats (standard, wild) - use CONTAINS operator for array field

AVAILABLE OPERATORS:
- EQUALS, NOT_EQUALS: Exact matches
- IN, NOT_IN: Multiple value matches
- GREATER_THAN, GREATER_EQUAL, LESS_THAN, LESS_EQUAL: Numeric comparisons
- BETWEEN: Range comparisons (use {min: X, max: Y} format)
- ILIKE, NOT_ILIKE: Text search (case-insensitive)
- CONTAINS, CONTAINS_ALL, CONTAINS_ANY, NOT_CONTAINS: Array operations

IMPORTANT FORMAT HANDLING:
- For "Wild" format: use {"field": "formats", "operator": "CONTAINS", "value": "wild"}
- For "Standard" format: use {"field": "formats", "operator": "CONTAINS", "value": "standard"}
- formats field is an array, so always use CONTAINS operator, never EQUALS

EXAMPLE CONVERSIONS:

"Mage cards with Rush" →
{
  "type": "AND",
  "children": [
    {"type": "CONDITION", "field": "class_name", "operator": "EQUALS", "value": "Mage"},
    {"type": "CONDITION", "field": "keywords", "operator": "CONTAINS", "value": "Rush"}
  ]
}

"Cards that heal OR freeze, but not legendary" →
{
  "type": "AND",
  "children": [
    {
      "type": "OR",
      "children": [
        {"type": "CONDITION", "field": "text", "operator": "ILIKE", "value": "heal"},
        {"type": "CONDITION", "field": "text", "operator": "ILIKE", "value": "freeze"}
      ]
    },
    {
      "type": "NOT",
      "children": [
        {"type": "CONDITION", "field": "rarity", "operator": "EQUALS", "value": "Legendary"}
      ]
    }
  ]
}

"Hunter cards between 3-5 mana with attack >= 4" →
{
  "type": "AND",
  "children": [
    {"type": "CONDITION", "field": "class_name", "operator": "EQUALS", "value": "Hunter"},
    {"type": "CONDITION", "field": "mana_cost", "operator": "BETWEEN", "value": {"min": 3, "max": 5}},
    {"type": "CONDITION", "field": "attack", "operator": "GREATER_EQUAL", "value": 4}
  ]
}

"Legendary cards in Wild format" →
{
  "type": "AND",
  "children": [
    {"type": "CONDITION", "field": "rarity", "operator": "EQUALS", "value": "Legendary"},
    {"type": "CONDITION", "field": "formats", "operator": "CONTAINS", "value": "wild"}
  ]
}

Convert this natural language query to AST JSON:
Query: "${naturalQuery}"
User Intent: "${userIntent}"
${buildingContext ? `Building Context: "${buildingContext}"` : ''}

Return ONLY the JSON AST structure, no explanation:`;

  try {
    const response = await grokService.sendMessage(astConversionPrompt);

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON AST found in AI response');
    }

    const astTree = JSON.parse(jsonMatch[0]);

    // Basic validation
    if (!astTree.type || !['AND', 'OR', 'NOT', 'CONDITION'].includes(astTree.type)) {
      throw new Error('Invalid AST node type');
    }

    return astTree as ASTNode;

  } catch (error) {
    throw new Error(`Failed to convert natural language to AST: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process function calls from Grok response
 */
export async function processFunctionCalls(
  response: GrokResponse,
  messages: GrokMessage[]
): Promise<{
  updatedMessages: GrokMessage[];
  functionResults: Array<{ name: string; arguments: any; result: any }>;
}> {
  let updatedMessages = [...messages];
  const functionResults: Array<{ name: string; arguments: any; result: any }> = [];

  // NOTE: Do NOT inject QueryMaster instructions here - this is the main MetaForge conversation
  // QueryMaster instructions should only be injected in the QueryMaster service internal calls
  // The main conversation should remain as MetaForge responding to users

  // Add assistant message with tool calls
  const assistantMessage = response.choices[0].message;
  updatedMessages.push({
    role: 'assistant',
    content: [{ type: 'text', text: assistantMessage.content || '' }],
    ...(assistantMessage.tool_calls && { tool_calls: assistantMessage.tool_calls })
  });

  // Process each function call
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    for (const toolCall of assistantMessage.tool_calls) {
      const functionName = toolCall.function.name;

      // CRITICAL FIX: Additional safety check before parsing
      if (!toolCall.function || toolCall.function.arguments === undefined) {
        console.error(`🚨 Function Call Error: Missing function arguments for ${functionName}`);

        // Add error result and continue processing
        functionResults.push({
          name: functionName,
          arguments: null,
          result: {
            success: false,
            error: 'Function arguments are missing or undefined'
          }
        });

        // Add function result to messages
        updatedMessages.push({
          role: 'tool',
          content: [{ type: 'text', text: JSON.stringify({
            success: false,
            error: 'Function arguments are missing or undefined'
          }) }],
          tool_call_id: toolCall.id
        });

        continue; // Skip to next function call
      }

      // Safe JSON parsing with comprehensive error handling
      const parseResult = safeParseJSON(toolCall.function.arguments, `Function: ${functionName}`);

      let functionArgs: any;
      let result: any;

      if (!parseResult.success) {
        // JSON parsing failed - create error result but continue processing other calls
        const errorMessage = 'error' in parseResult ? parseResult.error : 'Unknown parsing error';
        console.error(`🚨 Function Call Error: Failed to parse arguments for ${functionName}:`, errorMessage);

        functionArgs = null; // Set to null to indicate parsing failure
        result = {
          success: false,
          error: `Function argument parsing failed: ${errorMessage}`
        };
      } else {
        functionArgs = parseResult.data;

        // Handle different function calls
        try {
          switch (functionName) {
            case 'buildDeck':
              result = await handleBuildDeck(functionArgs as BuildDeckRequest);
              break;
            case 'encodeDeck':
              result = await handleEncodeDeck(functionArgs);
              break;
            case 'decodeDeck':
              result = await handleDecodeDeck(functionArgs);
              break;
            case 'fetchCardMetadata':
              result = await handleFetchCardMetadata(functionArgs);
              break;

            case 'detectUserIntent':
              result = await handleDetectUserIntent(functionArgs);
              break;
            case 'interpretUserQuery':
              result = await handleInterpretUserQuery(functionArgs);
              break;
            case 'executeStructuredQuery':
              result = await handleExecuteStructuredQuery(functionArgs);
              break;

            // 🗑️ REMOVED: exploreDeckBuilding case - Legacy function eliminated in Stage 2 cleanup
            // 🗑️ REMOVED: exploreCards case - Legacy function eliminated in Stage 2 cleanup
            case 'exploreCardsAST':
              result = await handleExploreCardsAST(functionArgs);
              break;
            case 'exploreCardsNatural':
              result = await handleExploreCardsNatural(functionArgs);
              break;
            default:
              result = {
                success: false,
                error: `Unknown function: ${functionName}`
              };
          }
        } catch (error) {
          // Catch any errors during function execution
          console.error(`🚨 Function Execution Error [${functionName}]:`, error);
          result = {
            success: false,
            error: `Function execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }

      // Always add to results, even if parsing/execution failed
      functionResults.push({
        name: functionName,
        arguments: functionArgs,
        result
      });

      // Add function result to messages
      updatedMessages.push({
        role: 'tool',
        content: [{ type: 'text', text: JSON.stringify(result) }],
        tool_call_id: toolCall.id
      });
    }
  }

  return { updatedMessages, functionResults };
}

// Pipeline Types for Consolidated Architecture
interface PipelineContext {
  userMessage: string;
  validMessages: GrokMessage[];
  grokService: any;
  passed_intent?: UserIntentResult;
}

interface PipelineResult {
  response: string;
  functionCalls: Array<{ name: string; arguments: any; result: any }>;
  allMessages: GrokMessage[];
}

/**
 * Consolidated Three-Stage Pipeline Implementation
 * Stage 1: Intent Detection (Classification)
 * Stage 2: Query Interpretation (Reasoning)
 * Stage 3: Structured Execution (Deterministic)
 */
async function executeConsolidatedPipeline(context: PipelineContext): Promise<PipelineResult> {
  const { userMessage, validMessages, grokService, passed_intent } = context;
  let allFunctionResults: Array<{ name: string; arguments: any; result: any }> = [];

  let intentResult: UserIntentResult;
  let intentMessages: GrokMessage[];

  if (passed_intent) {
    // Use the already-detected intent from chat route
    console.log('🎯 STAGE 1: USING PASSED INTENT (No detection needed)');
    console.log(`🧠 INTENT PASSED: ${passed_intent.intentType} (confidence: ${passed_intent.confidence})`);

    intentResult = passed_intent;
    intentMessages = validMessages; // No intent detection messages to add
  } else {
    // Fallback: Detect intent if not passed
    console.log('🎯 STAGE 1: DETECTING USER INTENT (REQUIRED)');

    const intentResponse = await grokService.client.createChatCompletion(validMessages, {
      tools: [DETECT_USER_INTENT_FUNCTION],
      tool_choice: 'required'
    });

    if (!intentResponse.choices[0].message.tool_calls?.length) {
      throw new Error('Intent detection failed - no tool calls returned');
    }

    const { updatedMessages: detectedIntentMessages, functionResults: intentFunctionResults } =
      await processFunctionCalls(intentResponse, validMessages);
    allFunctionResults.push(...intentFunctionResults);

    const detectedIntent = intentFunctionResults.find(result => result.name === 'detectUserIntent')?.result;
    if (!detectedIntent) {
      throw new Error('Intent detection failed - no result returned');
    }

    intentResult = detectedIntent;
    intentMessages = detectedIntentMessages;
    console.log(`🧠 INTENT DETECTED: ${intentResult.intentType} (confidence: ${intentResult.confidence})`);
  }

  // SPECIAL ROUTING: Check for simple deck operations before complex pipeline routing
  const hasDeckOperation = /\b(decode|encode)\b.*\b(deck|code)\b|\b(deck|code)\b.*\b(decode|encode)\b/i.test(userMessage);

  if (hasDeckOperation && (intentResult.intentType === 'DECK_BUILDING' || intentResult.intentType === 'GENERAL_CHAT')) {
    console.log('🎯 SPECIAL ROUTING: Deck operation detected - routing to Normal Flow for simple function call');
    return await executeNormalConversationFlow(intentMessages, allFunctionResults, grokService, intentResult);
  }

  // Route based on intent type - structured intents go to structured pipeline, all others to normal chat
  if (intentResult.intentType === 'CARD_SEARCH' || intentResult.intentType === 'DECK_BUILDING') {
    console.log('🎯 ROUTING TO STRUCTURED PIPELINE: Card search or deck building intent detected');
    return await executeCardSearchPipeline(userMessage, intentMessages, allFunctionResults, grokService);
  }

  // All other intents (GREETING, GENERAL_CHAT, QUESTION, etc.) exit to normal conversation flow
  console.log(`🎯 ROUTING TO NORMAL CHAT: Intent type '${intentResult.intentType}' - exiting structured pipeline`);
  return await executeNormalConversationFlow(intentMessages, allFunctionResults, grokService, intentResult);
}

/**
 * Execute card search pipeline with three-stage approach
 */
async function executeCardSearchPipeline(
  userMessage: string,
  intentMessages: GrokMessage[],
  allFunctionResults: Array<{ name: string; arguments: any; result: any }>,
  grokService: any
): Promise<PipelineResult> {

  // STAGE 2: Query Interpretation (Reasoning Layer)
  console.log('🎯 STAGE 2: INTERPRETING USER QUERY (Reasoning Layer)');

  try {
    const interpretationResponse = await grokService.client.createChatCompletion(intentMessages, {
      tools: [INTERPRET_USER_QUERY_FUNCTION],
      tool_choice: 'required'
    });

    if (interpretationResponse.choices[0].message.tool_calls?.length) {
      const { updatedMessages: interpretMessages, functionResults: interpretFunctionResults } =
        await processFunctionCalls(interpretationResponse, intentMessages);
      allFunctionResults.push(...interpretFunctionResults);

      const interpretationResult = interpretFunctionResults.find(result => result.name === 'interpretUserQuery')?.result;

      if (interpretationResult?.querySpec) {
        // STAGE 3: Structured Query Execution
        console.log('🎯 STAGE 3: EXECUTING STRUCTURED QUERY (Deterministic Execution)');

        const executionResponse = await grokService.client.createChatCompletion(interpretMessages, {
          tools: [EXECUTE_STRUCTURED_QUERY_FUNCTION],
          tool_choice: 'required'
        });

        if (executionResponse.choices[0].message.tool_calls?.length) {
          const { updatedMessages: executionMessages, functionResults: executionFunctionResults } =
            await processFunctionCalls(executionResponse, interpretMessages);
          allFunctionResults.push(...executionFunctionResults);

          const finalResponse = await grokService.client.createChatCompletion(executionMessages, {
            tools: AVAILABLE_FUNCTIONS,
            tool_choice: 'auto'
          });

          const finalMessage = finalResponse.choices[0].message;
          executionMessages.push({
            role: 'assistant',
            content: [{ type: 'text', text: finalMessage.content || '' }]
          });

          return {
            response: finalMessage.content || '',
            functionCalls: filterUserVisibleResults(allFunctionResults),
            allMessages: executionMessages
          };
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Reasoning layer failed, falling back to legacy AST functions');
  }

  // Fallback: Use legacy AST functions
  return await executeLegacyASTFallback(userMessage, intentMessages, allFunctionResults, grokService);
}

/**
 * Execute normal conversation flow with controlled function exposure based on intent
 */
async function executeNormalConversationFlow(
  intentMessages: GrokMessage[],
  allFunctionResults: Array<{ name: string; arguments: any; result: any }>,
  grokService: any,
  intentResult: UserIntentResult
): Promise<PipelineResult> {

  console.log('🎯 STAGE 2: ALLOWING NORMAL CHAT (Not a card search or low confidence)');

  // Controlled function exposure based on intent type AND message content
  const toolsToUse = (() => {
    switch (intentResult.intentType) {
      case 'GREETING':
        console.log('🔧 CONTROLLED EXPOSURE: Using CASUAL_FUNCTIONS for greeting');
        return CASUAL_FUNCTIONS;      // Just HEARTHSTONE_FUNCTION
      case 'GENERAL_CHAT':
        // Check if message specifically mentions deck operations
        const lastMessage = intentMessages[intentMessages.length - 1];
        const messageContent = lastMessage?.content?.[0];
        const userMessage = typeof messageContent === 'string' ? messageContent : messageContent?.text || '';

        // Check if auto-detection has already processed deck data
        const hasAutoProcessedDeck = userMessage.includes('[DECODED DECK DATA:]') ||
                                   userMessage.includes('SYSTEM INSTRUCTION:') ||
                                   userMessage.includes('[COMPLETE DECK ANALYSIS - NO FUNCTIONS NEEDED:]');

        if (hasAutoProcessedDeck) {
          console.log('🤖 AUTO-DETECTION: Deck already processed by system - no decode function needed');
          return CASUAL_FUNCTIONS;    // Just HEARTHSTONE_FUNCTION - no double-spend
        }

        const hasDeckOperation = /\b(decode|encode)\b.*\b(deck|code)\b|\b(deck|code)\b.*\b(decode|encode)\b/i.test(userMessage);

        if (hasDeckOperation) {
          console.log('🔧 CONTROLLED EXPOSURE: Adding deck functions for manual deck operation request');
          return [...CASUAL_FUNCTIONS, ENCODE_DECK_FUNCTION, DECODE_DECK_FUNCTION];
        } else {
          console.log('🔧 CONTROLLED EXPOSURE: Using CASUAL_FUNCTIONS for general chat');
          return CASUAL_FUNCTIONS;    // Just HEARTHSTONE_FUNCTION
        }
      case 'QUESTION':
        console.log('🔧 CONTROLLED EXPOSURE: Using NO_FUNCTIONS for pure chat');
        return NO_FUNCTIONS;          // No tools, pure chat
      default:
        console.log('🔧 CONTROLLED EXPOSURE: Using CASUAL_FUNCTIONS for unknown intent');
        return CASUAL_FUNCTIONS;      // Default to minimal tools
    }
  })();

  const normalResponse = await grokService.client.createChatCompletion(intentMessages, {
    tools: toolsToUse,
    tool_choice: toolsToUse.length > 0 ? 'auto' : 'none'
  });

  if (normalResponse.choices[0].message.tool_calls?.length) {
    const { updatedMessages: normalMessages, functionResults: normalFunctionResults } =
      await processFunctionCalls(normalResponse, intentMessages);
    allFunctionResults.push(...normalFunctionResults);

    const finalResponse = await grokService.client.createChatCompletion(normalMessages, {
      tools: toolsToUse,
      tool_choice: toolsToUse.length > 0 ? 'auto' : 'none'
    });

    const finalMessage = finalResponse.choices[0].message;
    normalMessages.push({
      role: 'assistant',
      content: [{ type: 'text', text: finalMessage.content || '' }]
    });

    return {
      response: finalMessage.content || '',
      functionCalls: filterUserVisibleResults(allFunctionResults),
      allMessages: normalMessages
    };
  } else {
    const finalMessage = normalResponse.choices[0].message;
    intentMessages.push({
      role: 'assistant',
      content: [{ type: 'text', text: finalMessage.content || '' }]
    });

    return {
      response: finalMessage.content || '',
      functionCalls: filterUserVisibleResults(allFunctionResults),
      allMessages: intentMessages
    };
  }
}

/**
 * Legacy AST fallback for when reasoning layer fails
 */
async function executeLegacyASTFallback(
  userMessage: string,
  intentMessages: GrokMessage[],
  allFunctionResults: Array<{ name: string; arguments: any; result: any }>,
  grokService: any
): Promise<PipelineResult> {

  console.log('🎯 FALLBACK: Using legacy AST functions');

  const astResponse = await grokService.client.createChatCompletion(intentMessages, {
    tools: [EXPLORE_CARDS_AST_FUNCTION, EXPLORE_CARDS_NATURAL_FUNCTION],
    tool_choice: 'required'
  });

  if (astResponse.choices[0].message.tool_calls?.length) {
    const { updatedMessages: astMessages, functionResults: astFunctionResults } =
      await processFunctionCalls(astResponse, intentMessages);
    allFunctionResults.push(...astFunctionResults);

    const finalResponse = await grokService.client.createChatCompletion(astMessages, {
      tools: AVAILABLE_FUNCTIONS,
      tool_choice: 'auto'
    });

    const finalMessage = finalResponse.choices[0].message;
    astMessages.push({
      role: 'assistant',
      content: [{ type: 'text', text: finalMessage.content || '' }]
    });

    return {
      response: finalMessage.content || '',
      functionCalls: filterUserVisibleResults(allFunctionResults),
      allMessages: astMessages
    };
  }

  throw new Error('Legacy AST fallback failed');
}

/**
 * Filter out internal functions from user display
 */
function filterUserVisibleResults(allFunctionResults: Array<{ name: string; arguments: any; result: any }>) {
  return allFunctionResults.filter(result => result.name !== 'detectUserIntent');
}

/**
 * Validate and fix messages to ensure they're ready for Grok API
 */
function validateAndFixMessages(trimmedMessages: GrokMessage[], originalMessages: GrokMessage[]): GrokMessage[] {
  // If trimmed messages are empty, preserve essential messages
  if (!trimmedMessages || trimmedMessages.length === 0) {
    console.error('❌ CRITICAL ERROR: trimmedMessages is empty - this will cause Grok API error');

    if (originalMessages && originalMessages.length > 0) {
      const lastMessage = originalMessages[originalMessages.length - 1];
      console.log('🔧 AUTHENTICATION FIX: Preserving last user message to prevent empty trimmedMessages');
      const fixedMessages = [lastMessage];

      // Also preserve system prompt if it exists
      if (originalMessages[0]?.role === 'system') {
        fixedMessages.unshift(originalMessages[0]);
      }

      console.log(`✅ FIXED: Using ${fixedMessages.length} messages instead of empty array`);
      return fixedMessages.filter(msg =>
        msg.content &&
        Array.isArray(msg.content) &&
        msg.content.length > 0 &&
        msg.content[0]?.text?.trim()
      );
    }

    throw new Error('No valid messages to send to Grok API');
  }

  // Validate each message has proper content
  const validMessages = trimmedMessages.filter(msg =>
    msg &&
    msg.content &&
    Array.isArray(msg.content) &&
    msg.content.length > 0 &&
    msg.content[0] &&
    msg.content[0].text &&
    msg.content[0].text.trim().length > 0
  );

  if (validMessages.length === 0) {
    throw new Error('No valid messages with content to send to Grok API');
  }

  return validMessages;
}

/**
 * Log token optimization results with reduced verbosity
 */
function logTokenOptimization(
  originalLength: number,
  trimmedLength: number,
  validLength: number,
  chatHistoryLength: number,
  userMessage: string,
  systemPrompt?: string
) {
  // Import optimized logger
  const { createOptimizedGrokLogger } = require('../logging/optimized-logger');
  const logger = createOptimizedGrokLogger();

  // Use optimized logging instead of verbose console output
  logger.logTokenOptimization(
    originalLength,
    trimmedLength,
    validLength,
    chatHistoryLength,
    userMessage
  );
}

// Import optimized console for all function logging
const { OptimizedConsole } = require('../logging/optimized-logger');

/**
 * Send message to Grok with CONSOLIDATED THREE-STAGE function calling support
 * Stage 1: Intent Detection (Classification)
 * Stage 2: Query Interpretation (Reasoning)
 * Stage 3: Structured Execution (Deterministic)
 */
export async function sendMessageWithFunctions(
  userMessage: string,
  chatHistory: GrokMessage[] = [],
  systemPrompt?: string,
  passed_intent?: UserIntentResult
): Promise<{
  response: string;
  functionCalls?: Array<{ name: string; arguments: any; result: any }>;
  allMessages: GrokMessage[];
}> {
  const grokService = getGrokService();

  try {
    // Build initial messages
    const messages: GrokMessage[] = [];

    // Add system prompt only for new conversations (when no chat history exists)
    if (systemPrompt && chatHistory.length === 0) {
      messages.push({
        role: 'system',
        content: [{ type: 'text', text: systemPrompt }]
      });
    }

    // Add chat history
    messages.push(...chatHistory);

    // Add user message
    messages.push({
      role: 'user',
      content: [{ type: 'text', text: userMessage }]
    });

    // Apply token optimization
    const originalLength = messages.length;
    const trimmedMessages = trimConversationHistory(messages);

    // Validate messages
    const validMessages = validateAndFixMessages(trimmedMessages, messages);

    // Log optimization results
    logTokenOptimization(originalLength, trimmedMessages.length, validMessages.length, chatHistory.length, userMessage, systemPrompt);

    // Execute consolidated pipeline
    return await executeConsolidatedPipeline({
      userMessage,
      validMessages,
      grokService,
      passed_intent
    });

  } catch (error) {
    console.error('Error in function calling:', error);

    // Fallback response
    return {
      response: 'I apologize, but I encountered an error processing your request. Please try again.',
      functionCalls: [],
      allMessages: [{
        role: 'user',
        content: [{ type: 'text', text: userMessage }]
      }, {
        role: 'assistant',
        content: [{ type: 'text', text: 'I apologize, but I encountered an error processing your request. Please try again.' }]
      }]
    };
  }
}
