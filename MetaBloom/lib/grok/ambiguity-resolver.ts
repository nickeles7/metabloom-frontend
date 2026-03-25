/**
 * Ambiguity Resolution System for MetaBloom
 * Handles conversational intelligence for ambiguous queries like "most OP cards"
 */

import { GrokMessage } from './client';
import { ASTOutputSpecification } from '../querymaster/ast-types';
import { getConversationStateManager, generateSessionId } from './conversation-state';

// Enhanced intent result with ambiguity detection
export interface EnhancedUserIntentResult {
  intentType: 'CARD_SEARCH' | 'DECK_BUILDING' | 'GENERAL_CHAT' | 'GREETING' | 'QUESTION';
  confidence: number;
  ambiguityScore: number; // 0-1, higher = more ambiguous
  ambiguousTerms: string[]; // ['OP', 'strong', 'best']
  clarificationNeeded: boolean;
  suggestedQuestions?: string[];
  domainDefaults?: {
    orderingPreference: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
    filterSuggestions: string[];
    reasoning: string;
  };
  extractedParams?: {
    keywords?: string[];
    classes?: string[];
    manaCost?: number;
    cardTypes?: string[];
    searchTerms?: string[];
  };
  reasoning?: string;
}

// Hearthstone domain knowledge about what "OP" means
export const HEARTHSTONE_OP_DEFINITIONS = {
  'high_stats': {
    description: 'Cards with high attack/health for their mana cost',
    orderBy: [
      { field: 'attack', direction: 'DESC' as const },
      { field: 'health', direction: 'DESC' as const },
      { field: 'mana_cost', direction: 'ASC' as const }
    ],
    weight: 0.8,
    reasoning: 'Prioritizing raw statistical power - high attack and health relative to cost'
  },
  'game_impact': {
    description: 'Cards that significantly affect the game state',
    orderBy: [
      { field: 'rarity', direction: 'DESC' as const }, // Legendary/Epic tend to be more impactful
      { field: 'mana_cost', direction: 'DESC' as const },
      { field: 'attack', direction: 'DESC' as const }
    ],
    weight: 0.7,
    reasoning: 'Focusing on cards with powerful, game-changing effects (usually higher rarity)'
  },
  'meta_dominance': {
    description: 'Cards commonly seen in competitive play',
    orderBy: [
      { field: 'rarity', direction: 'DESC' as const },
      { field: 'mana_cost', direction: 'DESC' as const },
      { field: 'attack', direction: 'DESC' as const }
    ],
    weight: 0.6,
    reasoning: 'Showing cards that dominate the current competitive meta'
  },
  'value_efficiency': {
    description: 'Cards that provide more value than their cost',
    orderBy: [
      { field: 'attack', direction: 'DESC' as const }, // Stat efficiency approximation
      { field: 'health', direction: 'DESC' as const },
      { field: 'mana_cost', direction: 'ASC' as const }
    ],
    weight: 0.9,
    reasoning: 'Maximizing value per mana spent - efficient stat distribution'
  }
};

// Ambiguous terms and their ambiguity scores
const AMBIGUOUS_TERMS = {
  // Power/Strength terms (high ambiguity)
  'OP': 0.9,
  'overpowered': 0.8,
  'strong': 0.7,
  'powerful': 0.7,
  'best': 0.8,
  'good': 0.6,
  'meta': 0.7,
  'broken': 0.9,
  'insane': 0.8,
  
  // Comparative terms (medium ambiguity)
  'better': 0.6,
  'worse': 0.6,
  'top': 0.5,
  'superior': 0.7,
  
  // Vague descriptors (high ambiguity)
  'decent': 0.8,
  'solid': 0.7,
  'viable': 0.6,
  'playable': 0.6,
  'competitive': 0.5
};

/**
 * Detect ambiguous terms in user query
 */
export function detectQueryAmbiguity(userMessage: string): {
  ambiguityScore: number;
  ambiguousTerms: string[];
  clarificationNeeded: boolean;
} {
  const foundTerms: string[] = [];
  let maxAmbiguity = 0;
  
  Object.entries(AMBIGUOUS_TERMS).forEach(([term, score]) => {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(userMessage)) {
      foundTerms.push(term);
      maxAmbiguity = Math.max(maxAmbiguity, score);
    }
  });
  
  return {
    ambiguityScore: maxAmbiguity,
    ambiguousTerms: foundTerms,
    clarificationNeeded: maxAmbiguity > 0.6 && foundTerms.length > 0
  };
}

