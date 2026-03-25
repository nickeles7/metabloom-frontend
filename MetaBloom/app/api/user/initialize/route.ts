import { NextRequest, NextResponse } from 'next/server';
import { createUserProfile, getUserProfile, updateEmailVerificationStatus } from '@/lib/subscription';
import { isValidAffiliateCode } from '@/lib/affiliate';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, displayName, referralCode, emailVerified } = await request.json();
    const isDebug = process.env.NODE_ENV === 'development';

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    if (isDebug) {
      console.log(`🔄 Initializing user profile for: ${userId}`);
      if (referralCode) {
        console.log(`🔗 Referral code provided: ${referralCode}`);
      }
    }

    // Check if user profile already exists
    const existingProfile = await getUserProfile(userId);

    if (existingProfile) {
      if (isDebug) {
        console.log('✅ User profile already exists');
      }

      // Update email verification status if provided and different
      if (emailVerified !== undefined && existingProfile.emailVerified !== emailVerified) {
        try {
          await updateEmailVerificationStatus(userId, emailVerified);
          existingProfile.emailVerified = emailVerified;
          if (isDebug) {
            console.log(`📧 Updated email verification status to: ${emailVerified}`);
          }
        } catch (error) {
          console.error('❌ Error updating email verification status:', error);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'User profile already exists',
        profile: existingProfile,
        referralAttributed: false,
      });
    }

    // Create new user profile
    const newProfile = await createUserProfile(userId, email, displayName);

    // Handle referral attribution if referral code is provided
    let referralAttributed = false;
    if (referralCode && isValidAffiliateCode(referralCode)) {
      try {
        if (isDebug) {
          console.log(`📝 Attributing referral code: ${referralCode}`);
        }

        // Update user profile with referral code
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          referredBy: referralCode,
          updatedAt: Date.now(),
        });

        referralAttributed = true;
        if (isDebug) {
          console.log('✅ Referral code successfully attributed');
        }
      } catch (referralError) {
        console.error('❌ Error attributing referral code:', referralError);
        // Don't fail user creation if referral attribution fails
      }
    } else if (referralCode && isDebug) {
      console.warn(`⚠️ Invalid referral code format: ${referralCode}`);
    }

    return NextResponse.json({
      success: true,
      message: 'User profile created successfully',
      profile: newProfile,
      referralAttributed,
    });
  } catch (error) {
    console.error('Error initializing user profile:', error);
    return NextResponse.json(
      { error: 'Failed to initialize user profile' },
      { status: 500 }
    );
  }
}
