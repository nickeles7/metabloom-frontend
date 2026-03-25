import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/subscription';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Debug: Fetching subscription data for user: ${userId}`);

    // Get user profile from Firestore
    const userProfile = await getUserProfile(userId);

    if (!userProfile) {
      return NextResponse.json({
        error: 'User profile not found',
        userId
      });
    }

    const subscription = userProfile.subscription;

    return NextResponse.json({
      userId,
      userProfile: {
        email: userProfile.email,
        displayName: userProfile.displayName,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt
      },
      subscription: {
        planType: subscription?.planType,
        status: subscription?.status,
        stripeSubscriptionId: subscription?.stripeSubscriptionId,
        stripeCustomerId: subscription?.stripeCustomerId,
        currentPeriodStart: subscription?.currentPeriodStart,
        currentPeriodEnd: subscription?.currentPeriodEnd,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
        isYearly: subscription?.isYearly,
        pendingDowngrade: subscription?.pendingDowngrade,
        createdAt: subscription?.createdAt,
        updatedAt: subscription?.updatedAt
      },
      tokenUsage: userProfile.tokenUsage,
      debug: {
        hasPendingDowngrade: !!subscription?.pendingDowngrade,
        currentTime: new Date().toISOString(),
        subscriptionKeys: subscription ? Object.keys(subscription) : []
      }
    });
  } catch (error) {
    console.error('Error in subscription debug API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (action === 'simulate-downgrade') {
      const { trackSubscriptionDowngrade } = await import('@/lib/subscription');
      
      // Simulate a downgrade from premium to standard in 3 days
      const effectiveDate = Date.now() + (3 * 24 * 60 * 60 * 1000);
      
      const success = await trackSubscriptionDowngrade(
        userId,
        'premium',
        'standard',
        effectiveDate,
        'user_initiated'
      );

      return NextResponse.json({
        success,
        message: success ? 'Simulated downgrade tracked' : 'Failed to track downgrade',
        effectiveDate: new Date(effectiveDate).toISOString()
      });
    }

    if (action === 'clear-downgrade') {
      const { clearDowngradeTracking } = await import('@/lib/subscription');
      
      const success = await clearDowngradeTracking(userId);

      return NextResponse.json({
        success,
        message: success ? 'Downgrade tracking cleared' : 'Failed to clear downgrade'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in subscription debug POST:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
