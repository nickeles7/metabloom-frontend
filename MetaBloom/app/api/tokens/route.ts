import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { createDefaultTokenUsage } from '@/lib/constants/token-limits';

export async function POST(request: NextRequest) {
  try {
    const { userId, tokensUsed } = await request.json();

    if (!userId || typeof tokensUsed !== 'number') {
      return NextResponse.json(
        { error: 'User ID and tokens used are required' },
        { status: 400 }
      );
    }

    if (tokensUsed < 0) {
      return NextResponse.json(
        { error: 'Tokens used cannot be negative' },
        { status: 400 }
      );
    }

    // Get user document from Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentTokenUsage = userData.tokenUsage || createDefaultTokenUsage();

      // Check if adding tokens would exceed the limit
      const newUsedAmount = currentTokenUsage.used + tokensUsed;
      const wouldExceedLimit = newUsedAmount > currentTokenUsage.limit;

      // Increment the token usage
      const newTokenUsage = {
        ...currentTokenUsage,
        used: newUsedAmount,
      };

      // Update the user document
      await updateDoc(userRef, {
        tokenUsage: newTokenUsage,
        updatedAt: Date.now(),
      });

      return NextResponse.json({
        success: true,
        tokenUsage: newTokenUsage,
        limitExceeded: wouldExceedLimit,
        message: wouldExceedLimit
          ? `Added ${tokensUsed} tokens to user ${userId} - limit exceeded (${newUsedAmount}/${currentTokenUsage.limit})`
          : `Added ${tokensUsed} tokens to user ${userId}`,
      });
    } else {
      // Create new user document with token usage
      const now = Date.now();
      const newUserData = {
        userId,
        tokenUsage: {
          ...createDefaultTokenUsage(),
          used: tokensUsed,
        },
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(userRef, newUserData, { merge: true });

      return NextResponse.json({
        success: true,
        tokenUsage: newUserData.tokenUsage,
        message: `Created user profile and added ${tokensUsed} tokens`,
      });
    }
  } catch (error) {
    console.error('Error updating token usage:', error);
    return NextResponse.json(
      { error: 'Failed to update token usage' },
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

    // Get user document from Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const tokenUsage = userData.tokenUsage || createDefaultTokenUsage();

      return NextResponse.json({
        success: true,
        tokenUsage,
      });
    } else {
      // Return default token usage for new users
      return NextResponse.json({
        success: true,
        tokenUsage: createDefaultTokenUsage(),
      });
    }
  } catch (error) {
    console.error('Error fetching token usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token usage' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, tokenUsage } = await request.json();

    if (!userId || !tokenUsage) {
      return NextResponse.json(
        { error: 'User ID and token usage data are required' },
        { status: 400 }
      );
    }

    // Validate token usage structure
    if (typeof tokenUsage.used !== 'number' || typeof tokenUsage.limit !== 'number') {
      return NextResponse.json(
        { error: 'Invalid token usage data structure' },
        { status: 400 }
      );
    }

    // Get user document from Firestore
    const userRef = doc(db, 'users', userId);

    // Update the user document
    await updateDoc(userRef, {
      tokenUsage,
      updatedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      tokenUsage,
      message: 'Token usage updated successfully',
    });
  } catch (error) {
    console.error('Error updating token usage:', error);
    return NextResponse.json(
      { error: 'Failed to update token usage' },
      { status: 500 }
    );
  }
}
