import { NextRequest, NextResponse } from 'next/server';
import { trackSubscriptionDowngrade, clearDowngradeTracking } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    const { userId, action, fromPlan, toPlan, daysFromNow } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (action === 'track') {
      if (!fromPlan || !toPlan) {
        return NextResponse.json(
          { error: 'fromPlan and toPlan are required for tracking' },
          { status: 400 }
        );
      }

      // Calculate effective date (default to 7 days from now)
      const days = daysFromNow || 7;
      const effectiveDate = Date.now() + (days * 24 * 60 * 60 * 1000);

      const success = await trackSubscriptionDowngrade(
        userId,
        fromPlan,
        toPlan,
        effectiveDate,
        'user_initiated'
      );

      if (success) {
        return NextResponse.json({
          success: true,
          message: `Downgrade tracked: ${fromPlan} → ${toPlan} in ${days} days`,
          effectiveDate: new Date(effectiveDate).toISOString()
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to track downgrade' },
          { status: 500 }
        );
      }
    } else if (action === 'clear') {
      const success = await clearDowngradeTracking(userId);

      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Downgrade tracking cleared'
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to clear downgrade tracking' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "track" or "clear"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in test-downgrade API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test Downgrade API',
    usage: {
      track: 'POST with { userId, action: "track", fromPlan, toPlan, daysFromNow? }',
      clear: 'POST with { userId, action: "clear" }'
    },
    example: {
      track: {
        userId: 'user123',
        action: 'track',
        fromPlan: 'premium',
        toPlan: 'standard',
        daysFromNow: 5
      },
      clear: {
        userId: 'user123',
        action: 'clear'
      }
    }
  });
}
