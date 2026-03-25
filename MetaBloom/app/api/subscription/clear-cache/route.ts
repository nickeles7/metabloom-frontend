import { NextRequest, NextResponse } from 'next/server';
import { subscriptionResponseCache } from '@/lib/cache/subscription-cache';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Clear the cache for this user
    subscriptionResponseCache.delete(userId);
    
    console.log(`🗑️ Cleared subscription cache for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
