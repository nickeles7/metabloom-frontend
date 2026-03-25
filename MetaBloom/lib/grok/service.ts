/**
 * Grok Service Layer
 * Handles business logic for Grok AI interactions
 * Optimized logging to reduce terminal verbosity
 */

import { createGrokClient, GrokMessage } from './client';
import { createClientSafeOptimizedGrokLogger } from '../logging/client-optimized-logger';
import { SessionManager } from '../logging/session';
import { getOrCreateSystemPrompt } from '../cache/session-cache';
import { getMetaForgeSystemPrompt } from '../prompts/system-prompts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface GrokServiceOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export class GrokService {
  public client; // Made public for function calling access
  private logger: ReturnType<typeof createClientSafeOptimizedGrokLogger>;
  private sessionId: string;

// Route to the correct MetaForge system prompt for legacy compatibility
// Now uses session-based caching to avoid regenerating the massive ~200 line prompt
private get defaultSystemPrompt(): string {
 const prompt = getOrCreateSystemPrompt(this.sessionId, () => {
   return getMetaForgeSystemPrompt();
 }); // End of getOrCreateSystemPrompt factory function
 console.log('🔍 SYSTEM PROMPT BEING USED:', prompt);
 return prompt;
}

  
  constructor(sessionId?: string) {
    this.sessionId = sessionId || SessionManager.generateSessionId();
    this.client = createGrokClient(this.sessionId);
    this.logger = createClientSafeOptimizedGrokLogger(this.sessionId);
  }

  /**
   * Send a simple message to Grok and get a response
   */
  async sendMessage(
    userMessage: string,
    options: GrokServiceOptions = {}
  ): Promise<string> {
    const {
      model = 'grok-3-latest',
      temperature = 0.7,
      maxTokens = 4096,
      systemPrompt = this.defaultSystemPrompt
    } = options;

    try {
      // Validate user message
      if (!userMessage || userMessage.trim().length === 0) {
        throw new Error('User message cannot be empty');
      }

      const messages: GrokMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage.trim() }
      ];

      const response = await this.client.createChatCompletion(messages, {
        model,
        temperature,
        maxTokens,
        stream: false
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response choices received from Grok');
      }

      return response.choices[0].message.content;
    } catch (error) {
      this.logger.logFunctionExecution('sendMessage', { userMessage }, null);
      throw new Error(`Failed to get response from Grok: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send a message with chat history context
   */
  async sendMessageWithHistory(
    userMessage: string,
    chatHistory: ChatMessage[] = [],
    options: GrokServiceOptions = {}
  ): Promise<string> {
    const {
      model = 'grok-3-latest',
      temperature = 0.7,
      maxTokens = 4096,
      systemPrompt = this.defaultSystemPrompt
    } = options;

    try {
      // Build message array with system prompt and history
      const messages: GrokMessage[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Add recent chat history (limit to last 10 messages to avoid token limits)
      const recentHistory = chatHistory.slice(-10);
      for (const msg of recentHistory) {
        // Only add messages with non-empty content
        if (msg.content && msg.content.trim().length > 0) {
          messages.push({
            role: msg.role,
            content: msg.content.trim()
          });
        }
      }

      // Add current user message (ensure it's not empty)
      if (!userMessage || userMessage.trim().length === 0) {
        throw new Error('User message cannot be empty');
      }
      messages.push({ role: 'user', content: userMessage.trim() });

      const response = await this.client.createChatCompletion(messages, {
        model,
        temperature,
        maxTokens,
        stream: false
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response choices received from Grok');
      }

      return response.choices[0].message.content;
    } catch (error) {
      this.logger.logFunctionExecution('sendMessageWithHistory', { userMessage, historyLength: chatHistory.length }, null);
      throw new Error(`Failed to get response from Grok: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a streaming response for real-time chat with optional function calling
   */
  async createStreamingResponse(
    userMessage: string,
    chatHistory: ChatMessage[] = [],
    options: GrokServiceOptions & {
      tools?: any[];
      tool_choice?: string;
    } = {}
  ): Promise<ReadableStream<Uint8Array>> {
    const {
      model = 'grok-3-latest',
      temperature = 0.7,
      maxTokens = 4096,
      systemPrompt = this.defaultSystemPrompt,
      tools,
      tool_choice
    } = options;

    try {
      // Build message array
      const messages: GrokMessage[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Add recent chat history
      const recentHistory = chatHistory.slice(-10);
      for (const msg of recentHistory) {
        if (msg.content && msg.content.trim().length > 0) {
          messages.push({
            role: msg.role,
            content: msg.content.trim()
          });
        }
      }

      // Add current user message
      if (!userMessage || userMessage.trim().length === 0) {
        throw new Error('User message cannot be empty');
      }
      messages.push({ role: 'user', content: userMessage.trim() });

      return await this.client.createStreamingChatCompletion(messages, {
        model,
        temperature,
        maxTokens,
        tools,
        tool_choice
      });
    } catch (error) {
      this.logger.logFunctionExecution('createStreamingResponse', { userMessage, historyLength: chatHistory.length, hasTools: !!tools }, null);
      throw new Error(`Failed to create streaming response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
/**
 * Create a singleton Grok service instance
 */
let grokServiceInstance: GrokService | null = null;

export function getGrokService(sessionId?: string): GrokService {
  if (!grokServiceInstance) {
    grokServiceInstance = new GrokService(sessionId);
  }
  return grokServiceInstance;
}