/**
 * Generate contextually appropriate clarifying questions
 */
export function generateClarifyingQuestions(ambiguousTerms: string[], context: string): string[] {
  const questionTemplates: Record<string, string[]> = {
    'OP': [
      "What makes a card 'OP' to you? High stats, powerful effects, or meta dominance?",
      "Are you looking for cards with high attack/health, or cards with game-changing effects?",
      "Do you want statistically powerful cards or cards that dominate the current meta?"
    ],
    'overpowered': [
      "When you say 'overpowered', do you mean high stats or broken abilities?",
      "Are you looking for cards that are statistically overpowered or competitively overpowered?"
    ],
    'strong': [
      "When you say 'strong', do you mean high stats or powerful abilities?",
      "Are you looking for cards that are strong in stats or strong in impact?"
    ],
    'powerful': [
      "What kind of power are you looking for? Raw stats or game-changing effects?",
      "Do you want cards with powerful stats or powerful abilities?"
    ],
    'best': [
      "What criteria make a card 'best'? Stats, versatility, or competitive viability?",
      "Best for what situation? Early game, late game, or overall power level?"
    ],
    'good': [
      "What makes a card 'good' in your opinion? Stats, effects, or meta relevance?",
      "Are you looking for cards that are good in general or good for specific strategies?"
    ],
    'meta': [
      "Are you interested in current meta cards or historically meta cards?",
      "Do you want cards that define the meta or cards that are popular in the meta?"
    ],
    'broken': [
      "When you say 'broken', do you mean overpowered or game-breaking effects?",
      "Are you looking for cards with broken stats or broken abilities?"
    ]
  };
  
  const questions: string[] = [];
  ambiguousTerms.forEach(term => {
    const templates = questionTemplates[term.toLowerCase()];
    if (templates) {
      // Pick a random question template for variety
      questions.push(templates[Math.floor(Math.random() * templates.length)]);
    }
  });
  
  // If no specific templates found, use generic questions
  if (questions.length === 0) {
    questions.push(
      "Could you be more specific about what you're looking for?",
      "What criteria are most important to you for these cards?"
    );
  }
  
  return questions;
}

/**
 * Handle ambiguous queries with multi-turn conversation intelligence
 */
