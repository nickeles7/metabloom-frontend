"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import AffiliateDashboard from '@/components/affiliate/AffiliateDashboard';
import { AffiliateData } from '@/lib/subscription';
import { PiSpinner, PiLock, PiCrown, PiUsers, PiCheckCircle, PiCurrencyDollar, PiEye } from 'react-icons/pi';

interface PromotionalData {
  title: string;
  description: string;
  benefits: string[];
  upgradeUrl: string;
}

export default function AffiliatePage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [promotionalData, setPromotionalData] = useState<PromotionalData | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/home');
      return;
    }

    if (user?.uid) {
      fetchAffiliateData();
    }
  }, [isAuthenticated, user?.uid, router]);

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/affiliate/data?userId=${user?.uid}`);
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError('no_data');
        } else {
          setError(result.error || 'Failed to load affiliate data');
        }
        return;
      }

      // Handle new response structure
      setIsPremium(result.isPremium);

      if (result.isPremium) {
        setAffiliateData(result.affiliateData);
      } else {
        setPromotionalData(result.promotionalData);
      }
    } catch (err) {
      console.error('Error fetching affiliate data:', err);
      setError('Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <PiLock className="text-4xl text-n400 dark:text-n500 mx-auto mb-4" />
          <p className="text-n600 dark:text-n200">Please sign in to access the affiliate program.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <PiSpinner className="text-4xl text-primaryColor animate-spin mx-auto mb-4" />
          <p className="text-n600 dark:text-n200">Loading affiliate data...</p>
        </div>
      </div>
    );
  }

  // Show promotional view for non-Premium users
  if (!isPremium && promotionalData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primaryColor/10 px-4 py-2 rounded-full mb-4">
            <PiUsers className="text-primaryColor" />
            <span className="text-sm font-semibold text-primaryColor">Affiliate Program</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-n800 dark:text-n50 mb-4">
            {promotionalData.title}
          </h1>
          <p className="text-lg text-n700 dark:text-n100 max-w-2xl mx-auto font-medium">
            {promotionalData.description}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-n0 rounded-2xl p-6 border border-gray-200 dark:border-n600 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primaryColor p-3 rounded-xl text-white">
                <PiCurrencyDollar className="text-2xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-n800 dark:text-n50">Earn Commission</h3>
                <p className="text-sm text-n700 dark:text-n200 font-medium">20% on every referral</p>
              </div>
            </div>
            <ul className="space-y-2">
              {promotionalData.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-n700 dark:text-n200 font-medium">
                  <PiCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-primaryColor/5 rounded-2xl p-6 border border-primaryColor/20 shadow-lg">
            <div className="text-center">
              <div className="bg-primaryColor p-4 rounded-2xl text-white inline-flex items-center justify-center mb-4">
                <PiCrown className="text-3xl" />
              </div>
              <h3 className="text-xl font-bold text-n800 dark:text-n50 mb-2">Premium Required</h3>
              <p className="text-sm text-n700 dark:text-n200 mb-6 font-medium">
                Upgrade to Premium to unlock the affiliate program and start earning commissions today!
              </p>
              <button
                onClick={() => router.push(promotionalData.upgradeUrl)}
                className="inline-flex items-center gap-2 bg-primaryColor text-white px-6 py-3 rounded-xl font-semibold hover:bg-primaryColor/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <PiCrown className="text-lg" />
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>

        {/* Preview Dashboard */}
        <div className="bg-white dark:bg-n0 rounded-2xl p-6 border border-gray-200 dark:border-n600 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gray-100/30 dark:bg-n100/30"></div>
          <div className="relative">
            <h3 className="text-xl font-bold text-n800 dark:text-n50 mb-4 text-center">
              Preview: Your Affiliate Dashboard
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-60">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200/50">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 p-2 rounded-lg">
                    <PiUsers className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-700">Total Referrals</p>
                    <p className="text-2xl font-bold text-emerald-800">12</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200/50">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <PiEye className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700">Link Visits</p>
                    <p className="text-2xl font-bold text-blue-800">247</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200/50">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <PiCurrencyDollar className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-700">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-800">$48</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => router.push(promotionalData.upgradeUrl)}
                className="bg-white/90 dark:bg-n0/90 backdrop-blur-sm px-4 py-2 rounded-full border border-primaryColor/30 hover:bg-primaryColor hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span className="text-sm font-semibold text-primaryColor hover:text-white">Unlock with Premium</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'no_data') {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <p className="text-n600 dark:text-n200 mb-4">
            No affiliate data found. This should be created automatically for Premium users.
          </p>
          <button
            onClick={fetchAffiliateData}
            className="bg-primaryColor text-white px-4 py-2 rounded-lg hover:bg-primaryColor/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAffiliateData}
            className="bg-primaryColor text-white px-4 py-2 rounded-lg hover:bg-primaryColor/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-n600 dark:text-n200">No affiliate data available.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <AffiliateDashboard affiliateData={affiliateData} />
    </div>
  );
}
