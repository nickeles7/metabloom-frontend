import { NextRequest, NextResponse } from 'next/server';
import { updateUserSubscription } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    const { userId, planType, sessionId } = await request.json();

    if (!userId || !planType) {
      return NextResponse.json(
        { error: 'User ID and plan type are required' },
        { status: 400 }
      );
    }

    console.log(`🧪 SIMULATING WEBHOOK: User ${userId} purchased ${planType} plan`);
    console.log(`📋 Session ID: ${sessionId}`);

    // Simulate the webhook data that would come from Stripe
    const subscriptionData = {
      stripeCustomerId: `cus_test_${Date.now()}`,
      stripeSubscriptionId: `sub_test_${Date.now()}`,
      planType: planType as 'standard' | 'premium',
      status: 'active' as const,
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: false,
      isYearly: false,
      updatedAt: Date.now(),
    };

    console.log('💾 Updating user subscription with simulated data:', subscriptionData);

    // Update user subscription in Firestore
    await updateUserSubscription(userId, subscriptionData);

    console.log(`🎊 SIMULATION COMPLETE: User ${userId} successfully subscribed to ${planType} plan`);

    return NextResponse.json({
      success: true,
      message: `Successfully simulated webhook for ${planType} subscription`,
      userId,
      planType,
      subscriptionData,
    });
  } catch (error) {
    console.error('💥 Error simulating webhook:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    );
  }
}
