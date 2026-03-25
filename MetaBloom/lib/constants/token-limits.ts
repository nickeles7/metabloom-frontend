/**
 * Centralized token limit constants for MetaBloom
 * 
 * This file defines all token-related limits and defaults to ensure
 * consistency across the entire application.
 */

// Default token limits by subscription tier
export const TOKEN_LIMITS = {
  FREE: 2000,        // Free tier users get 2,000 tokens
  STANDARD: 5000,    // Standard subscription users get 5,000 tokens  
  PREMIUM: 10000,    // Premium subscription users get 10,000 tokens
} as const;

// Default token usage structure for new users
export const DEFAULT_TOKEN_USAGE = {
  used: 0,
  limit: TOKEN_LIMITS.FREE,
  resetDate: () => Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
  purchased: 0,
} as const;

// Token purchase configuration
export const TOKEN_PURCHASE = {
  TOKENS_PER_DOLLAR: 5000,    // $1 = 5,000 tokens
  MIN_PURCHASE: 3,            // Minimum $3 purchase
  MAX_PURCHASE: 50,           // Maximum $50 purchase
  TOKENS_PER_MESSAGE: 600,    // Approximate tokens per message for UI display
} as const;

// Helper function to create default token usage object
export function createDefaultTokenUsage() {
  return {
    used: DEFAULT_TOKEN_USAGE.used,
    limit: DEFAULT_TOKEN_USAGE.limit,
    resetDate: DEFAULT_TOKEN_USAGE.resetDate(),
    purchased: DEFAULT_TOKEN_USAGE.purchased,
  };
}

// Helper function to get token limit by plan type
export function getTokenLimitByPlan(planType: 'free' | 'standard' | 'premium'): number {
  switch (planType) {
    case 'free':
      return TOKEN_LIMITS.FREE;
    case 'standard':
      return TOKEN_LIMITS.STANDARD;
    case 'premium':
      return TOKEN_LIMITS.PREMIUM;
    default:
      return TOKEN_LIMITS.FREE;
  }
}

// Helper function to calculate total token limit (subscription + purchased)
export function calculateTotalTokenLimit(planType: 'free' | 'standard' | 'premium', purchasedTokens: number = 0): number {
  return getTokenLimitByPlan(planType) + purchasedTokens;
}
