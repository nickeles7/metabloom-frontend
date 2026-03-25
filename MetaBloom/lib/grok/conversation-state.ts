/**
 * Conversation State Management for MetaBloom
 * Tracks user preferences and context across multiple turns
 */

import { GrokMessage } from './client';

export interface ConversationContext {
  userId?: string;
  sessionId: string;
  currentTopic?: 'CARD_SEARCH' | 'DECK_BUILDING' | 'GENERAL_CHAT';
  userPreferences: {
    orderingPreference?: 'high_stats' | 'game_impact' | 'meta_dominance' | 'value_efficiency';
    preferredClasses?: string[];
    preferredFormats?: string[];
    clarificationStyle?: 'detailed' | 'options' | 'minimal';
  };
  searchContext: {
    lastSearchTerms?: string[];
    lastAmbiguousTerms?: string[];
    clarificationHistory: Array<{
      question: string;
      userResponse: string;
      timestamp: Date;
      resolved: boolean;
    }>;
  };
  conversationFlow: {
    totalQuestions: number;
    recentClarifications: number;
    userFrustrationLevel: number; // 0-1, higher = more frustrated
    lastInteractionTime: Date;
  };
}

/**
 * Conversation State Manager
 */
export class ConversationStateManager {
  private contexts: Map<string, ConversationContext> = new Map();
  private readonly maxContextAge = 30 * 60 * 1000; // 30 minutes

  /**
   * Get or create conversation context
   */
  getContext(sessionId: string, userId?: string): ConversationContext {
    let context = this.contexts.get(sessionId);
    
    if (!context) {
      context = {
        userId,
        sessionId,
        userPreferences: {},
        searchContext: {
          clarificationHistory: []
        },
        conversationFlow: {
          totalQuestions: 0,
          recentClarifications: 0,
          userFrustrationLevel: 0,
          lastInteractionTime: new Date()
        }
      };
      this.contexts.set(sessionId, context);
    }
    
    // Clean up old contexts
    this.cleanupOldContexts();
    
    return context;
  }

  /**
   * Update user preferences based on their responses
   */
  updateUserPreferences(
    sessionId: string, 
    preferences: Partial<ConversationContext['userPreferences']>
  ): void {
    const context = this.getContext(sessionId);
    context.userPreferences = { ...context.userPreferences, ...preferences };
    context.conversationFlow.lastInteractionTime = new Date();
  }

  /**
   * Track clarification interaction
   */
  trackClarification(
    sessionId: string,
    question: string,
    userResponse: string,
    resolved: boolean = false
  ): void {
    const context = this.getContext(sessionId);
    
    context.searchContext.clarificationHistory.push({
      question,
      userResponse,
      timestamp: new Date(),
      resolved
    });
    
    // Update conversation flow metrics
    context.conversationFlow.totalQuestions++;
    context.conversationFlow.recentClarifications++;
    context.conversationFlow.lastInteractionTime = new Date();
    
    // Estimate user frustration based on response patterns
    this.updateFrustrationLevel(context, userResponse);
  }

  /**
   * Check if user seems frustrated with questions
   */
  shouldAvoidClarification(sessionId: string): boolean {
    const context = this.getContext(sessionId);
    
    // Avoid if user has high frustration or many recent clarifications
    return (
      context.conversationFlow.userFrustrationLevel > 0.7 ||
      context.conversationFlow.recentClarifications >= 3
    );
  }

  /**
   * Get user's preferred ordering strategy
   */
  getPreferredOrdering(sessionId: string): 'high_stats' | 'game_impact' | 'meta_dominance' | 'value_efficiency' | null {
    const context = this.getContext(sessionId);
    return context.userPreferences.orderingPreference || null;
  }

