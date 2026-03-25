import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateData } from '@/lib/affiliate';
import { getUserProfile, createUserProfile } from '@/lib/subscription';

// Helper function to ensure user profile exists and is properly structured
async function ensureUserProfileExists(userId: string) {
  console.log(`🔍 Ensuring user profile exists for: ${userId}`);

  let userProfile = await getUserProfile(userId);

  if (!userProfile) {
    console.log(`⚠️ User profile not found, checking Firebase Auth...`);

    // Try to get user info from Firebase Auth
    try {
      const { auth } = await import('@/lib/firebase');
      const { getAuth } = await import('firebase/auth');

      // Note: This won't work on server side, so we'll create a basic profile
      console.log(`🆕 Creating basic user profile for ${userId}`);

      // Create a basic profile - email will be updated when user logs in
      userProfile = await createUserProfile(userId, 'user@example.com');
      console.log(`✅ Created basic user profile for ${userId}`);
    } catch (error) {
      console.error(`❌ Error creating user profile:`, error);
      throw new Error('Failed to create user profile');
    }
  }

  return userProfile;
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

    console.log(`🔍 Fetching affiliate data for user: ${userId}`);

    // Try to get user profile, but handle cases where it doesn't exist
    let userProfile = await getUserProfile(userId);

    if (!userProfile) {
      console.log(`⚠️ User profile not found for ${userId}, checking subscription directly...`);

      // Try to get user data directly from Firestore
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.log(`❌ No user document found for ${userId}`);
        return NextResponse.json(
          { error: 'User not found. Please ensure you are logged in and have a valid account.' },
          { status: 404 }
        );
      }

      const userData = userDoc.data();
      console.log(`📋 Found user data:`, {
        hasSubscription: !!userData.subscription,
        planType: userData.subscription?.planType
      });

      // Check subscription directly from user data
      if (!userData.subscription || userData.subscription.planType !== 'premium') {
        return NextResponse.json({
          success: true,
          isPremium: false,
          currentPlan: userData.subscription?.planType || 'free',
          promotionalData: {
            title: 'Unlock the Affiliate Program',
            description: 'Earn 20% commission on every successful referral with Premium!',
            benefits: [
              'Earn $2 for every Standard subscription referral',
              'Earn $4 for every Premium subscription referral',
              'Get your unique affiliate link and tracking dashboard',
              'Real-time analytics and commission tracking',
              'Monthly payouts via PayPal or bank transfer'
            ],
            upgradeUrl: '/upgrade-plan'
          }
        });
      }
    } else {
      // Check if user has Premium subscription
      if (userProfile.subscription.planType !== 'premium') {
        return NextResponse.json({
          success: true,
          isPremium: false,
          currentPlan: userProfile.subscription.planType,
          promotionalData: {
            title: 'Unlock the Affiliate Program',
            description: 'Earn 20% commission on every successful referral with Premium!',
            benefits: [
              'Earn $2 for every Standard subscription referral',
              'Earn $4 for every Premium subscription referral',
              'Get your unique affiliate link and tracking dashboard',
              'Real-time analytics and commission tracking',
              'Monthly payouts via PayPal or bank transfer'
            ],
            upgradeUrl: '/upgrade-plan'
          }
        });
      }
    }

    // Get affiliate data
    let affiliateData = await getAffiliateData(userId);

    // If no affiliate data exists for Premium user, create it automatically
    if (!affiliateData) {
      console.log(`🎯 No affiliate data found for Premium user ${userId}, creating automatically...`);
      try {
        const { createAffiliateData } = await import('@/lib/affiliate');
        affiliateData = await createAffiliateData(userId);
        console.log(`✅ Affiliate data created successfully for user ${userId}`);
      } catch (createError) {
        console.error('❌ Error creating affiliate data:', createError);
        return NextResponse.json(
          { error: 'Failed to create affiliate data automatically. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      isPremium: true,
      affiliateData,
    });
  } catch (error) {
    console.error('Error fetching affiliate data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affiliate data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Creating affiliate data for user: ${userId}`);

    // Try to get user profile, but handle cases where it doesn't exist
    let userProfile = await getUserProfile(userId);

    if (!userProfile) {
      console.log(`⚠️ User profile not found for ${userId}, checking subscription directly...`);

      // Try to get user data directly from Firestore
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.log(`❌ No user document found for ${userId}`);
        return NextResponse.json(
          { error: 'User not found. Please ensure you are logged in and have a valid account.' },
          { status: 404 }
        );
      }

      const userData = userDoc.data();
      console.log(`📋 Found user data:`, {
        hasSubscription: !!userData.subscription,
        planType: userData.subscription?.planType
      });

      // Check subscription directly from user data
      if (!userData.subscription || userData.subscription.planType !== 'premium') {
        return NextResponse.json(
          { error: 'Premium subscription required to create affiliate data' },
          { status: 403 }
        );
      }
    } else {
      // Check if user has Premium subscription
      if (userProfile.subscription.planType !== 'premium') {
        return NextResponse.json(
          { error: 'Premium subscription required to create affiliate data' },
          { status: 403 }
        );
      }
    }

    // Check if affiliate data already exists
    const existingAffiliateData = await getAffiliateData(userId);
    
    if (existingAffiliateData) {
      return NextResponse.json({
        success: true,
        message: 'Affiliate data already exists',
        affiliateData: existingAffiliateData,
      });
    }

    // Create affiliate data (this should normally be done automatically when upgrading to Premium)
    const { createAffiliateData } = await import('@/lib/affiliate');
    const newAffiliateData = await createAffiliateData(userId);

    return NextResponse.json({
      success: true,
      message: 'Affiliate data created successfully',
      affiliateData: newAffiliateData,
    });
  } catch (error) {
    console.error('Error creating affiliate data:', error);
    return NextResponse.json(
      { error: 'Failed to create affiliate data' },
      { status: 500 }
    );
  }
}
