import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getUserProfile } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Creating billing portal session for user: ${userId}`);

    // Get user profile to retrieve Stripe customer ID
    const userProfile = await getUserProfile(userId);

    if (!userProfile || !userProfile.subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe to a plan first.' },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const stripeCustomerData = userProfile.subscription.stripeCustomerId;

    console.log(`💳 Raw customer data from database:`, stripeCustomerData);
    console.log(`🔍 Customer data type: ${typeof stripeCustomerData}`);

    // Extract customer ID - handle both string ID and customer object
    const customerId = typeof stripeCustomerData === 'string'
      ? stripeCustomerData
      : (stripeCustomerData as { id?: string })?.id || stripeCustomerData;

    console.log("Billing portal customer ID:", customerId); // should log 'cus_XXXX'

    if (!customerId || typeof customerId !== 'string' || !customerId.startsWith('cus_')) {
      return NextResponse.json(
        { error: `Invalid Stripe customer ID format: ${customerId}` },
        { status: 400 }
      );
    }

    // Create billing portal session - return to home page
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${request.nextUrl.origin}/`,
    });

    console.log(`✅ Billing portal session created: ${portalSession.id}`);

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    });

  } catch (error) {
    console.error('❌ Error creating billing portal session:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create billing portal session',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
