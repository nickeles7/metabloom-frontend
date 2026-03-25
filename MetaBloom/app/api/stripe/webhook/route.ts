import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { updateUserSubscription, getUserProfile } from '@/lib/subscription';
import { addReferralEarnings } from '@/lib/affiliate';
import { calculateSubscriptionPeriod, formatPeriodInfo } from '@/lib/stripe-period-calculator';
import { subscriptionResponseCache } from '@/lib/cache/subscription-cache';
import { TOKEN_LIMITS, createDefaultTokenUsage, calculateTotalTokenLimit } from '@/lib/constants/token-limits';
import Stripe from 'stripe';

// This should be set in your environment variables
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    console.log(`🔔 Received webhook event: ${event.type}`);
    console.log(`📋 Event data object type: ${event.data.object.object}`);

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;

      case 'customer.subscription.created':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(updatedSubscription);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(deletedSubscription);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(failedInvoice);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('🎉 Checkout session completed:', session.id);
  console.log('📋 Session metadata:', session.metadata);
  console.log('👤 Customer ID:', session.customer);
  console.log('💰 Payment status:', session.payment_status);
  console.log('🔄 Session mode:', session.mode);

  const { userId, planType, isYearly, type, tokens } = session.metadata || {};

  if (!userId) {
    console.error('❌ Missing userId in session metadata:', session.metadata);
    return;
  }

  // Handle token purchase
  if (type === 'token_purchase') {
    console.log('🪙 Processing token purchase for user:', userId, 'tokens:', tokens);
    await handleTokenPurchase(userId, tokens);
    return;
  }

  // Handle subscription (existing logic)
  if (!planType) {
    console.error('❌ Missing planType in session metadata for subscription:', session.metadata);
    return;
  }

  console.log(`🔄 Processing subscription for user ${userId}, plan: ${planType}, yearly: ${isYearly}`);

  try {
    // Get the subscription from Stripe
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.list({
      customer: session.customer as string,
      status: 'active',
      limit: 1,
    });

    console.log(`📊 Found ${subscription.data.length} active subscriptions`);

    const activeSubscription = subscription.data[0] as unknown as {
      id: string;
      current_period_start: number;
      current_period_end: number;
    };

    if (activeSubscription) {
      console.log('✅ Active subscription found:', activeSubscription.id);

      // Helper function to safely convert Stripe timestamps
      const safeTimestampConversion = (timestamp: number | undefined): number | undefined => {
        if (timestamp === undefined || timestamp === null || isNaN(timestamp)) {
          return undefined;
        }
        return timestamp * 1000;
      };

      // Log webhook customer data to verify fix
      console.log('🔍 Webhook customer type:', typeof session.customer);
      console.log('🔍 Webhook customer value:', session.customer);

      const subscriptionData: any = {
        stripeCustomerId: typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id || 'unknown',
        stripeSubscriptionId: activeSubscription.id,
        planType: planType as 'standard' | 'premium',
        status: 'active' as const,
        cancelAtPeriodEnd: false,
        isYearly: isYearly === 'true',
        updatedAt: Date.now(),
      };

      // Use enhanced period calculation for webhook processing
      console.log('🔄 Webhook: Calculating subscription period...');
      const stripe = getStripe();
      const calculatedPeriod = await calculateSubscriptionPeriod(stripe, activeSubscription as any);

      console.log('📊 Webhook period calculation:', formatPeriodInfo(calculatedPeriod));

      // Always set the period data using our calculated values
      subscriptionData.currentPeriodStart = calculatedPeriod.current_period_start * 1000;
      subscriptionData.currentPeriodEnd = calculatedPeriod.current_period_end * 1000;

      console.log(`✅ Webhook period data set from ${calculatedPeriod.source} with ${calculatedPeriod.confidence} confidence`);

      console.log('💾 Updating user subscription with data:', subscriptionData);

      // Update user subscription in Firestore
      await updateUserSubscription(userId, subscriptionData);

      // Clear subscription status cache to ensure immediate updates
      try {
        subscriptionResponseCache.delete(userId);
        console.log(`🗑️ Cleared subscription cache for user: ${userId}`);
      } catch (cacheError) {
        console.warn('⚠️ Failed to clear cache, but continuing:', cacheError);
      }

      console.log(`🎊 User ${userId} successfully subscribed to ${planType} plan (yearly: ${isYearly})`);

      // Create affiliate data for Premium users
      if (planType === 'premium') {
        try {
          console.log(`🎯 Creating affiliate data for Premium user: ${userId}`);
          const { createAffiliateData } = await import('@/lib/affiliate');
          await createAffiliateData(userId);
          console.log(`✅ Affiliate data created successfully for user ${userId}`);
        } catch (affiliateError) {
          console.error('❌ Error creating affiliate data:', affiliateError);
          // Don't fail the subscription if affiliate creation fails
        }
      }

      // Process referral commission if user was referred
      try {
        const userProfile = await getUserProfile(userId);
        if (userProfile?.referredBy) {
          console.log(`💰 Processing referral commission for referral code: ${userProfile.referredBy}`);

          await addReferralEarnings(
            userProfile.referredBy, // This is the referral code, not user ID
            userId,
            userProfile.email,
            planType as 'standard' | 'premium'
          );

          console.log(`✅ Referral commission processed successfully`);
        }
      } catch (referralError) {
        console.error('❌ Error processing referral commission:', referralError);
        // Don't fail the subscription if referral processing fails
      }
    } else {
      console.error('❌ No active subscription found for customer:', session.customer);
    }
  } catch (error) {
    console.error('💥 Error handling checkout session completed:', error);
    // Log the full error details
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

async function handleSubscriptionCreated(subscription: unknown) {
  const sub = subscription as { id: string };
  console.log('Subscription created:', sub.id);
  // Handle new subscription creation
}

async function handleSubscriptionUpdated(subscription: unknown) {
  const sub = subscription as {
    id: string;
    status: string;
    customer: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    items: {
      data: Array<{
        price: {
          id: string;
          nickname?: string;
        };
      }>;
    };
  };
  console.log('🔄 Subscription updated:', sub.id);
  console.log('📊 Subscription details:', {
    id: sub.id,
    status: sub.status,
    customer: sub.customer,
    current_period_start: sub.current_period_start,
    current_period_end: sub.current_period_end,
    cancel_at_period_end: sub.cancel_at_period_end
  });

  try {
    // Find user by Stripe subscription ID in Firestore
    const { db } = await import('@/lib/firebase');
    const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('subscription.stripeSubscriptionId', '==', sub.id));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`⚠️ No user found with subscription ID: ${sub.id}`);
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log(`👤 Found user ${userId} for subscription ${sub.id}`);

    // Determine plan type from price ID
    const priceId = sub.items.data[0]?.price?.id;
    let planType = 'free';
    let isYearly = false;

    // Map price IDs to plan types
    if (priceId === 'price_1RSlBdQ4uabTTSX2FB42wYKN') {
      planType = 'standard';
      isYearly = false;
    } else if (priceId === 'price_1RSlRwQ4uabTTSX2waKHXIpn') {
      planType = 'standard';
      isYearly = true;
    } else if (priceId === 'price_1RSlThQ4uabTTSX2vNrlcpaS') {
      planType = 'premium';
      isYearly = false;
    } else if (priceId === 'price_1RSlUIQ4uabTTSX2OuWNDMoI') {
      planType = 'premium';
      isYearly = true;
    }

    // Check for downgrade
    const currentPlan = userData.subscription?.planType || 'free';
    const { detectDowngrade, trackSubscriptionDowngrade } = await import('@/lib/subscription');

    let subscriptionData = {
      ...userData.subscription,
      planType,
      status: sub.status,
      currentPeriodStart: sub.current_period_start * 1000,
      currentPeriodEnd: sub.current_period_end * 1000,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      isYearly,
      updatedAt: Date.now(),
    };

    // Detect and track downgrades
    if (detectDowngrade(currentPlan, planType)) {
      console.log(`📉 Downgrade detected: ${currentPlan} → ${planType}`);

      // Track the downgrade with effective date as current period end
      await trackSubscriptionDowngrade(
        userId,
        currentPlan as 'standard' | 'premium',
        planType as 'free' | 'standard',
        sub.current_period_end * 1000,
        'user_initiated'
      );

      console.log(`✅ Downgrade tracked for user ${userId}`);
    } else if (userData.subscription?.pendingDowngrade) {
      // If this is an upgrade or same plan, clear any pending downgrade
      const { clearDowngradeTracking } = await import('@/lib/subscription');
      await clearDowngradeTracking(userId);
      console.log(`🧹 Cleared pending downgrade for user ${userId} due to plan change`);
    }

    // Update token limits based on new plan using centralized constants
    const currentTokenUsage = userData.tokenUsage || createDefaultTokenUsage();

    const newTokenUsage = {
      ...currentTokenUsage,
      limit: calculateTotalTokenLimit(planType as 'free' | 'standard' | 'premium', currentTokenUsage.purchased || 0),
    };

    // Update user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      subscription: subscriptionData,
      tokenUsage: newTokenUsage,
      updatedAt: Date.now(),
    });

    // Clear subscription status cache to ensure immediate updates
    try {
      subscriptionResponseCache.delete(userId);
      console.log(`🗑️ Cleared subscription cache for user: ${userId}`);
    } catch (cacheError) {
      console.warn('⚠️ Failed to clear cache, but continuing:', cacheError);
    }

    console.log(`✅ Successfully updated subscription for user ${userId} to ${planType} plan`);
    console.log(`📊 New subscription data:`, subscriptionData);

  } catch (error) {
    console.error('❌ Error handling subscription update:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

async function handleSubscriptionDeleted(subscription: unknown) {
  const sub = subscription as { id: string };
  console.log('🗑️ Subscription deleted:', sub.id);

  try {
    // Find user by Stripe subscription ID
    const { db } = await import('@/lib/firebase');
    const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('subscription.stripeSubscriptionId', '==', sub.id));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`⚠️ No user found with subscription ID: ${sub.id}`);
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    const currentPlan = userData.subscription?.planType || 'free';

    console.log(`👤 Found user ${userId} for deleted subscription ${sub.id}`);

    // Track downgrade to free plan if user had a paid plan
    if (currentPlan !== 'free') {
      const { trackSubscriptionDowngrade, clearDowngradeTracking } = await import('@/lib/subscription');

      // Track immediate downgrade to free
      await trackSubscriptionDowngrade(
        userId,
        currentPlan as 'standard' | 'premium',
        'free',
        Date.now(), // Effective immediately
        'cancellation'
      );

      console.log(`📉 Tracked downgrade for user ${userId}: ${currentPlan} → free (immediate)`);
    }

    // Update user to free plan
    const { updateUserSubscription } = await import('@/lib/subscription');
    await updateUserSubscription(userId, {
      planType: 'free',
      status: 'canceled',
      stripeSubscriptionId: undefined,
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
      cancelAtPeriodEnd: false,
      updatedAt: Date.now(),
    });

    // Clear any existing downgrade tracking since this is immediate
    const { clearDowngradeTracking } = await import('@/lib/subscription');
    await clearDowngradeTracking(userId);

    console.log(`✅ Successfully downgraded user ${userId} to free plan`);

  } catch (error) {
    console.error('❌ Error handling subscription deletion:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

async function handleInvoicePaymentSucceeded(invoice: unknown) {
  const inv = invoice as { id: string };
  console.log('Invoice payment succeeded:', inv.id);
  // Handle successful payment
  // Extend subscription, send receipt, etc.
}

async function handleInvoicePaymentFailed(invoice: unknown) {
  const inv = invoice as { id: string };
  console.log('Invoice payment failed:', inv.id);
  // Handle failed payment
  // Send notification, retry payment, etc.
}

async function handleTokenPurchase(userId: string, tokensStr: string | undefined) {
  if (!tokensStr) {
    console.error('❌ Missing tokens in metadata for token purchase');
    return;
  }

  const tokens = parseInt(tokensStr, 10);
  if (isNaN(tokens)) {
    console.error('❌ Invalid tokens value:', tokensStr);
    return;
  }

  console.log(`💰 Processing token purchase: ${tokens} tokens for user ${userId}`);

  try {
    // Get user document from Firestore
    const { db } = await import('@/lib/firebase');
    const { doc, getDoc, updateDoc } = await import('firebase/firestore');

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error('❌ User not found:', userId);
      return;
    }

    const userData = userDoc.data();
    const currentTokenUsage = userData.tokenUsage || createDefaultTokenUsage();

    // Add purchased tokens to the limit (they stack with subscription)
    const newTokenUsage = {
      ...currentTokenUsage,
      limit: currentTokenUsage.limit + tokens,
      purchased: (currentTokenUsage.purchased || 0) + tokens,
    };

    // Update user document
    await updateDoc(userRef, {
      tokenUsage: newTokenUsage,
      updatedAt: Date.now(),
    });

    console.log(`✅ Successfully added ${tokens} tokens to user ${userId}`);
    console.log(`📊 New token usage:`, newTokenUsage);

    // Clear subscription status cache to ensure immediate token limit updates
    try {
      subscriptionResponseCache.delete(userId);
      console.log(`🗑️ Cleared subscription cache for user after token purchase: ${userId}`);
    } catch (cacheError) {
      console.warn('⚠️ Failed to clear cache after token purchase, but continuing:', cacheError);
    }

  } catch (error) {
    console.error('❌ Error processing token purchase:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('💳 Payment intent succeeded:', paymentIntent.id);
  console.log('📋 Payment intent metadata:', paymentIntent.metadata);

  const { userId, tokens, type } = paymentIntent.metadata || {};

  if (type === 'token_purchase' && userId && tokens) {
    console.log('🪙 Processing token purchase from payment intent for user:', userId, 'tokens:', tokens);
    await handleTokenPurchase(userId, tokens);
  } else {
    console.log('ℹ️ Payment intent not for token purchase or missing metadata');
  }
}
