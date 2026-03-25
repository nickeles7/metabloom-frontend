/**
 * AI Integration Layer
 * Combines deck code processing with Grok AI function calling
 */

import { processDeckCodeMessage, formatDeckForAI, DecodedDeck } from './deckcode/decoder';
import { sendMessageWithFunctions, GrokMessage } from './grok/functions';

export interface AIResponse {
  message: string;
  deckCode?: string;
  formattedDeck?: string;
  functionCalls?: Array<{
    name: string;
    arguments: any;
    result: any;
  }>;
  conversationHistory: GrokMessage[];
  // Phase 2: Reasoning transparency metadata
  reasoning?: {
    assumptions?: string[];
    clarificationSuggestions?: string[];
    confidence?: number;
    interpretationUsed?: boolean;
    reasoning?: string;
  };
}

/**
 * Default system prompt - defines AI personality and behavior, not data processing
 */
const DEFAULT_SYSTEM_PROMPT = "You are MetaForge";

/**
 * Format complete deck analysis with card names from database
 */
function formatCompleteDecKAnalysis(decodedDeck: DecodedDeck, cardData: any[]): string {
  // Map hero class
  const heroNames: Record<number, string> = {
    274: 'Druid', 31: 'Hunter', 637: 'Mage', 671: 'Paladin',
    813: 'Priest', 930: 'Rogue', 1066: 'Shaman', 893: 'Warlock',
    7: 'Warrior', 56550: 'Demon Hunter'
  };

  const heroClass = heroNames[decodedDeck.heroes[0]] || `Unknown (DBF ID: ${decodedDeck.heroes[0]})`;

  // Map format
  const formatNames: Record<number, string> = {
    1: 'Wild', 2: 'Standard', 3: 'Classic'
  };
  const formatName = formatNames[decodedDeck.format] || 'Unknown';

  // Create card lookup map
  const cardMap = new Map(cardData.map(card => [card.id, card]));

  let analysis = `**${heroClass} Deck** (${formatName} Format)\n\n`;
  analysis += `**Card List:**\n`;

  // Sort cards by mana cost for better presentation
  const sortedCards = decodedDeck.cards
    .map(([dbfId, count]) => {
      const card = cardMap.get(dbfId);
      return {
        name: card?.name || `Unknown Card (ID: ${dbfId})`,
        cost: card?.mana_cost || card?.cost || 0,
        count,
        dbfId
      };
    })
    .sort((a, b) => a.cost - b.cost);

  for (const card of sortedCards) {
    analysis += `- **${card.count}x ${card.name}** (${card.cost} mana)\n`;
  }

  analysis += `\n**Deck Statistics:**\n`;
  analysis += `- Total Cards: ${decodedDeck.cards.reduce((sum, [, count]) => sum + count, 0)}\n`;
  analysis += `- Unique Cards: ${decodedDeck.cards.length}\n`;
  analysis += `- Average Mana Cost: ${(sortedCards.reduce((sum, card) => sum + (card.cost * card.count), 0) / sortedCards.reduce((sum, card) => sum + card.count, 0)).toFixed(1)}\n`;

  return analysis;
}

/**
 * Process user message with AI integration
 */
