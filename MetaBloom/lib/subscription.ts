import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getStripe } from '@/lib/stripe';
import { calculateSubscriptionPeriod, formatPeriodInfo } from '@/lib/stripe-period-calculator';
import Stripe from 'stripe';

export interface UserSubscription {
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  planType: 'free' | 'standard' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  isYearly?: boolean;
  createdAt: number;
  updatedAt: number;
  // Downgrade tracking fields
  pendingDowngrade?: {
    fromPlan: 'standard' | 'premium';
    toPlan: 'free' | 'standard';
    effectiveDate: number; // Timestamp when downgrade takes effect
    scheduledAt: number; // Timestamp when downgrade was scheduled
    reason: 'user_initiated' | 'payment_failed' | 'cancellation';
  };
}

export interface ReferralHistoryItem {
  referredUserId: string;
  referredUserEmail: string;
  subscriptionType: 'standard' | 'premium';
  commissionAmount: number;
  referralDate: number;
}

export interface AffiliateData {
  affiliateCode: string;
  affiliateLink: string;
  totalEarnings: number;
  totalReferrals: number;
  referralHistory: ReferralHistoryItem[];
}

export interface SavedDeck {
  id: string;
  deckCode: string;
  name: string;
  className: string;
  formatName: string;
  totalCards: number;
  savedAt: number;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  subscription: UserSubscription;
  tokenUsage?: {
    used: number;
    limit: number;
    resetDate: number;
  };
  referredBy?: string;
  affiliateData?: AffiliateData;
  savedDecks?: SavedDeck[];
  createdAt: number;
  updatedAt: number;
}

// Update user email verification status
export async function updateEmailVerificationStatus(userId: string, emailVerified: boolean): Promise<void> {
  console.log(`📧 Updating email verification status for user ${userId}: ${emailVerified}`);

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      emailVerified,
      updatedAt: Date.now(),
    });
    console.log('✅ Email verification status updated successfully');
  } catch (error) {
    console.error('❌ Error updating email verification status:', error);
    throw error;
  }
}

