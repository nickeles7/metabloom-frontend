import { NextRequest, NextResponse } from 'next/server';
import { getStripe, SUBSCRIPTION_PLANS } from '@/lib/stripe';
import {
  getExistingStripeSubscription,
  updateSubscriptionPlan,
  cancelSubscriptionImmediately,
  reactivateSubscription
} from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    const { planType, isYearly, userId } = await request.json();

    if (!planType || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log(`🔄 Processing subscription change for user ${userId} to ${planType} plan (yearly: ${isYearly})`);

    const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Get the appropriate price ID based on billing frequency
    const newPriceId = isYearly ? plan.yearlyPriceId : plan.priceId;

    // Check if user has an existing subscription
    const existingSubscription = await getExistingStripeSubscription(userId);

    if (!existingSubscription) {
      return NextResponse.json(
        { error: 'Failed to check existing subscription' },
        { status: 500 }
      );
    }

    if (existingSubscription.hasSubscription) {
      console.log(`📋 User has existing subscription: ${existingSubscription.subscriptionId}`);
      console.log(`📊 Subscription status: ${existingSubscription.status}, cancel_at_period_end: ${existingSubscription.cancelAtPeriodEnd}`);

      // Check if subscription is canceled but still active (cancel_at_period_end: true)
      if (existingSubscription.status === 'active' && existingSubscription.cancelAtPeriodEnd) {
        console.log('🔄 Found canceled subscription with remaining time - reactivating without price changes');

        // Simply reactivate the subscription - don't change price or plan
        console.log(`🔄 Reactivating existing subscription (keeping current plan: ${existingSubscription.planType})`);
        const reactivateSuccess = await reactivateSubscription(userId);

        if (reactivateSuccess) {
          console.log('✅ Successfully reactivated existing subscription');
          return NextResponse.json({
            success: true,
            action: 'reactivated',
            message: `Your ${existingSubscription.planType} subscription has been reactivated. You will continue to be billed at the end of your current period.`
          });
        } else {
          return NextResponse.json(
            { error: 'Failed to reactivate subscription' },
            { status: 500 }
          );
        }
      }

      // Check if they're trying to "upgrade" to the same plan (for active subscriptions)
      if (existingSubscription.planType === planType && !existingSubscription.cancelAtPeriodEnd) {
        return NextResponse.json(
          { error: `You already have an active ${planType} subscription` },
          { status: 409 }
        );
      }

      // Try to update the existing subscription (for active subscriptions)
      console.log(`🔄 Attempting to update existing subscription to ${planType}`);
      const updateSuccess = await updateSubscriptionPlan(userId, newPriceId, planType as 'standard' | 'premium');

      if (updateSuccess) {
        console.log('✅ Successfully updated existing subscription');
        return NextResponse.json({
          success: true,
          action: 'updated',
          message: `Successfully updated your subscription to ${planType}`
        });
      } else {
        console.log('❌ Failed to update subscription, will cancel and create new one');

        // If update fails, cancel the old subscription
        const cancelSuccess = await cancelSubscriptionImmediately(userId);
        if (!cancelSuccess) {
          return NextResponse.json(
            { error: 'Failed to cancel existing subscription' },
            { status: 500 }
          );
        }

        console.log('✅ Canceled old subscription, proceeding to create new checkout session');
        // Continue to checkout session creation below
      }
    } else {
      console.log('📋 No existing subscription found, creating new checkout session');
    }

    // Create new checkout session only when:
    // 1. No existing subscription found, OR
    // 2. Existing subscription update failed and was canceled
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: newPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/upgrade-plan?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/upgrade-plan?canceled=true`,
      metadata: {
        userId,
        planType,
        isYearly: isYearly.toString(),
      },
      customer_email: undefined, // Will be filled by Stripe Checkout
      allow_promotion_codes: true,
      // If we have an existing customer, use them
      ...(existingSubscription.hasSubscription && existingSubscription.customerId ? {
        customer: existingSubscription.customerId
      } : {}),
    });

    console.log(`✅ Created checkout session: ${session.id}`);

    return NextResponse.json({
      sessionId: session.id,
      action: existingSubscription.hasSubscription ? 'replaced' : 'created',
      message: existingSubscription.hasSubscription
        ? 'Your previous subscription has been canceled. Complete checkout to activate your new plan.'
        : 'Complete checkout to activate your subscription.'
    });

  } catch (error) {
    console.error('💥 Error processing subscription change:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to process subscription change' },
      { status: 500 }
    );
  }
}
