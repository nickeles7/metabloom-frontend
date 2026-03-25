import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { userId, tokens } = await request.json();

    if (!userId || !tokens) {
      return NextResponse.json(
        { error: 'User ID and tokens are required' },
        { status: 400 }
      );
    }

    console.log(`🧪 Test: Adding ${tokens} tokens to user ${userId}`);

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
    const currentTokenUsage = userData.tokenUsage || { 
      used: 0, 
      limit: 2000, 
      resetDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
      purchased: 0
    };

    // Add tokens to the limit
    const newTokenUsage = {
      ...currentTokenUsage,
      limit: currentTokenUsage.limit + tokens,
      purchased: (currentTokenUsage.purchased || 0) + tokens,
    };

    // Update user document
    await updateDoc(userRef, {
      tokenUsage: newTokenUsage,
      updatedAt: Date.now(),
    });

    console.log(`✅ Test: Successfully added ${tokens} tokens to user ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Test: Added ${tokens} tokens`,
      tokenUsage: newTokenUsage,
    });

  } catch (error) {
    console.error('❌ Test token addition error:', error);
    return NextResponse.json(
      { error: 'Failed to add test tokens' },
      { status: 500 }
    );
  }
}