// Create or update user profile
export async function createUserProfile(userId: string, email: string, displayName?: string): Promise<UserProfile> {
  console.log(`👤 Creating/updating user profile for: ${userId}`);

  const now = Date.now();

  try {
    const userRef = doc(db, 'users', userId);

    // First check if user already exists
    const existingUser = await getDoc(userRef);

    if (existingUser.exists()) {
      const existingProfile = existingUser.data() as UserProfile;
      console.log('✅ User profile already exists, updating basic info only:', {
        userId: existingProfile.userId,
        currentPlan: existingProfile.subscription?.planType,
        hasStripeId: !!existingProfile.subscription?.stripeSubscriptionId
      });

      // Only update basic user info, preserve subscription data
      const updateData = {
        email,
        displayName,
        updatedAt: now,
      };

      await setDoc(userRef, updateData, { merge: true });

      // Return the existing profile with updated basic info
      return {
        ...existingProfile,
        email,
        displayName,
        updatedAt: now,
      };
    }

    // Create new user profile only if it doesn't exist
    console.log('🆕 Creating new user profile with default subscription');

    const defaultSubscription: UserSubscription = {
      userId,
      planType: 'free',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const userProfile: UserProfile = {
      userId,
      email,
      displayName,
      emailVerified: false, // New users start with unverified email
      subscription: defaultSubscription,
      tokenUsage: {
        used: 0,
        limit: 1000, // Free tier limit
        resetDate: now + (30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(userRef, userProfile, { merge: true });

    console.log('✅ New user profile created successfully');
    return userProfile;

  } catch (error) {
    console.error('❌ Error creating user profile:', error);

    // If Firestore is not available, return a default profile
    if (error instanceof Error && (
      error.message.includes('offline') ||
      error.message.includes('NOT_FOUND') ||
      error.message.includes('permission-denied') ||
      (error as any).code === 'unavailable' ||
      (error as any).code === 'permission-denied'
    )) {
      console.warn('⚠️ Firestore not available, user profile created in memory only');
      return createDefaultProfile(userId);
    }

    throw error;
  }
}

// Get user profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  console.log(`📋 Getting user profile for: ${userId}`);

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const profile = userSnap.data() as UserProfile;
      console.log('✅ User profile found:', {
        userId: profile.userId,
        planType: profile.subscription?.planType,
        status: profile.subscription?.status,
        hasStripeId: !!profile.subscription?.stripeSubscriptionId,
        updatedAt: profile.subscription?.updatedAt ? new Date(profile.subscription.updatedAt).toISOString() : 'N/A'
      });
      return profile;
    }

    console.log('❌ No user profile found in Firestore');
    return null;
  } catch (error) {
    console.error('❌ Error getting user profile:', error);

    // If Firestore is not available, return a default free profile
    if (error instanceof Error && (
      error.message.includes('offline') ||
      error.message.includes('NOT_FOUND') ||
      error.message.includes('permission-denied') ||
      (error as any).code === 'unavailable' ||
      (error as any).code === 'permission-denied'
    )) {
      console.warn('⚠️ Firestore not available, returning default profile');
      return createDefaultProfile(userId);
    }

    return null;
  }
}

// Create default profile when Firestore is not available
function createDefaultProfile(userId: string): UserProfile {
  const now = Date.now();
  return {
    userId,
    email: 'user@example.com',
    emailVerified: false,
    subscription: {
      userId,
      planType: 'free',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    tokenUsage: {
      used: 0,
      limit: 1000,
      resetDate: now + (30 * 24 * 60 * 60 * 1000),
    },
    createdAt: now,
    updatedAt: now,
  };
}

// Update user subscription
export async function updateUserSubscription(
  userId: string,
  subscriptionData: Partial<UserSubscription>
): Promise<void> {
  console.log(`🔄 Updating subscription for user ${userId}:`, subscriptionData);

  try {
    const userRef = doc(db, 'users', userId);

    // First, try to get the existing user document
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Update existing user - merge subscription data with existing data
      const existingProfile = userSnap.data() as UserProfile;
      const mergedSubscription = {
        ...existingProfile.subscription,
        ...subscriptionData,
        updatedAt: Date.now(),
      };

      const updateData = {
        subscription: mergedSubscription,
        updatedAt: Date.now(),
      };

      console.log('📝 Updating existing user document with merged subscription data');
      console.log('🔄 Existing subscription:', existingProfile.subscription);
      console.log('🆕 New subscription data:', subscriptionData);
      console.log('🔀 Merged subscription:', mergedSubscription);

      await updateDoc(userRef, updateData);
    } else {
      // Create new user document with subscription
      console.log('🆕 Creating new user document with subscription');
      const newUserData = {
        userId,
        email: 'unknown@example.com', // Will be updated when user logs in
        subscription: {
          userId,
          planType: 'free',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ...subscriptionData,
        },
        tokenUsage: {
          used: 0,
          limit: subscriptionData.planType === 'premium' ? 10000 :
                 subscriptionData.planType === 'standard' ? 5000 : 1000,
          resetDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc(userRef, newUserData, { merge: true });
    }

    console.log(`✅ Successfully updated subscription for user ${userId}`);
  } catch (error) {
    console.error('❌ Error updating user subscription:', error);

    // If Firestore is not available, log the update but don't throw
    if (error instanceof Error && (
      error.message.includes('offline') ||
      error.message.includes('NOT_FOUND') ||
      error.message.includes('permission-denied') ||
      (error as any).code === 'unavailable' ||
      (error as any).code === 'permission-denied'
    )) {
      console.warn('⚠️ Firestore not available, subscription update skipped:', subscriptionData);
      console.warn('Error details:', error.message);
      return;
    }

    throw error;
  }
}

// Check if user email is verified
export async function isEmailVerified(userId: string): Promise<boolean> {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile?.emailVerified || false;
  } catch (error) {
    console.error('Error checking email verification status:', error);
    return false;
  }
}

// Check if user has active subscription
export async function hasActiveSubscription(userId: string, planType?: string): Promise<boolean> {
  try {
    const userProfile = await getUserProfile(userId);

    if (!userProfile) return false;

    const subscription = userProfile.subscription;
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';

    if (planType) {
      return isActive && subscription.planType === planType;
    }

    return isActive && subscription.planType !== 'free';
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

// Get user's current plan
export async function getCurrentPlan(userId: string): Promise<string> {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile?.subscription?.planType || 'free';
  } catch (error) {
    console.error('Error getting current plan:', error);
    return 'free';
  }
}

// Sync subscription with Stripe
export async function syncSubscriptionWithStripe(userId: string): Promise<UserSubscription | null> {
  console.log(`🔄 Syncing subscription with Stripe for user: ${userId}`);

  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile?.subscription?.stripeSubscriptionId) {
      console.log('❌ No Stripe subscription ID found for user');
      return null;
    }

    console.log(`📋 Found Stripe subscription ID: ${userProfile.subscription.stripeSubscriptionId}`);

    const stripe = getStripe();
    const subscription: Stripe.Subscription = await stripe.subscriptions.retrieve(
      userProfile.subscription.stripeSubscriptionId
    );

    console.log('📊 Stripe subscription data:', {
      id: subscription.id,
      status: subscription.status,
      current_period_start: (subscription as any).current_period_start,
      current_period_end: (subscription as any).current_period_end,
      cancel_at_period_end: (subscription as any).cancel_at_period_end,
      items: subscription.items.data.map(item => ({
        price_id: item.price.id,
        nickname: item.price.nickname,
        amount: item.price.unit_amount
      }))
    });

    // Safe timestamp conversion helper
    const safeTimestampConversion = (timestamp: any): number | undefined => {
      if (timestamp === undefined || timestamp === null) {
        return undefined;
      }
      const numericTimestamp = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
      if (isNaN(numericTimestamp) || numericTimestamp < 0) {
        return undefined;
      }
      return Math.floor(numericTimestamp) * 1000;
    };

    const updatedSubscription: Partial<UserSubscription> = {
      status: subscription.status as UserSubscription['status'],
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      updatedAt: Date.now(),
    };

    // Use enhanced period calculation for subscription sync
    console.log('🔄 Sync: Calculating subscription period...');
    const calculatedPeriod = await calculateSubscriptionPeriod(stripe, subscription as any);

    console.log('📊 Sync period calculation:', formatPeriodInfo(calculatedPeriod));

    // Always set the period data using our calculated values
    updatedSubscription.currentPeriodStart = calculatedPeriod.current_period_start * 1000;
    updatedSubscription.currentPeriodEnd = calculatedPeriod.current_period_end * 1000;

    console.log(`✅ Sync period data set from ${calculatedPeriod.source} with ${calculatedPeriod.confidence} confidence`);

    console.log('💾 Updating subscription with synced data:', updatedSubscription);

    await updateUserSubscription(userId, updatedSubscription);

    const syncedSubscription = { ...userProfile.subscription, ...updatedSubscription };
    console.log('✅ Successfully synced subscription with Stripe');

    return syncedSubscription;
  } catch (error) {
    console.error('❌ Error syncing subscription with Stripe:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

// Cancel subscription
export async function cancelSubscription(userId: string): Promise<boolean> {
  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile?.subscription?.stripeSubscriptionId) {
      return false;
    }

    const stripe = getStripe();
    await stripe.subscriptions.update(userProfile.subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await updateUserSubscription(userId, {
      cancelAtPeriodEnd: true,
      updatedAt: Date.now(),
    });

    return true;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return false;
  }
}

// Cancel subscription immediately
export async function cancelSubscriptionImmediately(userId: string): Promise<boolean> {
  console.log(`🚫 Canceling subscription immediately for user: ${userId}`);

  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile?.subscription?.stripeSubscriptionId) {
      console.log('❌ No Stripe subscription ID found for immediate cancellation');
      return false;
    }

    console.log(`🔄 Canceling Stripe subscription: ${userProfile.subscription.stripeSubscriptionId}`);

    const stripe = getStripe();
    await stripe.subscriptions.cancel(userProfile.subscription.stripeSubscriptionId);

    await updateUserSubscription(userId, {
      status: 'canceled',
      cancelAtPeriodEnd: false,
      updatedAt: Date.now(),
    });

    console.log('✅ Subscription canceled immediately');
    return true;
  } catch (error) {
    console.error('❌ Error canceling subscription immediately:', error);
    return false;
  }
}

// Update existing subscription to new plan
export async function updateSubscriptionPlan(
  userId: string,
  newPriceId: string,
  newPlanType: 'standard' | 'premium'
): Promise<boolean> {
  console.log(`🔄 Updating subscription plan for user: ${userId} to ${newPlanType}`);

  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile?.subscription?.stripeSubscriptionId) {
      console.log('❌ No Stripe subscription ID found for update');
      return false;
    }

    const stripe = getStripe();
    const subscriptionId = userProfile.subscription.stripeSubscriptionId;

    console.log(`📋 Retrieving current subscription: ${subscriptionId}`);

    // Get current subscription
    const currentSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (currentSubscription.status !== 'active' && currentSubscription.status !== 'trialing') {
      console.log(`❌ Cannot update subscription with status: ${currentSubscription.status}`);
      return false;
    }

    // Get the current subscription item
    const subscriptionItem = currentSubscription.items.data[0];

    console.log(`🔄 Updating subscription item ${subscriptionItem.id} to price ${newPriceId}`);

    // Update the subscription to use the new price
    const updatedSubscription: Stripe.Subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscriptionItem.id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations', // Handle prorations for plan changes
    });

    console.log('📊 Updated subscription:', {
      id: updatedSubscription.id,
      status: updatedSubscription.status,
      current_period_start: (updatedSubscription as any).current_period_start,
      current_period_end: (updatedSubscription as any).current_period_end,
      items: updatedSubscription.items.data.map(item => ({
        id: item.id,
        price: item.price.id
      }))
    });

    // Verify the subscription update was successful
    const updatedItem = updatedSubscription.items.data[0];
    if (updatedItem.price.id !== newPriceId) {
      console.error(`❌ Subscription update failed - price not updated. Expected: ${newPriceId}, Got: ${updatedItem.price.id}`);
      return false;
    }

    console.log('✅ Stripe subscription update confirmed, updating Firestore...');

    // Calculate periods for the updated subscription
    console.log('🔄 Plan change: Calculating updated subscription period...');
    const updatedPeriod = await calculateSubscriptionPeriod(stripe, updatedSubscription);
    console.log('📊 Updated subscription period:', formatPeriodInfo(updatedPeriod));

    // Update our database only after confirming Stripe update was successful
    await updateUserSubscription(userId, {
      planType: newPlanType,
      status: updatedSubscription.status as UserSubscription['status'],
      currentPeriodStart: updatedPeriod.current_period_start * 1000,
      currentPeriodEnd: updatedPeriod.current_period_end * 1000,
      cancelAtPeriodEnd: (updatedSubscription as any).cancel_at_period_end,
      updatedAt: Date.now(),
    });

    console.log('✅ Successfully updated subscription plan');
    return true;
  } catch (error) {
    console.error('❌ Error updating subscription plan:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return false;
  }
}

