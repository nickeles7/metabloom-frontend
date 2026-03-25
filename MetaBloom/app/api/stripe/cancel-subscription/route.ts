import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getUserProfile, updateUserSubscription } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    const { userId, cancelAtPeriodEnd = true } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Canceling subscription for user: ${userId}`);

    // Get user profile to retrieve Stripe subscription ID
    const userProfile = await getUserProfile(userId);

    if (!userProfile || !userProfile.subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found to cancel.' },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const subscriptionId = userProfile.subscription.stripeSubscriptionId;

    console.log(`💳 Canceling Stripe subscription: ${subscriptionId}`);
    console.log(`📅 Cancel at period end: ${cancelAtPeriodEnd}`);

    // Cancel the subscription in Stripe
    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    }) as {
      status: string;
      cancel_at_period_end: boolean;
      current_period_end?: number;
    };

    console.log(`✅ Subscription cancellation updated in Stripe`);
    console.log(`📊 Subscription status: ${canceledSubscription.status}`);
    console.log(`📅 Cancel at period end: ${canceledSubscription.cancel_at_period_end}`);

    if (canceledSubscription.current_period_end) {
      console.log(
        "⏰ Current period ends:",
        new Date(canceledSubscription.current_period_end * 1000).toISOString()
      );
    } else {
      console.log("⏰ No current_period_end returned by Stripe.");
    }

    // Update user subscription in our database
    const subscriptionUpdate = {
      status: canceledSubscription.status as 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing',
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      ...(canceledSubscription.current_period_end && {
        currentPeriodEnd: canceledSubscription.current_period_end * 1000,
      }),
      updatedAt: Date.now(),
    };

    await updateUserSubscription(userId, subscriptionUpdate);

    console.log(`🎊 Successfully processed cancellation for user ${userId}`);

    const message = cancelAtPeriodEnd && canceledSubscription.current_period_end
      ? `Your subscription will be canceled at the end of your current billing period (${new Date(canceledSubscription.current_period_end * 1000).toLocaleDateString()}). You'll continue to have access until then.`
      : cancelAtPeriodEnd
      ? 'Your subscription will be canceled at the end of your current billing period. You\'ll continue to have access until then.'
      : 'Your subscription has been canceled immediately.';

    return NextResponse.json({
      success: true,
      message,
      subscription: {
        status: canceledSubscription.status,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        ...(canceledSubscription.current_period_end && {
          currentPeriodEnd: canceledSubscription.current_period_end * 1000,
        }),
      }
    });

  } catch (error) {
    console.error('❌ Error canceling subscription:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
