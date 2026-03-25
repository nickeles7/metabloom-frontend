import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { planType, isYearly, userId } = await request.json();

    console.log(`🔄 Redirecting checkout request to change-subscription endpoint`);
    console.log(`📋 Parameters: userId=${userId}, planType=${planType}, isYearly=${isYearly}`);

    // Redirect to the new change-subscription endpoint that handles existing subscriptions
    const changeSubscriptionResponse = await fetch(`${request.nextUrl.origin}/api/stripe/change-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planType,
        isYearly,
        userId,
      }),
    });

    const responseData = await changeSubscriptionResponse.json();

    if (!changeSubscriptionResponse.ok) {
      return NextResponse.json(responseData, { status: changeSubscriptionResponse.status });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('💥 Error in checkout session redirect:', error);
    return NextResponse.json(
      { error: 'Failed to process checkout request' },
      { status: 500 }
    );
  }
}
