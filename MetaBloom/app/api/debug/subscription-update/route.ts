import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, updateUserSubscription } from '@/lib/subscription';
import { subscriptionResponseCache } from '@/lib/cache/subscription-cache';

export async function POST(request: NextRequest) {
  try {
    const { userId, planType } = await request.json();

    if (!userId || !planType) {
      return NextResponse.json(
        { error: 'User ID and plan type are required' },
        { status: 400 }
      );
    }

    console.log(`🔧 Debug: Manually updating subscription for user ${userId} to ${planType}`);

    // Get current user profile
    const currentProfile = await getUserProfile(userId);
    console.log('📋 Current profile:', currentProfile?.subscription);

    // Update subscription
    const subscriptionData = {
      planType,
      status: 'active' as const,
      updatedAt: Date.now(),
    };

    await updateUserSubscription(userId, subscriptionData);

    // Get updated profile
    const updatedProfile = await getUserProfile(userId);
    console.log('📋 Updated profile:', updatedProfile?.subscription);

    // Clear cache
    try {
      subscriptionResponseCache.delete(userId);
      console.log(`🗑️ Cleared subscription cache for user: ${userId}`);
    } catch (cacheError) {
      console.warn('⚠️ Failed to clear cache:', cacheError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated subscription to ${planType}`,
      before: currentProfile?.subscription,
      after: updatedProfile?.subscription,
    });

  } catch (error) {
    console.error('❌ Debug subscription update error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}