// Get user's existing Stripe subscription details
export async function getExistingStripeSubscription(userId: string): Promise<{
  hasSubscription: boolean;
  subscriptionId?: string;
  customerId?: string;
  status?: string;
  planType?: string;
  cancelAtPeriodEnd?: boolean;
} | null> {
  console.log(`🔍 Checking for existing Stripe subscription for user: ${userId}`);

  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile?.subscription) {
      console.log('❌ No user subscription data found');
      return { hasSubscription: false };
    }

    const subscription = userProfile.subscription;

    // Check if user has Stripe subscription details
    if (!subscription.stripeSubscriptionId || !subscription.stripeCustomerId) {
      console.log('❌ No Stripe subscription or customer ID found');
      return { hasSubscription: false };
    }

    // Verify the subscription still exists in Stripe
    const stripe = getStripe();
    try {
      const stripeSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

      console.log('✅ Found existing Stripe subscription:', {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        customer: stripeSubscription.customer,
      });

      return {
        hasSubscription: true,
        subscriptionId: stripeSubscription.id,
        customerId: stripeSubscription.customer as string,
        status: stripeSubscription.status,
        planType: subscription.planType,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      };
    } catch (stripeError) {
      console.log('❌ Stripe subscription not found or invalid:', stripeError);
      return { hasSubscription: false };
    }
  } catch (error) {
    console.error('❌ Error checking existing subscription:', error);
    return null;
  }
}

