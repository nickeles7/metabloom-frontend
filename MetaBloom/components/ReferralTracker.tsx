"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReferralTracker, isValidAffiliateCode } from '@/lib/affiliate';

/**
 * ReferralTracker Component
 * 
 * This component automatically detects referral parameters in the URL
 * and stores them in localStorage for later attribution when the user signs up.
 * 
 * Usage: Add this component to your root layout to track all incoming referrals.
 */
export default function ReferralTrackerComponent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for referral parameter in URL
    const referralCode = searchParams.get('ref');
    
    if (referralCode && isValidAffiliateCode(referralCode)) {
      console.log(`🔗 Detected referral code in URL: ${referralCode}`);
      
      // Store the referral code for later attribution
      ReferralTracker.storeReferralCode(referralCode);
      
      // Optional: Clean up URL to remove the referral parameter
      // This prevents the referral code from being visible in the browser's address bar
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        
        // Use replaceState to update URL without triggering a page reload
        window.history.replaceState({}, '', url.toString());
      }
    } else if (referralCode) {
      console.warn(`⚠️ Invalid referral code format: ${referralCode}`);
    }
  }, [searchParams]);

  // This component doesn't render anything visible
  return null;
}

/**
 * Hook to get current referral information
 * 
 * Usage in components:
 * const { hasReferral, referralCode } = useReferralInfo();
 */
export function useReferralInfo() {
  const referralCode = ReferralTracker.getReferralCode();
  
  return {
    hasReferral: !!referralCode,
    referralCode,
    clearReferral: ReferralTracker.clearReferralCode
  };
}