export async function processUserMessage(
  userMessage: string,
  conversationHistory: GrokMessage[] = []
): Promise<AIResponse> {
  try {
    // Check if message contains a deck code
    const deckCodeResult = processDeckCodeMessage(userMessage);

    let finalMessage = userMessage;
    const systemPrompt = DEFAULT_SYSTEM_PROMPT;

    if (deckCodeResult.hasDeckCode && deckCodeResult.decodedDeck) {
      console.log('🚀 FAST PATH: Auto-processing deck code with direct database lookup');

      try {
        // Extract card IDs for database query
        const cardIds = deckCodeResult.decodedDeck.cards.map(([dbfId]) => dbfId);

        // BYPASS GROK: Fetch card metadata directly from database
        const { originalHandleFetchCardMetadata } = await import('./grok/functions');
        const cardMetadataResult = await originalHandleFetchCardMetadata({ cardIds });

        if (cardMetadataResult.success && cardMetadataResult.data) {
          console.log(`✅ FAST PATH: Retrieved ${cardMetadataResult.data.length}/${cardIds.length} cards from database`);

          // Format complete deck analysis with actual card names
          const formattedDeckAnalysis = formatCompleteDecKAnalysis(
            deckCodeResult.decodedDeck,
            cardMetadataResult.data
          );

          // Give Grok the final formatted result - no function calling needed
          finalMessage = `${deckCodeResult.messageWithoutDeckCode}\n\n[COMPLETE DECK ANALYSIS - NO FUNCTIONS NEEDED:]\n${formattedDeckAnalysis}`;

        } else {
          console.log('⚠️ FAST PATH: Database lookup failed, falling back to Grok function calling');
          // Fallback to original slow path
          const deckInfo = formatDeckForAI(deckCodeResult.decodedDeck);
          finalMessage = `${deckCodeResult.messageWithoutDeckCode}\n\n[DECODED DECK DATA:]\n${deckInfo}\n\n[SYSTEM INSTRUCTION: Use fetchCardMetadata function with cardIds: ${JSON.stringify(cardIds)} to get detailed card information for strategic analysis]`;
        }

      } catch (error) {
        console.log('⚠️ FAST PATH: Error in direct processing, falling back to Grok function calling:', error);
        // Fallback to original slow path
        const deckInfo = formatDeckForAI(deckCodeResult.decodedDeck);
        const cardIds = deckCodeResult.decodedDeck.cards.map(([dbfId]) => dbfId);
        finalMessage = `${deckCodeResult.messageWithoutDeckCode}\n\n[DECODED DECK DATA:]\n${deckInfo}\n\n[SYSTEM INSTRUCTION: Use fetchCardMetadata function with cardIds: ${JSON.stringify(cardIds)} to get detailed card information for strategic analysis]`;
      }
    }

    // Send to Grok with function calling support
    const response = await sendMessageWithFunctions(
      finalMessage,
      conversationHistory,
      systemPrompt
    );

    // Extract deck code and reasoning metadata from function calls if any
    let generatedDeckCode: string | undefined;
    let formattedDeck: string | undefined;
    let reasoningMetadata: AIResponse['reasoning'] | undefined;

    if (response.functionCalls) {
      for (const functionCall of response.functionCalls) {
        // Extract deck building results
        if (functionCall.name === 'buildDeck' && functionCall.result.success) {
          generatedDeckCode = functionCall.result.deckCode;
          formattedDeck = functionCall.result.formattedDeck;
        }

        // Extract reasoning metadata from structured query execution
        if (functionCall.name === 'executeStructuredQuery' && functionCall.result.reasoning) {
          reasoningMetadata = {
            assumptions: functionCall.result.reasoning.assumptions,
            clarificationSuggestions: functionCall.result.reasoning.clarificationSuggestions,
            confidence: functionCall.result.reasoning.confidence,
            interpretationUsed: functionCall.result.reasoning.interpretationUsed,
            reasoning: functionCall.result.reasoning.reasoning
          };
        }

        // Extract reasoning metadata from interpretation function
        if (functionCall.name === 'interpretUserQuery' && functionCall.result) {
          reasoningMetadata = {
            assumptions: functionCall.result.assumptions,
            clarificationSuggestions: functionCall.result.clarificationSuggestions,
            confidence: functionCall.result.confidence,
            interpretationUsed: true,
            reasoning: functionCall.result.reasoning
          };
        }
      }
    }

    return {
      message: response.response,
      deckCode: generatedDeckCode,
      formattedDeck: formattedDeck,
      functionCalls: response.functionCalls,
      conversationHistory: response.allMessages,
      reasoning: reasoningMetadata
    };

  } catch (error) {
    console.error('Error processing user message:', error);
    throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Quick test function for the AI integration
 */
export async function testAIIntegration(): Promise<void> {
  console.log('🧪 Testing AI Integration...\n');

  try {
    // Test 1: Simple deck building request
    console.log('Test 1: Deck Building Request');
    const buildResponse = await processUserMessage(
      'Build me a Standard Druid deck focused on ramp and big minions'
    );

    console.log('Response:', buildResponse.message);
    if (buildResponse.deckCode) {
      console.log('Generated Deck Code:', buildResponse.deckCode);
    }
    if (buildResponse.functionCalls) {
      console.log('Function Calls:', buildResponse.functionCalls.length);
    }
    console.log('---\n');

    // Test 2: Deck code analysis (using a test deck code)
    console.log('Test 2: Deck Code Analysis');
    const testDeckCode = 'AAECAZICBKqBB5KDB6+HB6yIBw2HnwSunwSA1ASB1ASiswbDugbW+gbggQf3gQeIgwewhwfAhwekiQcAAA==';
    const analysisResponse = await processUserMessage(
      `Analyze this deck: ${testDeckCode}`
    );

    console.log('Response:', analysisResponse.message);
    console.log('---\n');

    // Test 3: Conversation with history
    console.log('Test 3: Conversation with History');
    const followUpResponse = await processUserMessage(
      'Can you make it more aggressive?',
      buildResponse.conversationHistory
    );

    console.log('Response:', followUpResponse.message);
    if (followUpResponse.deckCode) {
      console.log('Updated Deck Code:', followUpResponse.deckCode);
    }

    console.log('✅ AI Integration tests completed successfully!');

  } catch (error) {
    console.error('❌ AI Integration test failed:', error);
    throw error;
  }
}

/**
 * Create a simple chat interface for testing
 */
export class HearthstoneAIChat {
  private conversationHistory: GrokMessage[] = [];

  async sendMessage(userMessage: string): Promise<AIResponse> {
    const response = await processUserMessage(userMessage, this.conversationHistory);
    this.conversationHistory = response.conversationHistory;
    return response;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): GrokMessage[] {
    return [...this.conversationHistory];
  }
}

/**
 * Utility function to format AI response for display with reasoning transparency
 */
export function formatAIResponseForDisplay(response: AIResponse, showReasoning: boolean = false): string {
  let formatted = response.message;

  if (response.deckCode) {
    formatted += `\n\n**Deck Code:**\n\`\`\`\n${response.deckCode}\n\`\`\``;
  }

  if (response.formattedDeck) {
    formatted += `\n\n**Deck List:**\n\`\`\`\n${response.formattedDeck}\n\`\`\``;
  }

  if (response.functionCalls && response.functionCalls.length > 0) {
    formatted += `\n\n*Generated ${response.functionCalls.length} deck(s)*`;
  }

  // Phase 2: Add reasoning transparency when available and requested
  if (showReasoning && response.reasoning) {
    formatted += formatReasoningMetadata(response.reasoning);
  }

  return formatted;
}

/**
 * Format reasoning metadata for display
 */
export function formatReasoningMetadata(reasoning: NonNullable<AIResponse['reasoning']>): string {
  let reasoningText = '';

  // Show interpretation confidence if available
  if (reasoning.confidence !== undefined && reasoning.confidence < 0.9) {
    reasoningText += `\n\n---\n**🤔 Interpretation Confidence:** ${Math.round(reasoning.confidence * 100)}%`;
  }

  // Show assumptions made during interpretation
  if (reasoning.assumptions && reasoning.assumptions.length > 0) {
    reasoningText += `\n\n**💭 My Assumptions:**`;
    reasoning.assumptions.forEach(assumption => {
      reasoningText += `\n• ${assumption}`;
    });
  }

  // Show clarification suggestions for ambiguous queries
  if (reasoning.clarificationSuggestions && reasoning.clarificationSuggestions.length > 0) {
    reasoningText += `\n\n**❓ To get more precise results, you could ask:**`;
    reasoning.clarificationSuggestions.forEach(suggestion => {
      reasoningText += `\n• ${suggestion}`;
    });
  }

  // Show reasoning explanation if available
  if (reasoning.reasoning && reasoning.interpretationUsed) {
    reasoningText += `\n\n**🧠 How I interpreted your request:**\n${reasoning.reasoning}`;
  }

  return reasoningText;
}

/**
 * Validate environment setup
 */
export function validateAISetup(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required environment variables
  if (!process.env.XAI_API_KEY) {
    errors.push('XAI_API_KEY environment variable is not set');
  }

  // Add other validation checks as needed

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Example usage and testing
 */
export const EXAMPLE_USAGE = {
  deckBuilding: 'Build me a Standard Druid deck with ramp and big minions',
  deckAnalysis: 'Analyze this deck: AAECAZICBKqBB5KDB6+HB6yIBw2HnwSunwSA1ASB1ASiswbDugbW+gbggQf3gQeIgwewhwfAhwekiQcAAA==',
  metaQuestion: 'What are the strongest decks in the current meta?',
  deckOptimization: 'How can I improve my Druid deck for the current meta?'
};
