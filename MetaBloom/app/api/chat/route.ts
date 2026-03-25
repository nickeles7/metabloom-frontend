import { NextRequest } from 'next/server';
import { getGrokService } from '@/lib/grok/service';
import { processDeckCodeMessage } from '@/lib/deckcode/decoder';
import { AVAILABLE_FUNCTIONS, CASUAL_FUNCTIONS, NO_FUNCTIONS, ENCODE_DECK_FUNCTION, DECODE_DECK_FUNCTION } from '@/lib/grok/functions';
import { createServerLogger, ServerQuickLog } from '@/lib/logging/server';
import { isEmailVerified } from '@/lib/subscription';
import { SessionManager, PerformanceTimer } from '@/lib/logging';

/**
 * Pre-routing system for deterministic pattern matching
 * Routes obvious patterns instantly without AI intent detection
 */
function getPreRoutingDecision(message: string): { route?: string, confidence: number, description?: string } {
  if (!message || typeof message !== 'string') {
    return { confidence: 0 };
  }

  const trimmedMessage = message.trim().toLowerCase();

  // 1. DECK CODE PATTERN - Highest priority (base64 strings 20-150 chars)
  if (/\b[A-Za-z0-9+/]{20,150}={0,2}\b/.test(message)) {
    return {
      route: 'DECK_CODE_ANALYSIS',
      confidence: 1.0,
      description: 'Deck code pattern detected'
    };
  }

  // 2. EXPLICIT DECODE/ENCODE REQUESTS
  if (/\b(decode|encode)\b.*\b(deck|code)\b|\b(deck|code)\b.*\b(decode|encode)\b/i.test(message)) {
    return {
      route: 'DECK_OPERATIONS',
      confidence: 0.95,
      description: 'Explicit deck operation request'
    };
  }

  // 3. INQUIRY PATTERNS (vague requests needing parameter gathering) - CHECK FIRST!
  if (/\b(help|want|wanna|can you|need help|assist)\b.*\b(build|find|search|deck|card|collection)\b/i.test(message) &&
      !/\b(aggro|control|tempo|combo|mage|warrior|hunter|druid|priest|paladin|rogue|shaman|warlock|rush|taunt|divine shield|[0-9]+\s*mana|standard|wild|classic)\b/i.test(message)) {
    return {
      route: 'INQUIRY',
      confidence: 0.85,
      description: 'Vague request needing parameter gathering'
    };
  }

  // 4. CARD SEARCH PATTERNS (specific requests)
  if (/\b(find|search|show|get|list)\b.*\b(card|minion|spell|weapon)\b/i.test(message)) {
    return {
      route: 'CARD_SEARCH',
      confidence: 0.9,
      description: 'Card search pattern detected'
    };
  }

  // 5. DECK BUILDING PATTERNS (specific requests)
  if (/\b(build|create|make|construct)\b.*\bdeck\b|\bdeck.*\b(build|create|make|construct)\b/i.test(message)) {
    return {
      route: 'DECK_BUILDING',
      confidence: 0.9,
      description: 'Deck building pattern detected'
    };
  }

  // 6. GREETING PATTERNS (simple greetings only)
  if (/^(hi|hey|hello|sup|what's up|yo)[\s!?]*$/i.test(trimmedMessage)) {
    return {
      route: 'GREETING',
      confidence: 0.95,
      description: 'Simple greeting detected'
    };
  }

  // 7. QUESTION PATTERNS (how/what/why questions)
  if (/^(how|what|why|when|where)\b.*\?/i.test(trimmedMessage)) {
    return {
      route: 'QUESTION',
      confidence: 0.85,
      description: 'Question pattern detected'
    };
  }

  // No pre-routing match - fallback to AI
  return { confidence: 0 };
}

/**
 * Format complete deck analysis with card names from database
 */
function formatCompleteDecKAnalysis(decodedDeck: any, cardData: any[]): string {
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
    .map(([dbfId, count]: [number, number]) => {
      const card = cardMap.get(dbfId);
      return {
        name: card?.name || `Unknown Card (ID: ${dbfId})`,
        cost: card?.cost || card?.mana_cost || 0, // Database normalizes to 'cost'
        count,
        dbfId,
        // Debug info
        rawCard: card ? { id: card.id, name: card.name, cost: card.cost } : null
      };
    })
    .sort((a: any, b: any) => a.cost - b.cost);

  for (const card of sortedCards) {
    analysis += `- **${card.count}x ${card.name}** (${card.cost} mana)\n`;
  }

  analysis += `\n**Deck Statistics:**\n`;
  analysis += `- Total Cards: ${decodedDeck.cards.reduce((sum: number, [, count]: [number, number]) => sum + count, 0)}\n`;
  analysis += `- Unique Cards: ${decodedDeck.cards.length}\n`;
  analysis += `- Average Mana Cost: ${(sortedCards.reduce((sum: number, card: any) => sum + (card.cost * card.count), 0) / sortedCards.reduce((sum: number, card: any) => sum + card.count, 0)).toFixed(1)}\n`;

  return analysis;
}

// Configuration constants
const CONFIG = {
  MAX_MESSAGE_LENGTH: 10000, // Prevent abuse
  // DATABASE_API_CONFIG will be added in Phase 3
} as const;

/**
 * Validate input message
 */
function validateMessage(message: string): void {
  if (!message || typeof message !== 'string') {
    throw new Error('Message is required and must be a string');
  }

  if (message.length > CONFIG.MAX_MESSAGE_LENGTH) {
    throw new Error(`Message too long (max ${CONFIG.MAX_MESSAGE_LENGTH} characters)`);
  }

  // Basic sanitization - remove null bytes and control characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(message)) {
    throw new Error('Message contains invalid characters');
  }
}

// Database query function will be added in Phase 3

/**
 * Handle API errors with appropriate status codes and messages
 */
