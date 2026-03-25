import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { updateUserSubscription, UserSubscription } from '@/lib/subscription';
import { calculateSubscriptionPeriod, formatPeriodInfo } from '@/lib/stripe-period-calculator';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Processing successful checkout session:', sessionId);

    const stripe = getStripe();
    
    // Retrieve the checkout session
    console.log('📋 Retrieving checkout session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']  // Only expand subscription, not customer
    });

    console.log('✅ Checkout session retrieved:', {
      id: session.id,
      status: session.status,
      customer: session.customer,
      subscription: session.subscription,
      metadata: session.metadata
    });

    if (session.status !== 'complete') {
      console.log('❌ Session not completed:', session.status);
      return NextResponse.json(
        { error: 'Session not completed' },
        { status: 400 }
      );
    }

    const { userId, planType, isYearly } = session.metadata || {};

    if (!userId || !planType) {
      console.error('❌ Missing metadata in session:', session.metadata);
      return NextResponse.json(
        { error: 'Missing user or plan information' },
        { status: 400 }
      );
    }

    console.log(`🔄 Processing subscription for user ${userId}, plan: ${planType}, yearly: ${isYearly}`);
    console.log('🚨 CUSTOMER ID FIX ACTIVE - CHECKING CUSTOMER TYPE');

    // Note: safeTimestampConversion function removed - now using enhanced period calculation

    // Get the subscription details
    let subscriptionData: Partial<UserSubscription>;

    if (session.subscription && typeof session.subscription === 'object') {
      // Subscription is expanded
      const subscription = session.subscription as unknown as {
        id: string;
        status: string;
        current_period_start: number;
        current_period_end: number;
        cancel_at_period_end: boolean;
      };
      console.log('📊 Subscription details from session:', {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end
      });

      // Debug: Log raw Stripe timestamps before conversion
      console.log('🔍 Raw Stripe timestamps from session subscription:', {
        start: subscription.current_period_start,
        end: subscription.current_period_end,
        startType: typeof subscription.current_period_start,
        endType: typeof subscription.current_period_end
      });

      // Fetch complete subscription data from Stripe API
      console.log('🔍 Fetching complete subscription from Stripe API...');
      const fullSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscription.id);

      console.log('📊 Complete subscription data from Stripe:', {
        id: fullSubscription.id,
        current_period_start: (fullSubscription as any).current_period_start,
        current_period_end: (fullSubscription as any).current_period_end,
        start_date: (fullSubscription as any).start_date,
        created: fullSubscription.created
      });

      // Debug: Log raw Stripe timestamps from complete subscription
      console.log('🔍 Raw Stripe timestamps from complete subscription:', {
        start: (fullSubscription as any).current_period_start,
        end: (fullSubscription as any).current_period_end,
        startType: typeof (fullSubscription as any).current_period_start,
        endType: typeof (fullSubscription as any).current_period_end
      });

      // Log customer data to verify fix
      console.log('🔍 Customer type:', typeof session.customer);
      console.log('🔍 Customer value:', session.customer);

      subscriptionData = {
        stripeCustomerId: typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id || 'unknown',
        stripeSubscriptionId: fullSubscription.id,
        planType: planType as 'standard' | 'premium',
        status: fullSubscription.status as 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing',
        cancelAtPeriodEnd: (fullSubscription as any).cancel_at_period_end,
        isYearly: isYearly === 'true',
        updatedAt: Date.now(),
      };

      // Use enhanced period calculation that handles missing Stripe data
      console.log('🔄 Calculating subscription period with fallback logic...');
      const calculatedPeriod = await calculateSubscriptionPeriod(stripe, fullSubscription);

      console.log('📊 Period calculation result:', formatPeriodInfo(calculatedPeriod));

      // Always set the period data using our calculated values
      subscriptionData.currentPeriodStart = calculatedPeriod.current_period_start * 1000;
      subscriptionData.currentPeriodEnd = calculatedPeriod.current_period_end * 1000;

      // Log the source and confidence for debugging
      console.log(`✅ Period data set from ${calculatedPeriod.source} with ${calculatedPeriod.confidence} confidence`);
    } else {
      // Fallback: retrieve subscription separately
      console.log('🔄 Retrieving subscription separately...');
      const subscriptions = await stripe.subscriptions.list({
        customer: session.customer as string,
        status: 'active',
        limit: 1,
      });

      const activeSubscription = subscriptions.data[0] as unknown as {
        id: string;
        status: string;
        current_period_start: number;
        current_period_end: number;
        cancel_at_period_end: boolean;
      };

      if (!activeSubscription) {
        console.error('❌ No active subscription found for customer:', session.customer);
        return NextResponse.json(
          { error: 'No active subscription found' },
          { status: 404 }
        );
      }

      console.log('📊 Active subscription found:', {
        id: activeSubscription.id,
        status: activeSubscription.status,
        current_period_start: activeSubscription.current_period_start,
        current_period_end: activeSubscription.current_period_end
      });

      // Debug: Log raw Stripe timestamps before conversion
      console.log('🔍 Raw Stripe timestamps from active subscription:', {
        start: activeSubscription.current_period_start,
        end: activeSubscription.current_period_end,
        startType: typeof activeSubscription.current_period_start,
        endType: typeof activeSubscription.current_period_end
      });

      // Log customer data to verify fix (fallback path)
      console.log('🔍 Customer type (fallback):', typeof session.customer);
      console.log('🔍 Customer value (fallback):', session.customer);

      subscriptionData = {
        stripeCustomerId: typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id || 'unknown',
        stripeSubscriptionId: activeSubscription.id,
        planType: planType as 'standard' | 'premium',
        status: activeSubscription.status as 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing',
        cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
        isYearly: isYearly === 'true',
        updatedAt: Date.now(),
      };

      // Use enhanced period calculation for fallback path too
      console.log('🔄 Calculating period for fallback subscription...');
      const fallbackPeriod = await calculateSubscriptionPeriod(stripe, activeSubscription as any);

      console.log('📊 Fallback period calculation:', formatPeriodInfo(fallbackPeriod));

      // Always set the period data using our calculated values
      subscriptionData.currentPeriodStart = fallbackPeriod.current_period_start * 1000;
      subscriptionData.currentPeriodEnd = fallbackPeriod.current_period_end * 1000;

      console.log(`✅ Fallback period data set from ${fallbackPeriod.source} with ${fallbackPeriod.confidence} confidence`);
    }

    console.log('💾 Updating user subscription with data:', subscriptionData);
    console.log('🔍 User ID being updated:', userId);
    console.log('📋 Plan type being set:', subscriptionData.planType);

    // Update user subscription in Firestore
    await updateUserSubscription(userId, subscriptionData);

    console.log('✅ Firestore update completed successfully');

    // Clear subscription status cache to ensure immediate updates
    try {
      const cacheResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/subscription/clear-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      console.log('🗑️ Cache clear response:', cacheResponse.status);
    } catch (cacheError) {
      console.warn('⚠️ Failed to clear cache, but continuing:', cacheError);
    }

    console.log(`🎊 Successfully processed subscription for user ${userId}`);

    return NextResponse.json({
      success: true,
      planType: subscriptionData.planType,
      status: subscriptionData.status,
      synced: true,
      subscriptionData
    });

  } catch (error) {
    console.error('💥 Error processing successful checkout:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        synced: false
      },
      { status: 500 }
    );
  }
}
