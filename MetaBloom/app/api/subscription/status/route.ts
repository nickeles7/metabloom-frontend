import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, hasActiveSubscription, syncSubscriptionWithStripe } from '@/lib/subscription';
import { subscriptionResponseCache } from '@/lib/cache/subscription-cache';
import { createOptimizedSubscriptionLogger, OptimizedConsole } from '@/lib/logging/optimized-logger';

export async function GET(request: NextRequest) {
  const logger = createOptimizedSubscriptionLogger();
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isDebug = process.env.NODE_ENV === 'development';

    // Use optimized logging instead of direct console.log
    OptimizedConsole.info(`🔍 Fetching subscription status for user: ${userId}`);

    if (!userId) {
      OptimizedConsole.error('❌ No user ID provided');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check response cache first - but allow bypassing cache with force parameter
    const forceRefresh = searchParams.get('force') === 'true';
    const cached = subscriptionResponseCache.get(userId);
    if (!forceRefresh && cached) {
      OptimizedConsole.info('📋 Using cached response data');
      // Log with optimized subscription logger
      logger.logSubscriptionStatus(userId, cached, true);
      return NextResponse.json(cached);
    }

    if (forceRefresh) {
      OptimizedConsole.info('🔄 Force refresh requested, bypassing cache');
    }

    // Get user profile from Firestore
    OptimizedConsole.info('📋 Getting user profile from Firestore...');
    const userProfile = await getUserProfile(userId);

    if (!userProfile) {
      OptimizedConsole.info('👤 No user profile found, returning free plan');
      return NextResponse.json({
        hasActiveSubscription: false,
        currentPlan: 'free',
        subscription: null,
      });
    }

    // Use optimized logging for user profile - only essential fields
    OptimizedConsole.info('✅ User profile found:', {
      userId: userProfile.userId?.substring(0, 8) + '...',
      planType: userProfile.subscription?.planType,
      status: userProfile.subscription?.status,
    });

    // Only sync with Stripe if we have a Stripe subscription ID and it's not a free plan
    let syncedSubscription = null;
    if (userProfile.subscription?.stripeSubscriptionId && userProfile.subscription.planType !== 'free') {
      OptimizedConsole.info('🔄 Syncing with Stripe...');
      const syncStartTime = Date.now();
      syncedSubscription = await syncSubscriptionWithStripe(userId);
      const syncTime = Date.now() - syncStartTime;

      // Use optimized Stripe sync logging
      logger.logStripeSync(userId, syncedSubscription, syncTime);
    } else {
      OptimizedConsole.info('⏭️ Skipping Stripe sync (no subscription ID or free plan)');
    }

    const subscription = syncedSubscription || userProfile.subscription;

    // Check if user has active subscription
    const hasActive = await hasActiveSubscription(userId);

    // Clean up any NaN values from legacy data
    const cleanPeriodEnd = (subscription.currentPeriodEnd && !isNaN(subscription.currentPeriodEnd))
      ? subscription.currentPeriodEnd
      : undefined;
    const cleanPeriodStart = (subscription.currentPeriodStart && !isNaN(subscription.currentPeriodStart))
      ? subscription.currentPeriodStart
      : undefined;

    // Calculate the effective current plan for display purposes
    const getEffectiveCurrentPlan = (): string => {
      // If there's a pending downgrade, show the original plan until the effective date
      if (subscription.pendingDowngrade) {
        const effectiveDate = new Date(subscription.pendingDowngrade.effectiveDate);
        const now = new Date();

        // If the downgrade hasn't taken effect yet, show the original plan
        if (now < effectiveDate) {
          return subscription.pendingDowngrade.fromPlan;
        }
      }

      // If subscription is canceled but still active (cancelAtPeriodEnd),
      // show current plan until period ends
      if (subscription.cancelAtPeriodEnd && cleanPeriodEnd) {
        const periodEndDate = new Date(cleanPeriodEnd);
        const now = new Date();

        // If we're still within the billing period, show current plan
        if (now < periodEndDate) {
          return subscription.planType;
        }
        // If period has ended, user should be on free plan
        return 'free';
      }

      // Default: return the actual plan type
      return subscription.planType;
    };

    const effectiveCurrentPlan = getEffectiveCurrentPlan();

    // Log the effective plan calculation for debugging
    if (effectiveCurrentPlan !== subscription.planType) {
      OptimizedConsole.info(`📊 Effective plan differs from database plan for user ${userId}:`, {
        databasePlan: subscription.planType,
        effectivePlan: effectiveCurrentPlan,
        hasPendingDowngrade: !!subscription.pendingDowngrade,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        periodEnd: cleanPeriodEnd ? new Date(cleanPeriodEnd).toISOString() : null
      });
    }

    const response = {
      hasActiveSubscription: hasActive,
      currentPlan: effectiveCurrentPlan,
      subscription: {
        planType: subscription.planType, // Keep the actual database plan type
        status: subscription.status,
        currentPeriodEnd: cleanPeriodEnd,
        currentPeriodStart: cleanPeriodStart,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        isYearly: subscription.isYearly,
        pendingDowngrade: subscription.pendingDowngrade,
      },
      tokenUsage: userProfile.tokenUsage,
    };

    // Cache the response
    subscriptionResponseCache.set(userId, response);

    // Use optimized subscription logging
    const executionTime = Date.now() - startTime;
    logger.logSubscriptionStatus(userId, response, false);

    OptimizedConsole.info(`🎯 Subscription status request completed in ${executionTime}ms`);

    return NextResponse.json(response);
  } catch (error) {
    OptimizedConsole.error('💥 Error fetching subscription status:', error);
    if (error instanceof Error && process.env.NODE_ENV === 'development') {
      OptimizedConsole.error('Error message:', error.message);
      OptimizedConsole.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, planType } = await request.json();

    if (!userId || !planType) {
      return NextResponse.json(
        { error: 'User ID and plan type are required' },
        { status: 400 }
      );
    }

    // Check if user already has this plan
    const hasActivePlan = await hasActiveSubscription(userId, planType);

    if (hasActivePlan) {
      return NextResponse.json(
        {
          canSubscribe: false,
          error: `You already have an active ${planType} subscription`
        },
        { status: 409 }
      );
    }

    // Check if user has any active subscription
    const hasAnyActive = await hasActiveSubscription(userId);

    return NextResponse.json({
      canSubscribe: true,
      hasExistingSubscription: hasAnyActive,
      message: hasAnyActive
        ? 'You have an existing subscription. Proceeding will upgrade/downgrade your plan.'
        : 'You can subscribe to this plan.',
    });
  } catch (error) {
    console.error('Error checking subscription eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription eligibility' },
      { status: 500 }
    );
  }
}