// Reactivate a canceled subscription (cancel_at_period_end: false)
export async function reactivateSubscription(userId: string): Promise<boolean> {
  console.log(`🔄 Reactivating subscription for user: ${userId}`);

  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile?.subscription?.stripeSubscriptionId) {
      console.log('❌ No Stripe subscription ID found for reactivation');
      return false;
    }

    const stripe = getStripe();
    const subscriptionId = userProfile.subscription.stripeSubscriptionId;

    console.log(`📋 Retrieving current subscription: ${subscriptionId}`);

    // Get current subscription to check its status
    const currentSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Only reactivate if it's active but set to cancel at period end
    if (currentSubscription.status !== 'active' || !currentSubscription.cancel_at_period_end) {
      console.log(`❌ Cannot reactivate subscription. Status: ${currentSubscription.status}, cancel_at_period_end: ${currentSubscription.cancel_at_period_end}`);
      return false;
    }

    console.log(`🔄 Reactivating subscription by setting cancel_at_period_end to false`);

    // Reactivate the subscription
    const reactivatedSubscription: Stripe.Subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    console.log('📊 Reactivated subscription:', {
      id: reactivatedSubscription.id,
      status: reactivatedSubscription.status,
      cancel_at_period_end: reactivatedSubscription.cancel_at_period_end,
    });

    // Verify the reactivation was successful before updating database
    if (reactivatedSubscription.cancel_at_period_end !== false) {
      console.error('❌ Reactivation failed - cancel_at_period_end is still true');
      return false;
    }

    // Update our database - only update the cancelAtPeriodEnd flag, don't change plan or other data
    await updateUserSubscription(userId, {
      cancelAtPeriodEnd: false,
      updatedAt: Date.now(),
    });

    console.log('✅ Successfully reactivated subscription');
    return true;
  } catch (error) {
    console.error('❌ Error reactivating subscription:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return false;
  }
}