function handleApiError(error: Error & { status?: number }, context: string, requestId?: string): Response {
  const logger = createServerLogger('chat-api');
  let statusCode = 500;
  let errorMessage = 'Internal server error';

  if (error.message?.includes('Message too long')) {
    statusCode = 413; // Payload Too Large
    errorMessage = error.message;
  } else if (error.message?.includes('invalid characters')) {
    statusCode = 400; // Bad Request
    errorMessage = 'Invalid message format';
  } else if (error.status) {
    statusCode = error.status;
    errorMessage = error.message || 'API error';
  }

  logger.error('REQUEST_FAILED', error, {
    requestId,
    context,
    statusCode,
    errorMessage,
    userFacing: statusCode < 500
  });

  return new Response(JSON.stringify({
    error: errorMessage,
    message: statusCode >= 500 ? 'Please try again later' : error.message
  }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  const logger = createServerLogger('chat-api');
  const timer = new PerformanceTimer('chat-api', 'POST');

  // Parse request body to get chatId
  const body = await req.json();
  const { message, chatHistory, userPreferences, chatId } = body;

  // Use chatId as sessionId for proper cache isolation per chat
  const sessionId = chatId ? `session_${chatId}` : SessionManager.initializeFromRequest({
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  });

  const requestId = SessionManager.startRequest({
    method: 'POST',
    path: '/api/chat',
    userAgent: req.headers.get('user-agent') || undefined,
    sessionId
  });

  try {
    logger.info('REQUEST_START', {
      requestId,
      method: 'POST',
      path: '/api/chat',
      userAgent: req.headers.get('user-agent'),
      contentType: req.headers.get('content-type')
    });

    // Validate input
    validateMessage(message);

    logger.info('REQUEST_PARSED', {
      requestId,
      messageLength: message.length,
      historyLength: (chatHistory || []).length,
      messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : '')
    });

    // CONVERSATION LENGTH MONITORING FOR TOKEN OPTIMIZATION (Optimized)
    const conversationLength = (chatHistory || []).length;

    // Only log session flow summary
    logger.info('SESSION_FLOW', {
      requestId,
      conversationLength,
      tokenOptimizationActive: conversationLength > 8
    });

    // Only warn on very long conversations (reduced threshold)
    if (conversationLength > 20) {
      logger.warn('PERFORMANCE', {
        requestId,
        operation: 'long_conversation_detected',
        conversationLength
      });
    }

    // Convert chatHistory to the format expected by Grok service
    interface ChatMessage {
      isUser: boolean;
      text: string;
      timestamp?: number;
    }
    const formattedHistory = (chatHistory || []).map((msg: ChatMessage) => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.text,
      timestamp: msg.timestamp
    }));

    // Debug: Log the chat history being sent
    console.log('🔍 DEBUGGING CONVERSATION CONTEXT:');
    console.log(`📝 Current message: "${message}"`);
    console.log(`📚 Chat history length: ${formattedHistory.length}`);
    console.log(`🔧 Function calling enabled: ${AVAILABLE_FUNCTIONS.length} functions available`);

    // 🎯 PRE-ROUTING SYSTEM: Check for deterministic patterns before AI intent detection
    console.log('🎯 Checking for pre-routing patterns...');
    const preRouting = getPreRoutingDecision(message);
    let processedMessage = message; // Default to original message
    let deckCodeInfo = '';

    if (preRouting.route && preRouting.confidence > 0.8) {
      console.log(`🎯 PRE-ROUTING MATCH: ${preRouting.route} (confidence: ${preRouting.confidence}) - ${preRouting.description}`);

      // Handle deck code auto-processing
      if (preRouting.route === 'DECK_CODE_ANALYSIS') {
        console.log('🚀 AUTO-PROCESSING: Deck code detected - running decode pipeline');

        const deckCodeResult = processDeckCodeMessage(message);

        if (deckCodeResult.hasDeckCode && deckCodeResult.decodedDeck) {
          deckCodeInfo = `Deck detected: ${deckCodeResult.decodedDeck.cards.length} unique cards`;

          try {
            // Extract card IDs for database query
            const cardIds = deckCodeResult.decodedDeck.cards.map(([dbfId]) => dbfId);

            // BYPASS GROK: Fetch card metadata directly from database
            const { originalHandleFetchCardMetadata } = await import('@/lib/grok/functions');
            const cardMetadataResult = await originalHandleFetchCardMetadata({ cardIds });

            if (cardMetadataResult.success && cardMetadataResult.data) {
              console.log(`✅ AUTO-PROCESSING: Retrieved ${cardMetadataResult.data.length}/${cardIds.length} cards from database`);

              // Debug: Log first few cards to check data quality
              console.log('🔍 DEBUG: Sample card data:', cardMetadataResult.data.slice(0, 3).map(card => ({
                id: card.id,
                name: card.name,
                cost: card.cost,
                mana_cost: card.mana_cost,
                type: card.type,
                allFields: Object.keys(card)
              })));

              // Debug: Log deck structure
              console.log('🔍 DEBUG: Deck structure:', {
                totalCards: deckCodeResult.decodedDeck.cards.reduce((sum: number, [, count]: [number, number]) => sum + count, 0),
                uniqueCards: deckCodeResult.decodedDeck.cards.length,
                sampleCards: deckCodeResult.decodedDeck.cards.slice(0, 3)
              });

              // Format complete deck analysis with actual card names
              const formattedDeckAnalysis = formatCompleteDecKAnalysis(
                deckCodeResult.decodedDeck,
                cardMetadataResult.data
              );

              // Debug: Log formatted analysis length and preview
              console.log('🔍 DEBUG: Formatted analysis length:', formattedDeckAnalysis.length);
              console.log('🔍 DEBUG: Analysis preview:', formattedDeckAnalysis.substring(0, 200) + '...');

              // Give processed data to AI for conversational presentation
              processedMessage = `${deckCodeResult.messageWithoutDeckCode}\n\n[DECK ANALYSIS FOR CONVERSATION:]\n${formattedDeckAnalysis}`;

              console.log('🤖 AUTO-PROCESSING: Deck data prepared for AI conversational presentation');

            } else {
              console.log('⚠️ AUTO-PROCESSING: Database lookup failed, keeping original message');
              console.log('🔍 DEBUG: Card metadata result:', {
                success: cardMetadataResult.success,
                dataLength: cardMetadataResult.data?.length,
                error: cardMetadataResult.error
              });
            }

          } catch (error) {
            console.log('⚠️ AUTO-PROCESSING: Error in processing, keeping original message:', error);
          }
        }

        logger.info('AUTO_DECK_PROCESSING', {
          requestId,
          hasDeckCode: deckCodeResult?.hasDeckCode || false,
          cardCount: deckCodeResult?.decodedDeck?.cards.length || 0,
          autoProcessed: processedMessage !== message
        });
      }
    } else {
      console.log('🎯 No pre-routing match - will use AI intent detection');
    }

    // Helper function to format reasoning metadata for streaming with detail levels
    const formatReasoningForStream = (reasoning: any, detailLevel: 'minimal' | 'standard' | 'detailed' = 'standard'): string => {
      if (!reasoning) return '';

      let reasoningText = '';

      // Minimal: Only show confidence if very low
      if (detailLevel === 'minimal') {
        if (reasoning.confidence !== undefined && reasoning.confidence < 0.7) {
          reasoningText += `\n\n---\n**🤔 Low Confidence:** ${Math.round(reasoning.confidence * 100)}%`;
        }
        return reasoningText;
      }

      // Standard: Show confidence, key assumptions, and clarifications
      if (detailLevel === 'standard') {
        // Show interpretation confidence if low
        if (reasoning.confidence !== undefined && reasoning.confidence < 0.9) {
          reasoningText += `\n\n---\n**🤔 Interpretation Confidence:** ${Math.round(reasoning.confidence * 100)}%`;
        }

        // Show key assumptions (limit to 2 for standard)
        if (reasoning.assumptions && reasoning.assumptions.length > 0) {
          reasoningText += `\n\n**💭 Key Assumptions:**`;
          reasoning.assumptions.slice(0, 2).forEach((assumption: string) => {
            reasoningText += `\n• ${assumption}`;
          });
          if (reasoning.assumptions.length > 2) {
            reasoningText += `\n• ... and ${reasoning.assumptions.length - 2} more`;
          }
        }

        // Show clarification suggestions (limit to 2 for standard)
        if (reasoning.clarificationSuggestions && reasoning.clarificationSuggestions.length > 0) {
          reasoningText += `\n\n**❓ For more precision:**`;
          reasoning.clarificationSuggestions.slice(0, 2).forEach((suggestion: string) => {
            reasoningText += `\n• ${suggestion}`;
          });
        }

        return reasoningText;
      }

      // Detailed: Show everything
      if (detailLevel === 'detailed') {
        // Show interpretation confidence
        if (reasoning.confidence !== undefined) {
          reasoningText += `\n\n---\n**🤔 Interpretation Confidence:** ${Math.round(reasoning.confidence * 100)}%`;
        }

        // Show all assumptions
        if (reasoning.assumptions && reasoning.assumptions.length > 0) {
          reasoningText += `\n\n**💭 My Assumptions:**`;
          reasoning.assumptions.forEach((assumption: string) => {
            reasoningText += `\n• ${assumption}`;
          });
        }

        // Show all clarification suggestions
        if (reasoning.clarificationSuggestions && reasoning.clarificationSuggestions.length > 0) {
          reasoningText += `\n\n**❓ To get more precise results, you could ask:**`;
          reasoning.clarificationSuggestions.forEach((suggestion: string) => {
            reasoningText += `\n• ${suggestion}`;
          });
        }

        // Show reasoning explanation
        if (reasoning.reasoning && reasoning.interpretationUsed) {
          reasoningText += `\n\n**🧠 How I interpreted your request:**\n${reasoning.reasoning}`;
        }
      }

      return reasoningText;
    };

    // Get Grok service and create streaming response with function calling support (Optimized)
    logger.info('FUNCTION_CALLED', {
      requestId,
      function: 'createStreamingResponse',
      model: 'grok-3-latest',
      toolsAvailable: AVAILABLE_FUNCTIONS.length
    });

    const grokService = getGrokService();

    /**
     * Normal Streaming Implementation
     * Direct streaming for trivial intents (greetings, casual chat)
     * No function calling, no loading bubbles - just immediate response
     */
    function createNormalStream(
      userMessage: string,
      chatHistory: Array<{ role: string; content: string; timestamp?: number }>,
      grokService: any,
      intentResult: any,
      request?: Request
    ): ReadableStream<Uint8Array> {
      return new ReadableStream({
        async start(controller) {
          try {
            console.log('🎯 Starting Normal Streaming for trivial intent');

            // Convert chat history to Grok format
            const grokHistory = chatHistory.map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: [{ type: 'text', text: msg.content }]
            }));

            // Add current user message
            const messages = [
              ...grokHistory,
              {
                role: 'user' as const,
                content: [{ type: 'text', text: userMessage }]
              }
            ];

            // Determine tools based on intent (controlled function exposure)
            const toolsToUse = (() => {
              switch (intentResult.intentType) {
                case 'GREETING':
                  return CASUAL_FUNCTIONS;      // Just HEARTHSTONE_FUNCTION
                case 'GENERAL_CHAT':
                  // Check if this is an inquiry intent needing parameter gathering
                  if (intentResult.source === 'pre-routing' &&
                      intentResult.description?.includes('parameter gathering')) {
                    console.log('🤔 INQUIRY MODE: Parameter gathering - no heavy functions exposed');
                    return CASUAL_FUNCTIONS;    // Just HEARTHSTONE_FUNCTION for context
                  }

                  // Check if this is auto-processed deck data for conversational presentation
                  const hasAutoProcessedDeck = userMessage.includes('[DECK ANALYSIS FOR CONVERSATION:]') ||
                                             userMessage.includes('[DECODED DECK DATA:]') ||
                                             userMessage.includes('[COMPLETE DECK ANALYSIS - NO FUNCTIONS NEEDED:]');

                  if (hasAutoProcessedDeck) {
                    console.log('🤖 AUTO-PROCESSED: Deck data ready for conversational presentation - no functions needed');
                    return CASUAL_FUNCTIONS;    // Just HEARTHSTONE_FUNCTION - no double-spend
                  }

                  // Check if message specifically mentions deck operations (manual requests)
                  const hasDeckOperation = /\b(decode|encode)\b.*\b(deck|code)\b|\b(deck|code)\b.*\b(decode|encode)\b/i.test(userMessage);

                  if (hasDeckOperation) {
                    console.log('🔧 NORMAL STREAMING: Adding deck functions for manual deck operation request');
                    return [...CASUAL_FUNCTIONS, ENCODE_DECK_FUNCTION, DECODE_DECK_FUNCTION];
                  } else {
                    return CASUAL_FUNCTIONS;    // Just HEARTHSTONE_FUNCTION
                  }
                case 'QUESTION':
                  return NO_FUNCTIONS;          // No tools, pure chat
                default:
                  return CASUAL_FUNCTIONS;      // Safe default
              }
            })();

            console.log(`🔧 NORMAL STREAMING: Using ${toolsToUse.length} functions for ${intentResult.intentType} intent`);

            // Create direct streaming response from Grok
            const streamResponse = await grokService.client.createStreamingChatCompletion(messages, {
              tools: toolsToUse,
              tool_choice: toolsToUse.length > 0 ? 'auto' : 'none'
            });

            // Process the stream and forward to client using GrokClient's parseStreamChunk
            const reader = streamResponse.getReader();
            const decoder = new TextDecoder();
            let buffer = ''; // Buffer for incomplete chunks

            while (true) {
              // Check if request was aborted
              if (request?.signal?.aborted) {
                console.log('🛑 Request aborted, stopping Normal Streaming');
                reader.cancel();
                return;
              }

              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              // Process complete lines from buffer
              const lines = buffer.split('\n');
              // Keep the last potentially incomplete line in buffer
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.substring(6).trim();

                  if (data === '[DONE]') {
                    try {
                      if (controller.desiredSize !== null) {
                        const doneLine = `data: [DONE]\n\n`;
                        controller.enqueue(new TextEncoder().encode(doneLine));
                        controller.close();
                        console.log('🎉 Normal Streaming completed successfully');
                      } else {
                        console.log('⚠️ Controller already closed on completion');
                      }
                    } catch (doneError) {
                      console.error('❌ Error sending DONE signal:', doneError);
                    }
                    return;
                  }

                  if (data && data !== '') {
                    // Use GrokClient's parseStreamChunk method for proper JSON handling
                    const grokChunk = grokService.client.parseStreamChunk(line);

                    if (grokChunk) {
                      // Extract content from Grok's streaming format
                      if (grokChunk.choices && grokChunk.choices[0] && grokChunk.choices[0].delta) {
                        const delta = grokChunk.choices[0].delta;

                        // Handle regular content streaming
                        if (delta.content) {
                          try {
                            // Check if controller is still open before enqueuing
                            if (controller.desiredSize !== null) {
                              const chatBoxData = {
                                content: delta.content,
                                tokensUsed: 0
                              };
                              const formattedLine = `data: ${JSON.stringify(chatBoxData)}\n\n`;
                              controller.enqueue(new TextEncoder().encode(formattedLine));
                            } else {
                              console.log('⚠️ Controller closed, stopping stream');
                              break;
                            }
                          } catch (enqueueError) {
                            console.error('❌ Error enqueuing data:', enqueueError);
                            break;
                          }
                        }
                      }
                    }
                    // Note: parseStreamChunk already handles errors internally with proper logging
                  }
                }
              }
            }

          } catch (error) {
            console.error('❌ Error in Normal Streaming:', error);

            // Send error message only if controller is still open
            try {
              if (controller.desiredSize !== null) {
                const errorData = {
                  content: "I'm having trouble responding right now. Please try again.",
                  tokensUsed: 0
                };
                const errorLine = `data: ${JSON.stringify(errorData)}\n\n`;
                controller.enqueue(new TextEncoder().encode(errorLine));

                const doneLine = `data: [DONE]\n\n`;
                controller.enqueue(new TextEncoder().encode(doneLine));
              } else {
                console.log('⚠️ Controller already closed, skipping error message');
              }
            } catch (finalError) {
              console.error('❌ Error sending final message:', finalError);
            }
            controller.close();
          }
        }
      });
    }

    /**
     * Hidden Sequential Streaming Implementation
     * 1. Show loading bubbles while two-stage processing runs (hidden)
     * 2. Stream final intelligent response (visible)
     */
    function createHiddenSequentialStream(
      userMessage: string,
      chatHistory: Array<{ role: string; content: string; timestamp?: number }>,
      grokService: any,
      passed_intent?: any,
      request?: Request
    ): ReadableStream<Uint8Array> {
      return new ReadableStream({
        async start(controller) {
          try {
            console.log('🎭 Starting Hidden Sequential Streaming');

            // Check if request was aborted before starting
            if (request?.signal?.aborted) {
              console.log('🛑 Request aborted before Hidden Sequential Streaming start');
              return;
            }

            // PHASE 1: Show loading bubbles while processing
            console.log('💭 Showing loading bubbles during two-stage processing');

            const loadingData = {
              content: '',
              isLoading: true,
              loadingType: 'thinking' // Special flag for 3-dot animation
            };
            const loadingLine = `data: ${JSON.stringify(loadingData)}\n\n`;
            console.log('📤 Sending loading data:', loadingLine);

            if (controller.desiredSize !== null) {
              controller.enqueue(new TextEncoder().encode(loadingLine));
            } else {
              console.log('⚠️ Controller closed during loading phase');
              return;
            }

            // PHASE 2: Run two-stage system in background (hidden from user)
            console.log('🧠 Running two-stage intelligence in background...');
            const { sendMessageWithFunctions } = await import('@/lib/grok/functions');

            const intelligentResult = await sendMessageWithFunctions(
              userMessage,
              chatHistory.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: [{ type: 'text', text: msg.content }]
              })),
              undefined, // systemPrompt
              passed_intent // passed_intent
            );

            console.log('✅ Two-stage processing complete:', {
              hasResponse: !!intelligentResult.response,
              responseLength: intelligentResult.response?.length || 0,
              functionCallsExecuted: intelligentResult.functionCalls?.length || 0
            });

            // Phase 2: Extract reasoning metadata from function calls
            let reasoningMetadata: any = null;
            if (intelligentResult.functionCalls) {
              for (const functionCall of intelligentResult.functionCalls) {
                // Extract reasoning from structured query execution
                if (functionCall.name === 'executeStructuredQuery' && functionCall.result?.reasoning) {
                  reasoningMetadata = functionCall.result.reasoning;
                  break;
                }
                // Extract reasoning from interpretation function
                if (functionCall.name === 'interpretUserQuery' && functionCall.result) {
                  reasoningMetadata = {
                    assumptions: functionCall.result.assumptions,
                    clarificationSuggestions: functionCall.result.clarificationSuggestions,
                    confidence: functionCall.result.confidence,
                    interpretationUsed: true,
                    reasoning: functionCall.result.reasoning
                  };
                  break;
                }
              }
            }

            console.log('🧠 Reasoning metadata extracted:', {
              hasReasoning: !!reasoningMetadata,
              confidence: reasoningMetadata?.confidence,
              assumptionsCount: reasoningMetadata?.assumptions?.length || 0,
              clarificationsCount: reasoningMetadata?.clarificationSuggestions?.length || 0
            });

            // PHASE 3: Stop loading bubbles
            console.log('🛑 Stopping loading bubbles');
            const stopLoadingData = {
              content: '',
              isLoading: false
            };
            const stopLoadingLine = `data: ${JSON.stringify(stopLoadingData)}\n\n`;
            console.log('📤 Sending stop loading data:', stopLoadingLine);
            controller.enqueue(new TextEncoder().encode(stopLoadingLine));

            // PHASE 4: Stream the intelligent response with reasoning transparency
            console.log('📤 Streaming intelligent response to user');

            if (intelligentResult.response && intelligentResult.response.trim()) {
              // Stream the intelligent response word by word for natural effect
              const words = intelligentResult.response.split(' ');

              for (let i = 0; i < words.length; i++) {
                const word = words[i] + (i < words.length - 1 ? ' ' : '');
                const wordData = {
                  content: word,
                  tokensUsed: 0
                };
                const wordLine = `data: ${JSON.stringify(wordData)}\n\n`;
                controller.enqueue(new TextEncoder().encode(wordLine));

                // Small delay for natural streaming effect
                await new Promise(resolve => setTimeout(resolve, 50));
              }

              // PHASE 4.5: Add reasoning transparency if available and user preference enabled
              if (reasoningMetadata && userPreferences?.showReasoningTransparency) {
                console.log('🧠 Streaming reasoning transparency (user preference enabled)');

                const reasoningText = formatReasoningForStream(reasoningMetadata, userPreferences.reasoningDetailLevel);
                if (reasoningText) {
                  // Add a small pause before reasoning
                  await new Promise(resolve => setTimeout(resolve, 200));

                  const reasoningWords = reasoningText.split(' ');
                  for (let i = 0; i < reasoningWords.length; i++) {
                    const word = reasoningWords[i] + (i < reasoningWords.length - 1 ? ' ' : '');
                    const wordData = {
                      content: word,
                      tokensUsed: 0
                    };
                    const wordLine = `data: ${JSON.stringify(wordData)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(wordLine));

                    // Faster streaming for reasoning metadata
                    await new Promise(resolve => setTimeout(resolve, 30));
                  }
                }
              } else if (reasoningMetadata && !userPreferences?.showReasoningTransparency) {
                console.log('🧠 Reasoning metadata available but user preference disabled');
              }
            } else {
              // Fallback if no response
              const fallbackData = {
                content: "I'm having trouble processing your request right now. Let me try a different approach.",
                tokensUsed: 0
              };
              const fallbackLine = `data: ${JSON.stringify(fallbackData)}\n\n`;
              controller.enqueue(new TextEncoder().encode(fallbackLine));
            }

            // PHASE 5: Send completion signal
            const doneLine = `data: [DONE]\n\n`;
            controller.enqueue(new TextEncoder().encode(doneLine));
            controller.close();

            console.log('🎉 Hidden Sequential Streaming completed successfully');

          } catch (error) {
            console.error('❌ Error in Hidden Sequential Streaming:', error);

            // Stop loading bubbles on error
            const stopLoadingData = {
              content: '',
              isLoading: false
            };
            const stopLoadingLine = `data: ${JSON.stringify(stopLoadingData)}\n\n`;
            controller.enqueue(new TextEncoder().encode(stopLoadingLine));

            // Send error message
            const errorData = {
              content: "I encountered an issue processing your request. Please try again.",
              tokensUsed: 0
            };
            const errorLine = `data: ${JSON.stringify(errorData)}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorLine));

            const doneLine = `data: [DONE]\n\n`;
            controller.enqueue(new TextEncoder().encode(doneLine));
            controller.close();
          }
        }
      });
    }

    // 🎯 INTENT DETERMINATION: Use pre-routing results or fallback to AI detection
    let intentResult;

    if (preRouting.route && preRouting.confidence > 0.8) {
      // Use pre-routing results - no AI needed
      if (preRouting.route === 'DECK_CODE_ANALYSIS') {
        // Deck codes get routed to conversational presentation
        intentResult = {
          intentType: 'GENERAL_CHAT',
          confidence: 1.0,
          source: 'pre-routing-deck-analysis',
          description: 'Auto-processed deck code for conversational presentation'
        };
        console.log(`🎯 PRE-ROUTING INTENT: GENERAL_CHAT (deck analysis) - confidence: 1.0`);
      } else {
        // Map pre-routing to intent types
        const routeToIntent: Record<string, string> = {
          'DECK_OPERATIONS': 'GENERAL_CHAT', // Manual decode/encode requests
          'CARD_SEARCH': 'CARD_SEARCH',
          'DECK_BUILDING': 'DECK_BUILDING',
          'INQUIRY': 'GENERAL_CHAT',          // Vague requests → conversational parameter gathering
          'GREETING': 'GREETING',
          'QUESTION': 'QUESTION'
        };

        intentResult = {
          intentType: routeToIntent[preRouting.route] || 'GENERAL_CHAT',
          confidence: preRouting.confidence,
          source: 'pre-routing',
          description: preRouting.description
        };
        console.log(`🎯 PRE-ROUTING INTENT: ${intentResult.intentType} (confidence: ${intentResult.confidence})`);
      }
    } else {
      // Fallback to AI intent detection for ambiguous cases
      console.log('🧠 No pre-routing match - using AI intent detection...');
      const { handleDetectUserIntent } = await import('@/lib/grok/functions');

      try {
        intentResult = await handleDetectUserIntent({
          userMessage: processedMessage, // Use processed message for better context
          conversationContext: formattedHistory.map((msg: any) => msg.content)
        });
        (intentResult as any).source = 'ai-detection';
        console.log(`🧠 AI INTENT DETECTED: ${intentResult.intentType} (confidence: ${intentResult.confidence})`);
      } catch (error) {
        console.error('❌ Intent detection failed, defaulting to GENERAL_CHAT:', error);
        intentResult = {
          intentType: 'GENERAL_CHAT',
          confidence: 0.5,
          source: 'fallback',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Step 2: Choose streaming method based on intent
    let streamResponse: ReadableStream<Uint8Array>;

    if (intentResult.intentType === 'CARD_SEARCH' || intentResult.intentType === 'DECK_BUILDING') {
      console.log('🎯 USING HIDDEN SEQUENTIAL STREAMING: Structured intent detected');
      streamResponse = createHiddenSequentialStream(
        processedMessage,
        formattedHistory,
        grokService,
        intentResult,
        req
      );
    } else {
      console.log(`🎯 USING NORMAL STREAMING: Trivial intent '${intentResult.intentType}' detected`);
      streamResponse = createNormalStream(
        processedMessage,
        formattedHistory,
        grokService,
        intentResult,
        req
      );
    }

    logger.info('FUNCTION_COMPLETED', {
      requestId,
      function: 'createStreamingResponse',
      success: true
    });

    // Create a transform stream to convert Grok streaming to ChatBox format with function calling support
    let buffer = '';
    const toolCallsBuffer: Array<{ id: string; type?: string; function: { name: string; arguments: string } }> = [];
    let isCollectingToolCalls = false;
    let functionsExecuted = false;

    // Store function results to send back to Grok
    const functionResults: Array<{ tool_call_id: string; result: unknown }> = [];

    // CRITICAL FIX: JSON boundary detection helpers to prevent position 353 error
    const isCompleteJSON = (jsonString: string): boolean => {
      if (!jsonString || jsonString.trim().length === 0) return false;
      try {
        JSON.parse(jsonString.trim());
        return true;
      } catch {
        return false;
      }
    };

    const hasMultipleJSONObjects = (jsonString: string): boolean => {
      if (!jsonString) return false;
      const trimmed = jsonString.trim();

      try {
        // Try to parse the entire string
        JSON.parse(trimmed);
        return false; // Single valid JSON
      } catch (error) {
        // Check if error indicates multiple objects (position 353 pattern)
        if (error instanceof Error && error.message.includes('Unexpected non-whitespace character after JSON')) {
          return true;
        }
        return false; // Other parsing error
      }
    };

    const extractFirstCompleteJSON = (jsonString: string): string | null => {
      if (!jsonString) return null;

      let braceCount = 0;
      let inString = false;
      let escaped = false;

      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\' && inString) {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;

            // Found complete JSON object
            if (braceCount === 0) {
              const firstJSON = jsonString.substring(0, i + 1);
              // Validate it's actually valid JSON
              try {
                JSON.parse(firstJSON);
                return firstJSON;
              } catch {
                continue; // Keep looking
              }
            }
          }
        }
      }

      return null; // No complete JSON found
    };

    // MISSING COMPONENT A: Function Call Parsing and Recovery
    const parseConcatenatedFunctionNames = (functionName: string): string[] => {
      const knownFunctions = [
        'detectUserIntent', 'exploreCardsAST', 'exploreCardsNatural',
        'decodeDeck', 'buildDeck', 'encodeDeck', 'fetchCardMetadata'
      ];

      // If it's already a known function, return as-is
      if (knownFunctions.includes(functionName)) {
        return [functionName];
      }

      // Try to parse concatenated function names
      const parsedFunctions: string[] = [];
      let remainingName = functionName;

      // Sort by length (longest first) to avoid partial matches
      const sortedFunctions = [...knownFunctions].sort((a, b) => b.length - a.length);

      while (remainingName.length > 0) {
        let foundMatch = false;

        for (const knownFunc of sortedFunctions) {
          if (remainingName.startsWith(knownFunc)) {
            parsedFunctions.push(knownFunc);
            remainingName = remainingName.substring(knownFunc.length);
            foundMatch = true;
            break;
          }
        }

        if (!foundMatch) {
          // If we can't parse the remaining part, log it and break
          console.warn(`🚨 Unable to parse remaining function name: "${remainingName}" from original: "${functionName}"`);
          break;
        }
      }

      return parsedFunctions.length > 0 ? parsedFunctions : [functionName];
    };

    // MISSING COMPONENT B: Error Classification System
    interface ClassifiedError {
      type: 'TECHNICAL' | 'USER' | 'SYSTEM';
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      userVisible: boolean;
      userMessage?: string;
      technicalDetails: string;
    }

    const classifyError = (error: string, functionName: string): ClassifiedError => {
      // Technical errors that should never be shown to users
      const technicalPatterns = [
        /Unknown function:/,
        /Function execution failed:/,
        /Function argument parsing failed:/,
        /AST compilation failed:/,
        /Database connection/,
        /Lambda API/,
        /JSON parsing/,
        /Network error/,
        /Circuit breaker/
      ];

      const isTechnical = technicalPatterns.some(pattern => pattern.test(error));

      if (isTechnical) {
        return {
          type: 'TECHNICAL',
          severity: 'HIGH',
          userVisible: false,
          userMessage: generateUserFriendlyError(error, functionName),
          technicalDetails: error
        };
      }

      // User errors (invalid input, missing parameters, etc.)
      const userPatterns = [
        /required/i,
        /invalid/i,
        /missing/i,
        /not found/i
      ];

      const isUserError = userPatterns.some(pattern => pattern.test(error));

      if (isUserError) {
        return {
          type: 'USER',
          severity: 'MEDIUM',
          userVisible: true,
          userMessage: error,
          technicalDetails: error
        };
      }

      // Default to system error with user-friendly message
      return {
        type: 'SYSTEM',
        severity: 'MEDIUM',
        userVisible: true,
        userMessage: generateUserFriendlyError(error, functionName),
        technicalDetails: error
      };
    };

    // MISSING COMPONENT D: User-Friendly Error Conversion
    const generateUserFriendlyError = (technicalError: string, functionName: string): string => {
      // Context-aware error messages based on function type
      if (functionName === 'detectUserIntent') {
        return ''; // Always suppress intent detection errors
      }

      if (functionName.includes('exploreCards') || functionName.includes('AST')) {
        return "I'm having trouble searching for cards right now. Let me try a different approach to help you find what you're looking for.";
      }

      if (functionName.includes('Deck')) {
        return "I encountered an issue processing that deck. Could you try rephrasing your request or providing the deck information in a different format?";
      }

      if (technicalError.includes('Unknown function')) {
        return "I'm having some technical difficulties processing your request. Let me try to help you in a different way.";
      }

      // Generic fallback
      return "I encountered a small hiccup while processing your request. Let me try to assist you differently.";
    };

    // Helper function to execute functions and stream results directly (no double-streaming)
    const executeFunctionsAndStream = async (
      controller: TransformStreamDefaultController<Uint8Array>,
      toolCalls: Array<{ id: string; type?: string; function: { name: string; arguments: string } }>
    ) => {
      try {
        console.log('🔧 Executing functions directly and streaming results...');

        // Import function handlers
        const {
          handleDecodeDeck,
          handleBuildDeck,
          handleEncodeDeck,
          handleFetchCardMetadata,
          handleDetectUserIntent,
          handleExploreCardsAST,
          handleExploreCardsNatural
        } = await import('@/lib/grok/functions');

        // Execute each function and stream results immediately
        for (const toolCall of toolCalls) {
          try {
            const originalFunctionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            // COMPONENT A: Parse concatenated function names
            const parsedFunctionNames = parseConcatenatedFunctionNames(originalFunctionName);

            if (parsedFunctionNames.length > 1) {
              console.log(`🔧 Parsed concatenated function name "${originalFunctionName}" into: [${parsedFunctionNames.join(', ')}]`);
            }

            // Execute each parsed function
            for (const functionName of parsedFunctionNames) {
              console.log(`🔧 Executing function: ${functionName}`);

              let result: any;

              // Execute the appropriate function with enhanced error handling
              switch (functionName) {
                case 'decodeDeck':
                  result = await handleDecodeDeck(functionArgs);
                  break;
                case 'buildDeck':
                  result = await handleBuildDeck(functionArgs);
                  break;
                case 'encodeDeck':
                  result = await handleEncodeDeck(functionArgs);
                  break;
                case 'fetchCardMetadata':
                  result = await handleFetchCardMetadata(functionArgs);
                  break;
                case 'detectUserIntent':
                  result = await handleDetectUserIntent(functionArgs);
                  break;
                case 'exploreCardsAST':
                  result = await handleExploreCardsAST(functionArgs);
                  break;
                case 'exploreCardsNatural':
                  result = await handleExploreCardsNatural(functionArgs);
                  break;
                default:
                  // COMPONENT B: Classify the error instead of directly returning it
                  const unknownFunctionError = `Unknown function: ${functionName}`;
                  const classifiedError = classifyError(unknownFunctionError, functionName);

                  result = {
                    success: false,
                    error: classifiedError.technicalDetails,
                    userVisible: classifiedError.userVisible,
                    userMessage: classifiedError.userMessage
                  };

                  console.warn(`🚨 Unknown function "${functionName}" (original: "${originalFunctionName}") - classified as ${classifiedError.type}`);
              }

              // Stream the function result immediately with error classification
              await streamFunctionResult(controller, functionName, result);
            }

          } catch (error) {
            console.error(`❌ Error executing function ${toolCall.function.name}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const technicalError = `Function execution failed: ${errorMessage}`;

            // COMPONENT B: Classify execution errors
            const classifiedError = classifyError(technicalError, toolCall.function.name);

            await streamFunctionResult(controller, toolCall.function.name, {
              success: false,
              error: classifiedError.technicalDetails,
              userVisible: classifiedError.userVisible,
              userMessage: classifiedError.userMessage
            });
          }
        }

        // Send completion signal
        const doneLine = `data: [DONE]\n\n`;
        controller.enqueue(new TextEncoder().encode(doneLine));

      } catch (error) {
        console.error('❌ Error in executeFunctionsAndStream:', error);

        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorData = {
          content: `\nError executing functions: ${errorMessage}\n`,
          tokensUsed: 0
        };
        const errorLine = `data: ${JSON.stringify(errorData)}\n\n`;
        controller.enqueue(new TextEncoder().encode(errorLine));

        const doneLine = `data: [DONE]\n\n`;
        controller.enqueue(new TextEncoder().encode(doneLine));
      }
    };

    // MISSING COMPONENT C: Content Filtering for Streaming
    const validateStreamContent = (content: string, functionName: string): {
      isUserAppropriate: boolean;
      replacementContent?: string;
      contentType: 'AI_RESPONSE' | 'FUNCTION_RESULT' | 'ERROR' | 'SYSTEM';
    } => {
      // Technical error patterns that should never reach users
      const technicalErrorPatterns = [
        /❌\s*\*\*\w+\s*Error:\*\*/,           // Function error format
        /Function execution failed:/,          // Generic function error
        /Unknown function:/,                   // Router error
        /AST compilation failed:/,             // Query compilation error
        /Database connection/,                 // Database errors
        /Lambda API/,                          // API errors
        /Circuit breaker/,                     // Network errors
        /JSON parsing/,                        // Parsing errors
        /Function argument parsing failed:/    // Argument errors
      ];

      const isTechnicalError = technicalErrorPatterns.some(pattern => pattern.test(content));

      if (isTechnicalError) {
        return {
          isUserAppropriate: false,
          replacementContent: generateUserFriendlyError(content, functionName),
          contentType: 'ERROR'
        };
      }

      // Check for function result content
      if (content.includes('**🎴 Deck Analysis:**') || content.includes('**📊 Card Results:**')) {
        return {
          isUserAppropriate: true,
          contentType: 'FUNCTION_RESULT'
        };
      }

      // Default to appropriate content
      return {
        isUserAppropriate: true,
        contentType: 'AI_RESPONSE'
      };
    };

    // Helper function to stream individual function results
    const streamFunctionResult = async (
      controller: TransformStreamDefaultController<Uint8Array>,
      functionName: string,
      result: any
    ) => {
      let formattedResult = '';

      if (functionName === 'decodeDeck' && result.success) {
        // Format deck decode results nicely
        formattedResult = `\n### ✅ Deck Decoded Successfully!\n\n`;
        formattedResult += `**Hero**: ${result.hero}\n`;
        formattedResult += `**Format**: ${result.format}\n`;
        formattedResult += `**Total Cards**: ${result.cardCount}\n\n`;
        formattedResult += `**Deck List**:\n`;

        if (result.cards && Array.isArray(result.cards)) {
          result.cards.forEach((card: any) => {
            const manaText = card.manaCost !== null ? ` (${card.manaCost} Mana` : ' (';
            const statsText = card.attack !== null && card.health !== null ? `, ${card.attack}/${card.health}` : '';
            const typeText = card.type ? `, ${card.type}` : '';
            const classText = card.class && card.class !== 'Neutral' ? `, ${card.class}` : card.class === 'Neutral' ? ', Neutral' : '';
            const closingText = manaText !== ' (' ? ')' : '';

            formattedResult += `- ${card.count}x **${card.name}**${manaText}${statsText}${typeText}${classText}${closingText}`;
            if (card.text && card.text.trim()) {
              formattedResult += ` - ${card.text}`;
            }
            formattedResult += '\n';
          });
        }

        // Add note about unknown cards if any exist
        const unknownCards = result.cards?.filter((card: any) => card.name.startsWith('Unknown Card')) || [];
        if (unknownCards.length > 0) {
          formattedResult += `\n**Note**: ${unknownCards.length} cards are showing as "Unknown Card" - this may indicate missing data in the database for these specific card IDs.\n`;
        }

      } else if (functionName === 'encodeDeck' && result.success) {
        // Format deck encode results nicely
        formattedResult = `\n### ✅ Deck Encoded Successfully!\n\n`;
        formattedResult += `**Deck Code**: \`${result.deckCode}\`\n\n`;

        if (result.formattedDeck) {
          formattedResult += `**Formatted Deck**:\n`;
          formattedResult += `\`\`\`\n${result.formattedDeck}\n\`\`\`\n`;
        }

      } else if (functionName === 'buildDeck' && result.success) {
        // Format deck build results nicely
        formattedResult = `\n### ✅ Deck Built Successfully!\n\n`;
        formattedResult += `**Deck Code**: \`${result.deckCode}\`\n\n`;

        if (result.formattedDeck) {
          formattedResult += `**Formatted Deck**:\n`;
          formattedResult += `\`\`\`\n${result.formattedDeck}\n\`\`\`\n`;
        }

      } else if (functionName === 'exploreCardsAST' && result.success) {
        // Format card search results nicely
        formattedResult = `\n### ✅ Card Search Results\n\n`;

        if (result.data && Array.isArray(result.data)) {
          formattedResult += `**Found ${result.data.length} cards:**\n\n`;

          result.data.forEach((card: any) => {
            const manaText = card.mana_cost !== null ? ` (${card.mana_cost} Mana` : ' (';
            const statsText = card.attack !== null && card.health !== null ? `, ${card.attack}/${card.health}` : '';
            const typeText = card.card_type ? `, ${card.card_type}` : '';
            const classText = card.class_name && card.class_name !== 'Neutral' ? `, ${card.class_name}` : card.class_name === 'Neutral' ? ', Neutral' : '';
            const rarityText = card.rarity ? `, ${card.rarity}` : '';
            const closingText = manaText !== ' (' ? ')' : '';

            formattedResult += `- **${card.name}**${manaText}${statsText}${typeText}${classText}${rarityText}${closingText}`;
            if (card.text && card.text.trim()) {
              formattedResult += ` - ${card.text}`;
            }
            formattedResult += '\n';
          });
        } else {
          formattedResult += `No cards found matching your criteria.\n`;
        }

      } else if (functionName === 'exploreCardsNatural' && result.success) {
        // Format natural language card search results nicely
        formattedResult = `\n### ✅ Card Search Results\n\n`;

        if (result.data && Array.isArray(result.data)) {
          formattedResult += `**Found ${result.data.length} cards:**\n\n`;

          result.data.forEach((card: any) => {
            const manaText = card.mana_cost !== null ? ` (${card.mana_cost} Mana` : ' (';
            const statsText = card.attack !== null && card.health !== null ? `, ${card.attack}/${card.health}` : '';
            const typeText = card.card_type ? `, ${card.card_type}` : '';
            const classText = card.class_name && card.class_name !== 'Neutral' ? `, ${card.class_name}` : card.class_name === 'Neutral' ? ', Neutral' : '';
            const rarityText = card.rarity ? `, ${card.rarity}` : '';
            const closingText = manaText !== ' (' ? ')' : '';

            formattedResult += `- **${card.name}**${manaText}${statsText}${typeText}${classText}${rarityText}${closingText}`;
            if (card.text && card.text.trim()) {
              formattedResult += ` - ${card.text}`;
            }
            formattedResult += '\n';
          });
        } else {
          formattedResult += `No cards found matching your criteria.\n`;
        }

      } else if (functionName === 'fetchCardMetadata' && result.success) {
        // Format card metadata results nicely
        formattedResult = `\n### ✅ Card Details\n\n`;

        if (result.data && Array.isArray(result.data)) {
          result.data.forEach((card: any) => {
            formattedResult += `**${card.name}**\n`;
            formattedResult += `- **Mana Cost**: ${card.mana_cost}\n`;
            if (card.attack !== null && card.health !== null) {
              formattedResult += `- **Stats**: ${card.attack}/${card.health}\n`;
            }
            if (card.card_type) {
              formattedResult += `- **Type**: ${card.card_type}\n`;
            }
            if (card.class_name) {
              formattedResult += `- **Class**: ${card.class_name}\n`;
            }
            if (card.rarity) {
              formattedResult += `- **Rarity**: ${card.rarity}\n`;
            }
            if (card.text && card.text.trim()) {
              formattedResult += `- **Text**: ${card.text}\n`;
            }
            formattedResult += '\n';
          });
        }

      } else if (result.success && result.data) {
        // Handle other successful function results (fallback to JSON for unknown functions)
        formattedResult = `\n✅ **${functionName} completed successfully**\n\n`;
        if (typeof result.data === 'object' && result.data !== null) {
          // Try to format object data nicely instead of raw JSON
          if (Array.isArray(result.data)) {
            formattedResult += `**Results**: ${result.data.length} items found\n`;
          } else {
            formattedResult += `**Result**: Operation completed\n`;
          }
        } else {
          formattedResult += `**Result**: ${result.data}\n`;
        }
      } else if (functionName === 'detectUserIntent') {
        // Special handling for detectUserIntent - don't show ANY results to user (success OR failure)
        // This function runs silently in the background for intent detection
        formattedResult = ''; // Don't display anything for intent detection (success or failure)
      } else if (!result.success) {
        // COMPONENT B & D: Enhanced error handling with classification
        const errorMessage = result.error || 'Function execution failed';

        // Check if result has user visibility information from classification
        if (result.userVisible === false) {
          // Use the user-friendly message from classification
          formattedResult = result.userMessage || '';
        } else if (result.userMessage) {
          // Use the provided user message
          formattedResult = result.userMessage;
        } else {
          // Fallback to classified error message
          const classifiedError = classifyError(errorMessage, functionName);
          formattedResult = classifiedError.userMessage || '';
        }

        // Log technical details for debugging while showing user-friendly message
        if (formattedResult !== errorMessage) {
          console.log(`🔍 Technical error (${functionName}): ${errorMessage}`);
          console.log(`👤 User message: ${formattedResult || '(suppressed)'}`);
        }
      }

      // COMPONENT C: Validate content before streaming
      if (formattedResult.trim()) {
        const contentValidation = validateStreamContent(formattedResult, functionName);

        if (!contentValidation.isUserAppropriate) {
          // Replace with user-friendly content
          formattedResult = contentValidation.replacementContent || '';
          console.log(`🛡️ Filtered inappropriate content for ${functionName}, replaced with user-friendly message`);
        }
      }

      // Stream the formatted result word by word for smooth UX (only if content exists)
      if (formattedResult.trim()) {
        const words = formattedResult.split(' ');
        for (let i = 0; i < words.length; i++) {
          const word = words[i] + (i < words.length - 1 ? ' ' : '');
          const wordData = { content: word, tokensUsed: 0 };
          const wordLine = `data: ${JSON.stringify(wordData)}\n\n`;
          controller.enqueue(new TextEncoder().encode(wordLine));
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }
    };

    // Note: Function execution logic moved to sendFunctionResultsToGrok

    const transformStream = new TransformStream({
      start() {
        logger.info('RESPONSE_SENT', {
          requestId,
          responseType: 'streaming',
          functionCallingEnabled: true
        });
      },
      async transform(chunk, controller) {
        try {
          const decoder = new TextDecoder();
          const text = decoder.decode(chunk);

          // Add to buffer to handle split chunks
          buffer += text;

          // Process complete lines only
          const lines = buffer.split('\n');

          // Keep the last potentially incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6).trim();

              if (data === '[DONE]') {
                // Add deck code info before final DONE if we have it
                if (deckCodeInfo) {
                  const deckCodeData = {
                    content: `\n\n**🎴 Deck Analysis:**\n${deckCodeInfo}`,
                    tokensUsed: 0
                  };
                  const deckCodeLine = `data: ${JSON.stringify(deckCodeData)}\n\n`;
                  controller.enqueue(new TextEncoder().encode(deckCodeLine));
                }
                const doneLine = `data: [DONE]\n\n`;
                controller.enqueue(new TextEncoder().encode(doneLine));
              } else if (data && data !== '') {
                try {
                  // Parse the Grok streaming chunk
                  const grokChunk = JSON.parse(data);

                  // Extract content from Grok's streaming format
                  if (grokChunk.choices && grokChunk.choices[0] && grokChunk.choices[0].delta) {
                    const delta = grokChunk.choices[0].delta;

                    // Handle tool calls
                    if (delta.tool_calls) {
                      console.log('🔧 Tool calls detected in stream:', delta.tool_calls);
                      isCollectingToolCalls = true;

                      // Collect tool calls (they may come in multiple chunks)
                      for (const toolCall of delta.tool_calls) {
                        const index = toolCall.index || 0;

                        // Initialize tool call if not exists
                        if (!toolCallsBuffer[index]) {
                          toolCallsBuffer[index] = {
                            id: toolCall.id,
                            type: toolCall.type || 'function',
                            function: {
                              name: '',
                              arguments: ''
                            }
                          };
                        }

                        // Accumulate function name and arguments with JSON boundary detection
                        if (toolCall.function) {
                          if (toolCall.function.name) {
                            toolCallsBuffer[index].function.name += toolCall.function.name;
                          }
                          if (toolCall.function.arguments) {
                            // CRITICAL FIX: Detect JSON boundaries to prevent concatenation corruption
                            const currentArgs = toolCallsBuffer[index].function.arguments;
                            const newChunk = toolCall.function.arguments;

                            // Check if current arguments already form complete JSON
                            if (currentArgs && isCompleteJSON(currentArgs)) {
                              console.warn(`🚨 JSON Boundary Violation Detected: Complete JSON already exists, ignoring additional chunk: "${newChunk.substring(0, 50)}..."`);
                              // Don't concatenate - this prevents the position 353 error
                              continue;
                            }

                            // Safe concatenation with validation
                            const concatenated = currentArgs + newChunk;

                            // Detect multiple JSON objects (the root cause of position 353 error)
                            if (hasMultipleJSONObjects(concatenated)) {
                              console.warn(`🚨 Multiple JSON Objects Detected: Splitting at boundary to prevent parsing error`);
                              // Take only the first complete JSON object
                              const firstJSON = extractFirstCompleteJSON(concatenated);
                              if (firstJSON) {
                                toolCallsBuffer[index].function.arguments = firstJSON;
                              } else {
                                toolCallsBuffer[index].function.arguments += newChunk;
                              }
                            } else {
                              toolCallsBuffer[index].function.arguments += newChunk;
                            }
                          }
                        }
                      }

                      // Don't stream tool call content to user - we'll execute and show results
                      continue;
                    }

                    // ENHANCED: Check if we have complete tool calls with JSON validation
                    if (isCollectingToolCalls && !delta.tool_calls && toolCallsBuffer.length > 0) {
                      console.log('🔧 Tool calls detected - validating JSON completeness...');

                      // CRITICAL FIX: Validate all tool call arguments are complete JSON before execution
                      let allArgumentsValid = true;
                      for (const toolCall of toolCallsBuffer) {
                        if (toolCall.function && toolCall.function.arguments) {
                          if (!isCompleteJSON(toolCall.function.arguments)) {
                            console.warn(`🚨 Incomplete JSON detected for ${toolCall.function.name}, waiting for more chunks...`);
                            allArgumentsValid = false;
                            break;
                          }
                        }
                      }

                      if (allArgumentsValid) {
                        console.log('✅ All tool call arguments are valid JSON - executing functions directly...');
                        // Execute functions directly and stream results (no double-streaming)
                        await executeFunctionsAndStream(controller, toolCallsBuffer);

                        isCollectingToolCalls = false;
                        // Stop processing this stream since we've handled the function calls
                        return;
                      } else {
                        console.log('⏳ Waiting for complete JSON arguments before execution...');
                        // Continue processing stream to get more chunks
                      }
                    }

                    // Also check for finish_reason indicating tool calls are complete
                    if (isCollectingToolCalls && grokChunk.choices[0].finish_reason === 'tool_calls' && toolCallsBuffer.length > 0) {
                      console.log('🔧 Tool calls complete (finish_reason) - executing functions directly...');

                      // Execute functions directly and stream results (no double-streaming)
                      await executeFunctionsAndStream(controller, toolCallsBuffer);

                      isCollectingToolCalls = false;
                      // Stop processing this stream since we've handled the function calls
                      return;
                    }

                    // Handle regular content
                    if (delta.content) {

                      // Convert to ChatBox expected format - only send incremental content
                      // ChatBox will handle accumulation on its end
                      const chatBoxData = {
                        content: delta.content,
                        tokensUsed: 0
                      };

                      const formattedLine = `data: ${JSON.stringify(chatBoxData)}\n\n`;
                      controller.enqueue(new TextEncoder().encode(formattedLine));
                    }
                  }
                } catch {
                  console.warn('Could not parse Grok chunk, skipping:', data.substring(0, 50) + '...');
                  // Skip malformed chunks
                }
              }
            }
          }
        } catch (error) {
          console.error('Error processing stream chunk:', error);
        }
      },
      flush() {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          logger.debug('RESPONSE_SENT', {
            requestId,
            remainingBuffer: buffer.length,
            phase: 'flush'
          });
        }

        // Log function calling statistics and complete the request
        const duration = timer.end({
          success: true,
          functionCallsExecuted: toolCallsBuffer.length,
          hasRemainingBuffer: !!buffer.trim()
        });

        logger.info('RESPONSE_SENT', {
          requestId,
          completed: true,
          functionCallsExecuted: toolCallsBuffer.length,
          totalDuration: duration,
          phase: 'complete'
        });

        // End request tracking
        SessionManager.endRequest();
      }
    });

    // 🎯 Return appropriate streaming response based on intent
    // Both Hidden Sequential and Normal Streaming are self-contained and return directly
    return new Response(streamResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
      },
    });

  } catch (error: unknown) {
    // End request tracking on error
    SessionManager.endRequest();
    timer.end({ success: false, error: error instanceof Error ? error.message : String(error) });

    return handleApiError(error as Error & { status?: number }, 'POST request processing', requestId);
  }
}
