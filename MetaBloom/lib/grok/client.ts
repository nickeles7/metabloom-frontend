/**
 * Grok API Client for xAI integration
 * Handles communication with Grok via xAI API
 * Optimized logging to reduce terminal verbosity
 */

import { createClientSafeOptimizedGrokLogger, ClientSafeOptimizedConsole } from '../logging/client-optimized-logger';
import { SessionManager } from '../logging/session';

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: 'text'; text: string }>;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

export interface GrokResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GrokStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export class GrokClient {
  private apiKey: string;
  private baseURL: string = 'https://api.x.ai/v1';
  private logger: ReturnType<typeof createClientSafeOptimizedGrokLogger>;
  private sessionId: string;

  constructor(apiKey: string, sessionId?: string) {
    if (!apiKey) {
      throw new Error('Grok API key is required');
    }
    this.apiKey = apiKey;
    this.sessionId = sessionId || SessionManager.generateSessionId();
    this.logger = createClientSafeOptimizedGrokLogger(this.sessionId);
  }

  /**
   * Send a non-streaming chat completion request to Grok
   */
  async createChatCompletion(
    messages: GrokMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: false;
      tools?: Array<any>;
      tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
    } = {}
  ): Promise<GrokResponse> {
    const {
      model = 'grok-3-latest',
      temperature = 0.7,
      maxTokens = 4096,
      stream = false,
      tools,
      tool_choice
    } = options;

    try {
      const payload: any = {
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
          ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id })
        })),
        temperature,
        max_tokens: maxTokens,
        stream
      };

      // Add function calling parameters if provided
      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = tool_choice || 'auto';
      }

      // Use optimized logging instead of direct console.log
      this.logger.logGrokPayload(payload, false);

      const startTime = Date.now();
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        ClientSafeOptimizedConsole.error('Grok API error response:', errorText);
        throw new Error(`Grok API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      // Use optimized logging for response
      this.logger.logGrokResponse(result, executionTime);
      return result;
    } catch (error) {
      ClientSafeOptimizedConsole.error('Grok API request failed:', error);
      throw error;
    }
  }

  /**
   * Send a streaming chat completion request to Grok with optional function calling
   */
  async createStreamingChatCompletion(
    messages: GrokMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      tools?: any[];
      tool_choice?: string;
    } = {}
  ): Promise<ReadableStream<Uint8Array>> {
    const {
      model = 'grok-3-latest',
      temperature = 0.7,
      maxTokens = 4096,
      tools,
      tool_choice
    } = options;

    try {
      const payload: any = {
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
          ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id })
        })),
        temperature,
        max_tokens: maxTokens,
        stream: true
      };

      // Add function calling parameters if provided
      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = tool_choice || 'auto';
      }

      // Use optimized logging for streaming payload
      this.logger.logGrokPayload(payload, true);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        ClientSafeOptimizedConsole.error('Grok streaming API error response:', errorText);
        throw new Error(`Grok API error (${response.status}): ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body received from Grok API');
      }

      return response.body;
    } catch (error) {
      ClientSafeOptimizedConsole.error('Grok streaming API request failed:', error);
      throw error;
    }
  }

  /**
   * Parse streaming response chunks
   */
  parseStreamChunk(chunk: string): GrokStreamChunk | null {
    try {
      // Remove "data: " prefix if present
      const cleanChunk = chunk.replace(/^data: /, '').trim();

      // Skip empty chunks or [DONE] marker
      if (!cleanChunk || cleanChunk === '[DONE]') {
        return null;
      }

      return JSON.parse(cleanChunk) as GrokStreamChunk;
    } catch (error) {
      ClientSafeOptimizedConsole.warn('Failed to parse stream chunk:', chunk, error);
      return null;
    }
  }
}

/**
 * Create a Grok client instance with optional session ID
 */
export function createGrokClient(sessionId?: string): GrokClient {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    throw new Error('XAI_API_KEY environment variable is not set');
  }

  return new GrokClient(apiKey, sessionId);
}
