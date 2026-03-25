import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  // Manual token addition for debugging webhook issues
  try {
    const { userId, tokens } = await request.json();

    if (!userId || !tokens) {
      return NextResponse.json(
        { error: 'userId and tokens are required' },
        { status: 400 }
      );
    }

    console.log(`🔧 Manual token addition: ${tokens} tokens for user ${userId}`);

    // Get user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      });
    }

    const userData = userDoc.data();
    const currentTokenUsage = userData.tokenUsage || {
      used: 0,
      limit: 2000,
      resetDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
      purchased: 0
    };

    const newTokenUsage = {
      ...currentTokenUsage,
      limit: currentTokenUsage.limit + tokens,
      purchased: (currentTokenUsage.purchased || 0) + tokens,
    };

    // Update user document
    await updateDoc(userRef, { tokenUsage: newTokenUsage });

    console.log(`✅ Manually added ${tokens} tokens to user ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Added ${tokens} tokens to user ${userId}`,
      oldTokenUsage: currentTokenUsage,
      newTokenUsage,
    });

  } catch (error) {
    console.error('❌ Manual token addition error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

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

    console.log(`🔍 Debug: Checking token status for user: ${userId}`);

    // Get user document from Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        userId,
        timestamp: new Date().toISOString(),
      });
    }

    const userData = userDoc.data();
    const tokenUsage = userData.tokenUsage;
    const subscription = userData.subscription;

    // Detailed debug information
    const debugInfo = {
      success: true,
      userId,
      timestamp: new Date().toISOString(),
      
      // Raw Firestore data
      rawTokenUsage: tokenUsage,
      rawSubscription: subscription,
      
      // Processed token data
      tokenData: {
        used: tokenUsage?.used || 0,
        limit: tokenUsage?.limit || 0,
        purchased: tokenUsage?.purchased || 0,
        resetDate: tokenUsage?.resetDate || null,
        limitExceeded: (tokenUsage?.used || 0) > (tokenUsage?.limit || 0),
      },
      
      // Subscription data
      subscriptionData: {
        planType: subscription?.planType || 'free',
        status: subscription?.status || 'inactive',
        stripeCustomerId: subscription?.stripeCustomerId || null,
        stripeSubscriptionId: subscription?.stripeSubscriptionId || null,
      },
      
      // Calculated values
      calculations: {
        baseLimit: subscription?.planType === 'premium' ? 10000 : 
                   subscription?.planType === 'standard' ? 5000 : 2000,
        totalLimit: (subscription?.planType === 'premium' ? 10000 : 
                    subscription?.planType === 'standard' ? 5000 : 2000) + 
                   (tokenUsage?.purchased || 0),
        remainingTokens: (tokenUsage?.limit || 0) - (tokenUsage?.used || 0),
      },
      
      // System status
      systemStatus: {
        hasTokenUsage: !!tokenUsage,
        hasSubscription: !!subscription,
        dataConsistency: {
          limitMatchesCalculation: (tokenUsage?.limit || 0) === 
            ((subscription?.planType === 'premium' ? 10000 : 
              subscription?.planType === 'standard' ? 5000 : 2000) + 
             (tokenUsage?.purchased || 0)),
        }
      }
    };

    console.log(`✅ Debug info generated for user ${userId}:`, debugInfo);

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('💥 Error in debug endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
