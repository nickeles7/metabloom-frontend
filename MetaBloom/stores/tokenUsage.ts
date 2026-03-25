import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TOKEN_LIMITS } from "@/lib/constants/token-limits";

// Token optimization metrics
interface ConversationMetrics {
  currentConversationLength: number;
  optimizationActive: boolean;
  estimatedTokensSaved: number;
  totalOptimizedConversations: number;
}

type TokenUsageState = {
  tokensUsed: number;
  tokenLimit: number;
  resetDate: number;
  purchasedTokens: number;
  lastSyncedUserId: string | null;
  limitExceeded: boolean;
  conversationMetrics: ConversationMetrics;
  incrementTokens: (amount: number, userId?: string) => Promise<void>;
  resetTokens: () => void;
  syncWithFirebase: (userId: string) => Promise<void>;
  updateTokenUsage: (used: number, limit: number, resetDate: number, purchased?: number) => void;
  checkLimitExceeded: (userId?: string) => Promise<boolean>;
  updateConversationMetrics: (messageCount: number, tokensSaved?: number) => void;
  resetConversationMetrics: () => void;
  forceSync: (userId: string) => Promise<void>;
};

export const useTokenUsage = create<TokenUsageState>()(
  persist(
    (set, get) => ({
      tokensUsed: 0,
      tokenLimit: TOKEN_LIMITS.FREE,
      resetDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
      purchasedTokens: 0,
      lastSyncedUserId: null,
      limitExceeded: false,
      conversationMetrics: {
        currentConversationLength: 0,
        optimizationActive: false,
        estimatedTokensSaved: 0,
        totalOptimizedConversations: 0,
      },

      incrementTokens: async (amount: number, userId?: string) => {
        // Update local state immediately
        set((state) => ({ tokensUsed: state.tokensUsed + amount }));

        // If user is authenticated, sync with Firebase
        if (userId) {
          try {
            const response = await fetch('/api/tokens', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId,
                tokensUsed: amount,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success && result.tokenUsage) {
                // Update local state with Firebase data
                set({
                  tokensUsed: result.tokenUsage.used,
                  tokenLimit: result.tokenUsage.limit,
                  resetDate: result.tokenUsage.resetDate,
                  purchasedTokens: result.tokenUsage.purchased || 0,
                  lastSyncedUserId: userId,
                  limitExceeded: result.limitExceeded || false,
                });

                // Log warning if limit exceeded
                if (result.limitExceeded) {
                  console.warn(`⚠️ Token limit exceeded: ${result.tokenUsage.used}/${result.tokenUsage.limit}`);
                }
              }
            } else {
              console.error('Failed to sync tokens with Firebase:', response.statusText);
            }
          } catch (error) {
            console.error('Error syncing tokens with Firebase:', error);
          }
        }
      },

      resetTokens: () => set({ tokensUsed: 0 }),

      syncWithFirebase: async (userId: string) => {
        try {
          const response = await fetch(`/api/tokens?userId=${userId}`);

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.tokenUsage) {
              set({
                tokensUsed: result.tokenUsage.used,
                tokenLimit: result.tokenUsage.limit,
                resetDate: result.tokenUsage.resetDate,
                purchasedTokens: result.tokenUsage.purchased || 0,
                lastSyncedUserId: userId,
                limitExceeded: result.tokenUsage.used > result.tokenUsage.limit,
              });
            }
          }
        } catch (error) {
          console.error('Error syncing with Firebase:', error);
        }
      },

      updateTokenUsage: (used: number, limit: number, resetDate: number, purchased = 0) => {
        set({
          tokensUsed: used,
          tokenLimit: limit,
          resetDate,
          purchasedTokens: purchased,
          limitExceeded: used > limit,
        });
      },

      checkLimitExceeded: async (userId?: string) => {
        // If userId provided, sync with Firebase first to get latest data
        if (userId) {
          try {
            const response = await fetch(`/api/subscription/status?userId=${userId}&force=true`);
            if (response.ok) {
              const result = await response.json();
              if (result.tokenUsage) {
                const tokenUsage = result.tokenUsage;
                set({
                  tokensUsed: tokenUsage.used || 0,
                  tokenLimit: tokenUsage.limit || TOKEN_LIMITS.FREE,
                  resetDate: tokenUsage.resetDate || (Date.now() + (30 * 24 * 60 * 60 * 1000)),
                  purchasedTokens: tokenUsage.purchased || 0,
                  lastSyncedUserId: userId,
                  limitExceeded: (tokenUsage.used || 0) > (tokenUsage.limit || TOKEN_LIMITS.FREE),
                });
                console.log(`🔄 Token limit check synced with latest data: ${tokenUsage.used}/${tokenUsage.limit} (purchased: ${tokenUsage.purchased || 0})`);
              }
            } else {
              console.warn('Failed to sync token data during limit check, using cached data');
            }
          } catch (error) {
            console.error('Error syncing token data during limit check:', error);
            console.warn('Falling back to cached token data for limit check');
          }
        }

        const state = get();

        // Handle edge cases
        if (state.tokenLimit <= 0) {
          console.warn('⚠️ Invalid token limit detected, using default');
          set({ tokenLimit: TOKEN_LIMITS.FREE });
          return state.tokensUsed > TOKEN_LIMITS.FREE;
        }

        if (state.tokensUsed < 0) {
          console.warn('⚠️ Negative token usage detected, resetting to 0');
          set({ tokensUsed: 0 });
          return false;
        }

        const isExceeded = state.tokensUsed >= state.tokenLimit; // Use >= instead of > for stricter checking
        console.log(`🔍 Token limit check: ${state.tokensUsed}/${state.tokenLimit} - Exceeded: ${isExceeded}`);

        // If limit is exceeded, log additional context
        if (isExceeded) {
          console.warn(`🚫 Token limit exceeded! Used: ${state.tokensUsed}, Limit: ${state.tokenLimit}, Purchased: ${state.purchasedTokens}`);
        }

        return isExceeded;
      },

      updateConversationMetrics: (messageCount: number, tokensSaved: number = 0) => {
        set((state) => {
          const wasOptimizationActive = state.conversationMetrics.optimizationActive;
          const isOptimizationActive = messageCount > 8;

          return {
            conversationMetrics: {
              currentConversationLength: messageCount,
              optimizationActive: isOptimizationActive,
              estimatedTokensSaved: state.conversationMetrics.estimatedTokensSaved + tokensSaved,
              totalOptimizedConversations: state.conversationMetrics.totalOptimizedConversations +
                (isOptimizationActive && !wasOptimizationActive ? 1 : 0),
            }
          };
        });
      },

      resetConversationMetrics: () => {
        set((state) => ({
          conversationMetrics: {
            currentConversationLength: 0,
            optimizationActive: false,
            estimatedTokensSaved: 0,
            totalOptimizedConversations: state.conversationMetrics.totalOptimizedConversations, // Keep total count
          }
        }));
      },

      forceSync: async (userId: string) => {
        console.log(`🔄 Force syncing token data for user: ${userId}`);
        try {
          // Try subscription status API first (most comprehensive data)
          const subscriptionResponse = await fetch(`/api/subscription/status?userId=${userId}&force=true`);

          if (subscriptionResponse.ok) {
            const result = await subscriptionResponse.json();
            if (result.tokenUsage) {
              const tokenUsage = result.tokenUsage;
              set({
                tokensUsed: tokenUsage.used || 0,
                tokenLimit: tokenUsage.limit || TOKEN_LIMITS.FREE,
                resetDate: tokenUsage.resetDate || (Date.now() + (30 * 24 * 60 * 60 * 1000)),
                purchasedTokens: tokenUsage.purchased || 0,
                lastSyncedUserId: userId,
                limitExceeded: (tokenUsage.used || 0) > (tokenUsage.limit || TOKEN_LIMITS.FREE),
              });
              console.log(`✅ Force sync completed via subscription API: ${tokenUsage.used}/${tokenUsage.limit} (purchased: ${tokenUsage.purchased || 0})`);
              return;
            }
          }

          // Fallback to token API if subscription API fails
          console.warn('Subscription API failed, falling back to token API');
          const tokenResponse = await fetch(`/api/tokens?userId=${userId}`);

          if (tokenResponse.ok) {
            const result = await tokenResponse.json();
            if (result.success && result.tokenUsage) {
              const tokenUsage = result.tokenUsage;
              set({
                tokensUsed: tokenUsage.used || 0,
                tokenLimit: tokenUsage.limit || TOKEN_LIMITS.FREE,
                resetDate: tokenUsage.resetDate || (Date.now() + (30 * 24 * 60 * 60 * 1000)),
                purchasedTokens: tokenUsage.purchased || 0,
                lastSyncedUserId: userId,
                limitExceeded: (tokenUsage.used || 0) > (tokenUsage.limit || TOKEN_LIMITS.FREE),
              });
              console.log(`✅ Force sync completed via token API: ${tokenUsage.used}/${tokenUsage.limit} (purchased: ${tokenUsage.purchased || 0})`);
              return;
            }
          }

          console.error('Both subscription and token APIs failed during force sync');
        } catch (error) {
          console.error('Error during force sync:', error);
        }
      },
    }),
    {
      name: "token-usage-storage",
    }
  )
);
