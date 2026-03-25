import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, updateUserSubscription } from '@/lib/subscription';

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

    console.log(`🔍 Debug: Checking user ${userId}`);

    // Get user profile
    const userProfile = await getUserProfile(userId);

    return NextResponse.json({
      userId,
      userProfile,
      firestoreWorking: !!userProfile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      firestoreWorking: false,
      timestamp: new Date().toISOString(),
    });
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

    console.log(`🧪 Debug: Simulating subscription for user ${userId} with plan ${planType}`);

    // Simulate a subscription update
    await updateUserSubscription(userId, {
      planType: planType as 'standard' | 'premium',
      status: 'active',
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: false,
      isYearly: false,
      updatedAt: Date.now(),
    });

    // Get updated profile
    const updatedProfile = await getUserProfile(userId);

    return NextResponse.json({
      success: true,
      userId,
      planType,
      updatedProfile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Debug subscription update error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      timestamp: new Date().toISOString(),
    });
  }
}
