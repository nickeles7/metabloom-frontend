import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Get customer's subscriptions
    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const activeSubscription = subscriptions.data[0] as unknown as {
      id: string;
      status: string;
      current_period_end: number;
      items: {
        data: Array<{
          price: {
            nickname?: string;
          };
        }>;
      };
    };

    if (!activeSubscription) {
      return NextResponse.json({
        hasActiveSubscription: false,
        subscription: null,
      });
    }

    return NextResponse.json({
      hasActiveSubscription: true,
      subscription: {
        id: activeSubscription.id,
        status: activeSubscription.status,
        current_period_end: activeSubscription.current_period_end,
        plan: activeSubscription.items.data[0]?.price.nickname || 'Unknown',
      },
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
