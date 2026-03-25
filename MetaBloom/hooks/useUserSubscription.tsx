"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/stores/auth';
import { useSubscription } from '@/stores/subscription';

interface SubscriptionData {
  hasActiveSubscription: boolean;
  currentPlan: string;
  subscription: {
    planType: string;
    status: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd?: boolean;
    isYearly?: boolean;
    stripeSubscriptionId?: string;
    canceledAt?: number;
    cancelationEffectiveDate?: number;
    pendingDowngrade?: {
      fromPlan: 'standard' | 'premium';
      toPlan: 'free' | 'standard';
      effectiveDate: number;
      scheduledAt: number;
      reason: 'user_initiated' | 'payment_failed' | 'cancellation';
    };
  } | null;
  tokenUsage?: {
    used: number;
    limit: number;
    resetDate: number;
  };
}

export function useUserSubscription() {
  const { user, isAuthenticated } = useAuth();
  const { setSubscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Prevent duplicate calls within 2 seconds
  const FETCH_COOLDOWN = 2 * 1000; // 2 seconds - reduced for faster updates
  const isDebug = process.env.NODE_ENV === 'development';

  const fetchSubscriptionStatus = useCallback(async (forceRefresh = false) => {
    if (!user || !isAuthenticated) {
      if (isDebug) {
        console.log('🚫 No user or not authenticated, clearing subscription data');
      }
      setSubscriptionData(null);
      return;
    }

    // Prevent duplicate calls within cooldown period (unless force refresh)
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime < FETCH_COOLDOWN) {
      if (isDebug) {
        console.log('⏭️ Skipping fetch - within cooldown period');
      }
      return;
    }

    if (isDebug) {
      console.log(`🔄 Fetching subscription status for user: ${user.uid}${forceRefresh ? ' (force refresh)' : ''}`);
    }
    setLoading(true);
    setError(null);
    setLastFetchTime(now);

    try {
      const url = `/api/subscription/status?userId=${user.uid}${forceRefresh ? '&force=true' : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      const data: SubscriptionData = await response.json();
      if (isDebug) {
        console.log('📊 Received subscription data:', data);
      }

      setSubscriptionData(data);

      // Update global subscription store
      setSubscription({
        hasActiveSubscription: data.hasActiveSubscription,
        subscriptionPlan: data.currentPlan,
        subscriptionStatus: data.subscription?.status || 'inactive',
      });

      if (isDebug) {
        console.log('✅ Updated subscription state:', {
          plan: data.currentPlan,
          hasActive: data.hasActiveSubscription,
          status: data.subscription?.status
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
      console.error('❌ Error fetching subscription status:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, setSubscription, lastFetchTime, isDebug]);

  // Auto-fetch when user changes
  useEffect(() => {
    fetchSubscriptionStatus();
  }, [user, isAuthenticated, fetchSubscriptionStatus]);

  // Refresh subscription data with force option
  const refreshSubscription = (forceRefresh = true) => {
    fetchSubscriptionStatus(forceRefresh);
  };

  // Check if user has specific plan
  const hasPlan = (planType: string): boolean => {
    return !!(subscriptionData?.hasActiveSubscription &&
           subscriptionData?.currentPlan === planType);
  };

  // Check if user has any premium plan
  const hasPremiumAccess = (): boolean => {
    return !!(subscriptionData?.hasActiveSubscription &&
           subscriptionData?.currentPlan !== 'free');
  };

  // Get plan display name
  const getPlanDisplayName = (): string => {
    if (!subscriptionData) return 'Free';

    const plan = subscriptionData.currentPlan;
    switch (plan) {
      case 'standard':
        return 'Standard';
      case 'premium':
        return 'Premium';
      default:
        return 'Free';
    }
  };

  // Check if subscription is ending soon (within 7 days)
  const isEndingSoon = (): boolean => {
    if (!subscriptionData?.subscription?.currentPeriodEnd) return false;

    const endDate = new Date(subscriptionData.subscription.currentPeriodEnd);
    const now = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return daysUntilEnd <= 7 && daysUntilEnd > 0;
  };

  // Get current billing period end date
  const getCurrentPeriodEnd = (): Date | null => {
    if (!subscriptionData?.subscription?.currentPeriodEnd) return null;
    return new Date(subscriptionData.subscription.currentPeriodEnd);
  };

  // Get days until current period ends
  const getDaysUntilPeriodEnd = (): number => {
    const endDate = getCurrentPeriodEnd();
    if (!endDate) return 0;

    const now = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysUntilEnd);
  };

  // Get formatted billing period message
  const getBillingPeriodMessage = (): string | null => {
    const endDate = getCurrentPeriodEnd();
    if (!endDate) return null;

    const daysUntil = getDaysUntilPeriodEnd();
    const planName = getPlanDisplayName();

    if (daysUntil === 0) {
      return `Your ${planName} plan billing period ends today.`;
    } else if (daysUntil === 1) {
      return `Your ${planName} plan billing period ends in 1 day.`;
    } else {
      return `Your ${planName} plan billing period ends in ${daysUntil} days.`;
    }
  };

  // Check if subscription will downgrade (cancelAtPeriodEnd = true)
  const willDowngradeAtPeriodEnd = (): boolean => {
    return !!(subscriptionData?.subscription?.cancelAtPeriodEnd &&
             subscriptionData?.subscription?.currentPeriodEnd);
  };

  // Check if subscription is scheduled for cancellation
  const isCancelationScheduled = (): boolean => {
    return !!(subscriptionData?.subscription?.cancelAtPeriodEnd &&
             subscriptionData?.subscription?.currentPeriodEnd);
  };

  // Get days until cancellation takes effect
  const getDaysUntilCancellation = (): number => {
    if (!isCancelationScheduled() || !subscriptionData?.subscription?.currentPeriodEnd) return 0;

    const endDate = new Date(subscriptionData.subscription.currentPeriodEnd);
    const now = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return Math.max(0, daysUntilEnd);
  };

  // Get cancellation effective date
  const getCancellationDate = (): Date | null => {
    if (!isCancelationScheduled() || !subscriptionData?.subscription?.currentPeriodEnd) return null;
    return new Date(subscriptionData.subscription.currentPeriodEnd);
  };

  // Get target plan after cancellation (always 'free' for downgrades)
  const getTargetPlanAfterCancellation = (): string => {
    return 'free'; // All cancellations lead to free plan
  };

  // Check if there's a pending downgrade
  const hasPendingDowngrade = (): boolean => {
    return !!(subscriptionData?.subscription?.pendingDowngrade);
  };

  // Get pending downgrade information
  const getPendingDowngrade = () => {
    return subscriptionData?.subscription?.pendingDowngrade || null;
  };

  // Get days until downgrade takes effect
  const getDaysUntilDowngrade = (): number => {
    const pendingDowngrade = getPendingDowngrade();
    if (!pendingDowngrade) return 0;

    const effectiveDate = new Date(pendingDowngrade.effectiveDate);
    const now = new Date();
    const daysUntilDowngrade = Math.ceil((effectiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return Math.max(0, daysUntilDowngrade);
  };

  // Get downgrade effective date
  const getDowngradeDate = (): Date | null => {
    const pendingDowngrade = getPendingDowngrade();
    if (!pendingDowngrade) return null;
    return new Date(pendingDowngrade.effectiveDate);
  };

  // Get formatted downgrade message
  const getDowngradeMessage = (): string | null => {
    const pendingDowngrade = getPendingDowngrade();
    if (!pendingDowngrade) return null;

    const daysUntil = getDaysUntilDowngrade();
    const fromPlan = pendingDowngrade.fromPlan.charAt(0).toUpperCase() + pendingDowngrade.fromPlan.slice(1);
    const toPlan = pendingDowngrade.toPlan.charAt(0).toUpperCase() + pendingDowngrade.toPlan.slice(1);

    if (daysUntil === 0) {
      return `Your ${fromPlan} plan downgrades to ${toPlan} today.`;
    } else if (daysUntil === 1) {
      return `Your ${fromPlan} plan will downgrade to ${toPlan} in 1 day.`;
    } else {
      return `Your ${fromPlan} plan will downgrade to ${toPlan} in ${daysUntil} days.`;
    }
  };

  return {
    subscriptionData,
    loading,
    error,
    refreshSubscription,
    hasPlan,
    hasPremiumAccess,
    getPlanDisplayName,
    isEndingSoon,
    isCancelationScheduled,
    getDaysUntilCancellation,
    getCancellationDate,
    getTargetPlanAfterCancellation,
    // Billing period functions
    getCurrentPeriodEnd,
    getDaysUntilPeriodEnd,
    getBillingPeriodMessage,
    willDowngradeAtPeriodEnd,
    // Downgrade tracking functions (legacy)
    hasPendingDowngrade,
    getPendingDowngrade,
    getDaysUntilDowngrade,
    getDowngradeDate,
    getDowngradeMessage,
    // Convenience getters
    currentPlan: subscriptionData?.currentPlan || 'free',
    hasActiveSubscription: subscriptionData?.hasActiveSubscription || false,
    tokenUsage: subscriptionData?.tokenUsage,
  };
}