  /**
   * Learn from user's clarification responses
   */
  learnFromResponse(sessionId: string, userResponse: string): {
    orderingPreference?: 'high_stats' | 'game_impact' | 'meta_dominance' | 'value_efficiency';
    confidence: number;
  } {
    const response = userResponse.toLowerCase();
    
    // Pattern matching for ordering preferences
    if (response.includes('stat') || response.includes('attack') || response.includes('health') || response.includes('1')) {
      this.updateUserPreferences(sessionId, { orderingPreference: 'high_stats' });
      return { orderingPreference: 'high_stats', confidence: 0.9 };
    }
    
    if (response.includes('effect') || response.includes('abilit') || response.includes('impact') || response.includes('2')) {
      this.updateUserPreferences(sessionId, { orderingPreference: 'game_impact' });
      return { orderingPreference: 'game_impact', confidence: 0.9 };
    }
    
    if (response.includes('meta') || response.includes('competitive') || response.includes('popular') || response.includes('3')) {
      this.updateUserPreferences(sessionId, { orderingPreference: 'meta_dominance' });
      return { orderingPreference: 'meta_dominance', confidence: 0.9 };
    }
    
    if (response.includes('value') || response.includes('efficient') || response.includes('cost')) {
      this.updateUserPreferences(sessionId, { orderingPreference: 'value_efficiency' });
      return { orderingPreference: 'value_efficiency', confidence: 0.9 };
    }
    
    return { confidence: 0.1 };
  }

  /**
   * Reset recent clarifications (call after successful interaction)
   */
  resetRecentClarifications(sessionId: string): void {
    const context = this.getContext(sessionId);
    context.conversationFlow.recentClarifications = 0;
    context.conversationFlow.userFrustrationLevel = Math.max(0, context.conversationFlow.userFrustrationLevel - 0.2);
  }

  /**
   * Get conversation summary for debugging
   */
  getConversationSummary(sessionId: string): {
    preferences: ConversationContext['userPreferences'];
    metrics: ConversationContext['conversationFlow'];
    recentClarifications: Array<{ question: string; response: string; resolved: boolean }>;
  } {
    const context = this.getContext(sessionId);
    
    return {
      preferences: context.userPreferences,
      metrics: context.conversationFlow,
      recentClarifications: context.searchContext.clarificationHistory
        .slice(-3)
        .map(c => ({
          question: c.question,
          response: c.userResponse,
          resolved: c.resolved
        }))
    };
  }

  /**
   * Private: Update frustration level based on response patterns
   */
  private updateFrustrationLevel(context: ConversationContext, userResponse: string): void {
    const response = userResponse.toLowerCase();
    
    // Signs of frustration
    const frustrationIndicators = [
      'whatever', 'just show me', 'i don\'t care', 'anything', 'sure', 'ok', 'fine',
      'just pick', 'doesn\'t matter', 'idk', 'dunno', 'any'
    ];
    
    const hasFrustrationIndicator = frustrationIndicators.some(indicator => 
      response.includes(indicator)
    );
    
    if (hasFrustrationIndicator) {
      context.conversationFlow.userFrustrationLevel = Math.min(1, context.conversationFlow.userFrustrationLevel + 0.3);
    } else if (response.length > 10) {
      // Detailed response suggests engagement
      context.conversationFlow.userFrustrationLevel = Math.max(0, context.conversationFlow.userFrustrationLevel - 0.1);
    }
  }

  /**
   * Private: Clean up old conversation contexts
   */
  private cleanupOldContexts(): void {
    const now = Date.now();
    
    for (const [sessionId, context] of this.contexts.entries()) {
      if (now - context.conversationFlow.lastInteractionTime.getTime() > this.maxContextAge) {
        this.contexts.delete(sessionId);
      }
    }
  }
}

// Singleton instance
let conversationStateManager: ConversationStateManager | null = null;

export function getConversationStateManager(): ConversationStateManager {
  if (!conversationStateManager) {
    conversationStateManager = new ConversationStateManager();
  }
  return conversationStateManager;
}

/**
 * Generate session ID from request or create new one
 */
export function generateSessionId(request?: any): string {
  // In a real app, you'd extract this from headers, cookies, or user session
  // For now, generate a simple session ID
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
