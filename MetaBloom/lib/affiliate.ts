import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfile, AffiliateData } from '@/lib/subscription';

/**
 * Affiliate System Core Functions
 * 
 * This module handles all affiliate-related functionality including:
 * - Affiliate code generation and validation
 * - Commission calculations
 * - Referral tracking and attribution
 * - Earnings management
 */

// Commission rates (20% of subscription price)
const COMMISSION_RATES = {
  standard: 2.00, // $2 for $10/month plan
  premium: 4.00,  // $4 for $20/month plan
} as const;

/**
 * Generate a unique affiliate code for a user
 * Format: 12-character alphanumeric string (e.g., "ABC123DEF456")
 */
export function generateAffiliateCode(userId: string): string {
  const timestamp = Date.now().toString(36);
  const userHash = userId.slice(-4).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${userHash}${timestamp}${randomPart}`.substring(0, 12);
}

/**
 * Validate affiliate code format
 */
export function isValidAffiliateCode(code: string): boolean {
  return /^[A-Z0-9]{12}$/.test(code);
}

/**
 * Calculate commission amount based on subscription type
 */
export function calculateCommission(subscriptionType: 'standard' | 'premium'): number {
  return COMMISSION_RATES[subscriptionType] || 0;
}

/**
 * Create affiliate data for a Premium user
 */
export async function createAffiliateData(userId: string): Promise<AffiliateData> {
  const affiliateCode = generateAffiliateCode(userId);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://metabloom.io';
  const affiliateLink = `${baseUrl}?ref=${affiliateCode}`;

  const affiliateData: AffiliateData = {
    affiliateCode,
    affiliateLink,
    totalEarnings: 0,
    totalReferrals: 0,
    referralHistory: [],
  };

  // Update user document with affiliate data
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    affiliateData,
    updatedAt: Date.now(),
  });

  console.log(`🎯 Created affiliate data for user ${userId}: ${affiliateCode}`);
  return affiliateData;
}

/**
 * Get affiliate data for a user
 */
export async function getAffiliateData(userId: string): Promise<AffiliateData | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data() as UserProfile;
    const affiliateData = userData.affiliateData;

    // Check if affiliate link needs to be updated to correct domain
    if (affiliateData && affiliateData.affiliateLink.includes('metabloom.com')) {
      console.log(`🔄 Updating affiliate link domain for user ${userId}`);
      const updatedAffiliateData = await updateAffiliateLinkDomain(userId, affiliateData);
      return updatedAffiliateData;
    }

    return affiliateData || null;
  } catch (error) {
    console.error('Error getting affiliate data:', error);
    return null;
  }
}

/**
 * Update affiliate link domain for existing users
 */
export async function updateAffiliateLinkDomain(userId: string, currentAffiliateData: AffiliateData): Promise<AffiliateData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://metabloom.io';
    const updatedAffiliateLink = `${baseUrl}?ref=${currentAffiliateData.affiliateCode}`;

    const updatedAffiliateData: AffiliateData = {
      ...currentAffiliateData,
      affiliateLink: updatedAffiliateLink,
    };

    // Update user document with corrected affiliate link
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      affiliateData: updatedAffiliateData,
      updatedAt: Date.now(),
    });

    console.log(`✅ Updated affiliate link domain for user ${userId}: ${updatedAffiliateLink}`);
    return updatedAffiliateData;
  } catch (error) {
    console.error('❌ Error updating affiliate link domain:', error);
    throw error;
  }
}

/**
 * Find user by affiliate code
 */
export async function findUserByAffiliateCode(affiliateCode: string): Promise<string | null> {
  try {
    console.log(`🔍 Looking up user by affiliate code: ${affiliateCode}`);

    // For now, we'll use a simple query approach
    // In production, you'd want to create a separate collection for affiliate codes for better performance
    const { collection, query, where, getDocs } = await import('firebase/firestore');

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('affiliateData.affiliateCode', '==', affiliateCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`❌ No user found with affiliate code: ${affiliateCode}`);
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;

    console.log(`✅ Found user ${userId} with affiliate code: ${affiliateCode}`);
    return userId;
  } catch (error) {
    console.error('Error finding user by affiliate code:', error);
    return null;
  }
}

/**
 * Add referral earnings to an affiliate's account
 */
export async function addReferralEarnings(
  affiliateCode: string,
  referredUserId: string,
  referredUserEmail: string,
  subscriptionType: 'standard' | 'premium'
): Promise<void> {
  console.log(`💰 Processing referral earnings for affiliate code: ${affiliateCode}`);
  
  // Find the referrer by affiliate code
  const referrerId = await findUserByAffiliateCode(affiliateCode);
  
  if (!referrerId) {
    console.error(`❌ No user found with affiliate code: ${affiliateCode}`);
    return;
  }
  
  try {
    const userRef = doc(db, 'users', referrerId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error(`❌ Referrer user not found: ${referrerId}`);
      return;
    }

    const userData = userSnap.data() as UserProfile;
    const currentAffiliateData = userData.affiliateData;

    if (!currentAffiliateData) {
      console.error(`❌ No affiliate data found for user: ${referrerId}`);
      return;
    }

    const commissionAmount = calculateCommission(subscriptionType);
    const now = Date.now();

    const newReferral = {
      referredUserId,
      referredUserEmail,
      subscriptionType,
      commissionAmount,
      referralDate: now,
    };

    const updatedAffiliateData: AffiliateData = {
      ...currentAffiliateData,
      totalEarnings: currentAffiliateData.totalEarnings + commissionAmount,
      totalReferrals: currentAffiliateData.totalReferrals + 1,
      referralHistory: [...currentAffiliateData.referralHistory, newReferral],
    };

    await updateDoc(userRef, {
      affiliateData: updatedAffiliateData,
      updatedAt: now,
    });

    console.log(`✅ Added $${commissionAmount} commission to affiliate ${affiliateCode}`);
    console.log(`📊 Total earnings: $${updatedAffiliateData.totalEarnings}, Total referrals: ${updatedAffiliateData.totalReferrals}`);
  } catch (error) {
    console.error('❌ Error adding referral earnings:', error);
    throw error;
  }
}

// Referral tracking utilities for client-side
export const ReferralTracker = {
  // Store referral code in localStorage when user visits with ?ref= parameter
  storeReferralCode: (affiliateCode: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('referralCode', affiliateCode);
      localStorage.setItem('referralTimestamp', Date.now().toString());
      console.log(`📝 Stored referral code: ${affiliateCode}`);
    }
  },

  // Get stored referral code (with 30-day expiration)
  getReferralCode: (): string | null => {
    if (typeof window === 'undefined') return null;

    const referralCode = localStorage.getItem('referralCode');
    const timestamp = localStorage.getItem('referralTimestamp');

    if (!referralCode || !timestamp) return null;

    // Check if referral code is expired (30 days)
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - parseInt(timestamp) > thirtyDaysInMs;

    if (isExpired) {
      ReferralTracker.clearReferralCode();
      return null;
    }

    return referralCode;
  },

  // Clear stored referral code
  clearReferralCode: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('referralCode');
      localStorage.removeItem('referralTimestamp');
      console.log('🗑️ Cleared stored referral code');
    }
  },
};