export async function handleAmbiguousQuery(
  userMessage: string,
  conversationHistory: GrokMessage[],
  ambiguityInfo: {
    ambiguityScore: number;
    ambiguousTerms: string[];
    clarificationNeeded: boolean;
  },
  sessionId?: string
): Promise<{
  shouldClarify: boolean;
  clarificationMessage?: string;
  domainDefaults?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  followUpStrategy: 'ASK_USER' | 'USE_DEFAULTS' | 'PROVIDE_OPTIONS';
  reasoning: string;
}> {

  // Get conversation state manager
  const stateManager = getConversationStateManager();
  const currentSessionId = sessionId || generateSessionId();
  const context = stateManager.getContext(currentSessionId);

  // Check conversation state for clarification fatigue
  const shouldAvoidClarification = stateManager.shouldAvoidClarification(currentSessionId);
  const userPreferredOrdering = stateManager.getPreferredOrdering(currentSessionId);

  // Also check message history for recent clarifications (backup method)
  const recentClarifications = conversationHistory
    .slice(-6) // Last 6 messages (3 turns)
    .filter(msg => {
      if (msg.role !== 'assistant') return false;

      // Handle both string and array content types
      let contentText = '';
      if (typeof msg.content === 'string') {
        contentText = msg.content;
      } else if (Array.isArray(msg.content) && msg.content[0] && typeof msg.content[0] === 'object' && 'text' in msg.content[0]) {
        contentText = msg.content[0].text;
      } else {
        return false;
      }

      return (
        contentText.includes('What makes') ||
        contentText.includes('Are you looking for') ||
        contentText.includes('Do you want') ||
        contentText.includes('Could you be more specific')
      );
    });

  console.log(`🧠 Ambiguity Analysis: Score=${ambiguityInfo.ambiguityScore}, Terms=[${ambiguityInfo.ambiguousTerms.join(', ')}], Recent clarifications=${recentClarifications.length}, Should avoid=${shouldAvoidClarification}, User preference=${userPreferredOrdering}`);

  // If user has a known preference, use it
  if (userPreferredOrdering) {
    console.log(`🧠 Using user's known preference: ${userPreferredOrdering}`);
    const strategy = HEARTHSTONE_OP_DEFINITIONS[userPreferredOrdering];
    return {
      shouldClarify: false,
      domainDefaults: strategy.orderBy,
      followUpStrategy: 'USE_DEFAULTS',
      reasoning: `Using user's learned preference: ${strategy.reasoning}`
    };
  }

  // If we've asked too many questions or user seems frustrated, use intelligent defaults
  if (shouldAvoidClarification || recentClarifications.length >= 2) {
    console.log('🧠 User seems tired of questions, using domain intelligence');
    const defaultStrategy = selectBestDomainDefault(ambiguityInfo.ambiguousTerms);
    return {
      shouldClarify: false,
      domainDefaults: defaultStrategy.orderBy,
      followUpStrategy: 'USE_DEFAULTS',
      reasoning: `Using domain intelligence: ${defaultStrategy.reasoning}. (User was asked ${recentClarifications.length} clarifying questions recently, frustration level: ${context.conversationFlow.userFrustrationLevel})`
    };
  }

  // If very high ambiguity and no recent clarifications, ask for clarification
  if (ambiguityInfo.ambiguityScore > 0.8 && recentClarifications.length === 0) {
    const questions = generateClarifyingQuestions(ambiguityInfo.ambiguousTerms, userMessage);
    return {
      shouldClarify: true,
      clarificationMessage: questions[0],
      followUpStrategy: 'ASK_USER',
      reasoning: `High ambiguity detected (${ambiguityInfo.ambiguityScore}), asking for clarification`
    };
  }

  // Medium-high ambiguity - provide options
  if (ambiguityInfo.ambiguityScore > 0.6 && recentClarifications.length === 0) {
    const primaryTerm = ambiguityInfo.ambiguousTerms[0];
    return {
      shouldClarify: true,
      clarificationMessage: `I can show you ${primaryTerm} cards in different ways:\n\n**1. High Stats** - Cards with great attack/health for their cost\n**2. Powerful Effects** - Cards with game-changing abilities\n**3. Meta Favorites** - Cards popular in competitive play\n\nWhich sounds most interesting, or would you like a mix of all three?`,
      followUpStrategy: 'PROVIDE_OPTIONS',
      reasoning: `Medium-high ambiguity (${ambiguityInfo.ambiguityScore}), providing multiple options`
    };
  }

  // Low-medium ambiguity or user has been asked before - use best guess defaults
  const defaultStrategy = selectBestDomainDefault(ambiguityInfo.ambiguousTerms);
  return {
    shouldClarify: false,
    domainDefaults: defaultStrategy.orderBy,
    followUpStrategy: 'USE_DEFAULTS',
    reasoning: `${defaultStrategy.reasoning}. (Ambiguity score: ${ambiguityInfo.ambiguityScore})`
  };
}

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

/**
 * Parse user response to clarifying questions
 */
export function parseUserClarification(userResponse: string): {
  orderingPreference?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  strategy: keyof typeof HEARTHSTONE_OP_DEFINITIONS | 'mixed';
  confidence: number;
} {
  const response = userResponse.toLowerCase();

  // Check for specific strategy mentions
  if (response.includes('high stat') || response.includes('attack') || response.includes('health') || response.includes('1')) {
    return {
      orderingPreference: HEARTHSTONE_OP_DEFINITIONS.high_stats.orderBy,
      strategy: 'high_stats',
      confidence: 0.9
    };
  }

  if (response.includes('effect') || response.includes('abilit') || response.includes('impact') || response.includes('2')) {
    return {
      orderingPreference: HEARTHSTONE_OP_DEFINITIONS.game_impact.orderBy,
      strategy: 'game_impact',
      confidence: 0.9
    };
  }

  if (response.includes('meta') || response.includes('competitive') || response.includes('popular') || response.includes('3')) {
    return {
      orderingPreference: HEARTHSTONE_OP_DEFINITIONS.meta_dominance.orderBy,
      strategy: 'meta_dominance',
      confidence: 0.9
    };
  }

  if (response.includes('mix') || response.includes('all') || response.includes('both')) {
    return {
      orderingPreference: HEARTHSTONE_OP_DEFINITIONS.value_efficiency.orderBy, // Best overall balance
      strategy: 'mixed',
      confidence: 0.8
    };
  }

  // If response is vague or doesn't match patterns, use default with low confidence
  return {
    orderingPreference: HEARTHSTONE_OP_DEFINITIONS.high_stats.orderBy,
    strategy: 'high_stats',
    confidence: 0.3
  };
}