/**
 * Utility function to determine plan hierarchy for downgrade detection
 */
function getPlanHierarchy(plan: string): number {
  switch (plan) {
    case 'premium': return 3;
    case 'standard': return 2;
    case 'free': return 1;
    default: return 0;
  }
}

/**
 * Detect if a subscription change represents a downgrade
 */
export function detectDowngrade(
  currentPlan: string,
  newPlan: string
): boolean {
  return getPlanHierarchy(newPlan) < getPlanHierarchy(currentPlan);
}

/**
 * Track a subscription downgrade in the user's profile
 */
export async function trackSubscriptionDowngrade(
  userId: string,
  fromPlan: 'standard' | 'premium',
  toPlan: 'free' | 'standard',
  effectiveDate: number,
  reason: 'user_initiated' | 'payment_failed' | 'cancellation' = 'user_initiated'
): Promise<boolean> {
  try {
    console.log(`📉 Tracking downgrade for user ${userId}: ${fromPlan} → ${toPlan}`);

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error('❌ User not found for downgrade tracking:', userId);
      return false;
    }

    const userData = userDoc.data();
    const currentSubscription = userData.subscription || {};

    // Create downgrade tracking data
    const pendingDowngrade = {
      fromPlan,
      toPlan,
      effectiveDate,
      scheduledAt: Date.now(),
      reason
    };

    // Update subscription with downgrade tracking
    const updatedSubscription = {
      ...currentSubscription,
      pendingDowngrade,
      updatedAt: Date.now()
    };

    await updateDoc(userRef, {
      subscription: updatedSubscription,
      updatedAt: Date.now()
    });

    console.log('✅ Successfully tracked subscription downgrade');
    return true;
  } catch (error) {
    console.error('❌ Error tracking subscription downgrade:', error);
    return false;
  }
}

/**
 * Clear downgrade tracking when downgrade is complete or cancelled
 */
export async function clearDowngradeTracking(userId: string): Promise<boolean> {
  try {
    console.log(`🧹 Clearing downgrade tracking for user ${userId}`);

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error('❌ User not found for clearing downgrade tracking:', userId);
      return false;
    }

    const userData = userDoc.data();
    const currentSubscription = userData.subscription || {};

    // Remove pendingDowngrade field
    const { pendingDowngrade, ...updatedSubscription } = currentSubscription;
    updatedSubscription.updatedAt = Date.now();

    await updateDoc(userRef, {
      subscription: updatedSubscription,
      updatedAt: Date.now()
    });

    console.log('✅ Successfully cleared downgrade tracking');
    return true;
  } catch (error) {
    console.error('❌ Error clearing downgrade tracking:', error);
    return false;
  }
}