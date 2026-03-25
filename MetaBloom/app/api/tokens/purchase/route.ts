import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { userId, amount, tokens } = await request.json();

    // Validate input
    if (!userId || !amount || !tokens) {
      return NextResponse.json(
        { error: 'User ID, amount, and tokens are required' },
        { status: 400 }
      );
    }

    if (amount < 3 || amount > 50) {
      return NextResponse.json(
        { error: 'Purchase amount must be between $3 and $50' },
        { status: 400 }
      );
    }

    if (tokens !== amount * 5000) {
      return NextResponse.json(
        { error: 'Invalid token calculation' },
        { status: 400 }
      );
    }

    // Get user document from Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Create Stripe checkout session for payment
    const checkoutUrl = await createStripeCheckoutSession(request, userId, amount, tokens);

    return NextResponse.json({
      success: true,
      checkoutUrl,
      message: 'Redirecting to Stripe checkout...',
    });

  } catch (error) {
    console.error('Error processing token purchase:', error);
    return NextResponse.json(
      { error: 'Failed to process token purchase' },
      { status: 500 }
    );
  }
}

// Stripe checkout session creation
async function createStripeCheckoutSession(request: NextRequest, userId: string, amount: number, tokens: number) {
  try {
    const stripe = getStripe();
    const baseUrl = request.nextUrl.origin;

    console.log(`🔗 Creating Stripe checkout session with base URL: ${baseUrl}`);

    const successUrl = `${baseUrl}/new-chat?token_purchase=success`;
    const cancelUrl = `${baseUrl}/new-chat?token_purchase=cancelled`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tokens.toLocaleString()} MetaBloom Tokens`,
              description: `Additional tokens for MetaBloom AI chat`,
            },
            unit_amount: amount * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tokens: tokens.toString(),
        type: 'token_purchase',
      },
      payment_intent_data: {
        metadata: {
          userId,
          tokens: tokens.toString(),
          type: 'token_purchase',
        },
      },
    });

    console.log(`✅ Stripe checkout session created successfully: ${session.id}`);
    return session.url;
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    throw error;
  }
}
