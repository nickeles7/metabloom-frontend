import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function GET() {
  try {
    // Test if Stripe can be initialized
    const stripe = getStripe();
    
    // Test a simple API call
    const balance = await stripe.balance.retrieve();
    
    return NextResponse.json({
      success: true,
      message: 'Stripe connection successful',
      testMode: balance.livemode === false,
      currency: balance.available[0]?.currency || 'usd',
    });
  } catch (error) {
    console.error('Stripe test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Stripe connection failed'
      },
      { status: 500 }
    );
  }
}
