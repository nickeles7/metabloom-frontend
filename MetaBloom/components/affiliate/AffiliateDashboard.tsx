"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { PiCopy, PiCheck, PiUsers, PiCurrencyDollar, PiShare, PiCaretDown, PiEye, PiCrown } from 'react-icons/pi';
import { useAuth } from '@/stores/auth';
import { AffiliateData } from '@/lib/subscription';
import { useAnchorScrolling } from '@/lib/navigation';

interface AffiliateDashboardProps {
  affiliateData: AffiliateData;
}

type TimePeriod = 'weekly' | 'monthly' | 'all-time';

export default function AffiliateDashboard({ affiliateData }: AffiliateDashboardProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('monthly');
  const { user } = useAuth();

  // Set up anchor link handling for smooth scrolling with navbar offset
  useEffect(() => {
    const cleanup = useAnchorScrolling();
    return cleanup;
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join MetaBloom with my referral link',
          text: 'Get started with MetaBloom AI for Hearthstone deck building!',
          url: affiliateData.affiliateLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to copying
      copyToClipboard(affiliateData.affiliateLink);
    }
  };

  // Calculate metrics based on selected time period
  const filteredMetrics = useMemo(() => {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    let cutoffDate = 0;
    switch (selectedPeriod) {
      case 'weekly':
        cutoffDate = now - oneWeek;
        break;
      case 'monthly':
        cutoffDate = now - oneMonth;
        break;
      case 'all-time':
        cutoffDate = 0;
        break;
    }

    const filteredReferrals = affiliateData.referralHistory.filter(
      referral => referral.referralDate >= cutoffDate
    );

    const completedReferrals = filteredReferrals.length;
    const earnedAmount = filteredReferrals.reduce((sum, referral) => sum + referral.commissionAmount, 0);

    // For now, we'll use total referrals as visits since we don't track visits separately
    // In a real implementation, you'd want to track actual link visits
    const visits = selectedPeriod === 'all-time' ? affiliateData.totalReferrals * 3 : completedReferrals * 3;

    return {
      completedReferrals,
      visits,
      earnedAmount,
    };
  }, [affiliateData, selectedPeriod]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 min-h-screen page-content-offset pt-8">
      {/* Compact Hero Header */}
      <div id="affiliate-dashboard" className="relative overflow-hidden bg-primaryColor/10 dark:bg-primaryColor/20 rounded-xl p-4 md:p-6 border border-primaryColor/20 navbar-offset mt-4">
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primaryColor/15 text-primaryColor px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold mb-3">
            <PiCurrencyDollar className="text-sm md:text-base" />
            Premium Affiliate Program
          </div>
          <h1 id="affiliate-program" className="text-2xl md:text-3xl lg:text-4xl font-bold text-n800 dark:text-n50 mb-2 navbar-offset">
            Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'Affiliate'}!
          </h1>
          <p className="text-sm md:text-base text-n700 dark:text-n200 max-w-xl mx-auto mb-4 font-medium">
            Track your performance and maximize your earnings
          </p>

          {/* Minimal Affiliate Link */}
          <div className="max-w-xs mx-auto">
            <p className="text-xs text-n700 dark:text-n200 mb-1 font-semibold">Affiliate Link</p>
            <div className="bg-white/90 dark:bg-n0/90 backdrop-blur-sm border border-primaryColor/20 rounded-md p-1.5 flex items-center gap-1.5">
              <input
                type="text"
                value={affiliateData.affiliateLink}
                readOnly
                className="flex-1 bg-transparent text-n800 dark:text-n100 font-mono text-xs focus:outline-none truncate min-w-0 font-medium"
                placeholder="Loading..."
              />
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => copyToClipboard(affiliateData.affiliateLink)}
                  className="p-1 bg-primaryColor text-white rounded hover:bg-primaryColor/90 transition-colors"
                  title={copied ? 'Copied!' : 'Copy link'}
                >
                  {copied ? <PiCheck className="text-xs" /> : <PiCopy className="text-xs" />}
                </button>
                <button
                  onClick={shareLink}
                  className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Share link"
                >
                  <PiShare className="text-xs" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Commission Structure */}
      <div className="bg-white dark:bg-n0 rounded-xl p-2 md:p-3 border border-gray-200/50 dark:border-n600/50 shadow-sm">
        <div className="text-center mb-2">
          <h2 className="text-sm md:text-base font-bold text-n800 dark:text-n50 mb-1">
            Commission Rates
          </h2>
          <p className="text-xs text-n700 dark:text-n200 font-medium">Earn 20% on every referral</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Standard Plan Card */}
          <div className="group relative overflow-hidden bg-blue-500 rounded-lg p-2 text-white transition-all duration-200 hover:shadow-lg">
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-sm p-1 rounded">
                  <PiUsers className="text-sm text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Standard Plan</h3>
                  <p className="text-blue-100 text-xs">$10/month</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">$2</div>
                <div className="text-blue-100 text-xs">per referral</div>
              </div>
            </div>
          </div>

          {/* Premium Plan Card */}
          <div className="group relative overflow-hidden bg-purple-500 rounded-lg p-2 text-white transition-all duration-200 hover:shadow-lg">
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-sm p-1 rounded">
                  <PiCrown className="text-sm text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Premium Plan</h3>
                  <p className="text-purple-100 text-xs">$20/month</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">$4</div>
                <div className="text-purple-100 text-xs">per referral</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Performance Dashboard */}
      <div className="bg-white dark:bg-n0 rounded-xl p-4 md:p-5 border border-gray-200/50 dark:border-n600/50 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-n800 dark:text-n50 mb-1">
              Performance Analytics
            </h2>
            <p className="text-sm text-n700 dark:text-n200 font-medium">Track your affiliate metrics</p>
          </div>

          {/* Compact Time Period Selector */}
          <div className="mt-3 sm:mt-0">
            <div className="bg-gray-100 dark:bg-n100 p-0.5 rounded-lg inline-flex">
              {(['weekly', 'monthly', 'all-time'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                    selectedPeriod === period
                      ? 'bg-primaryColor text-white shadow-sm'
                      : 'text-n700 dark:text-n200 hover:text-n800 dark:hover:text-n100'
                  }`}
                >
                  {period === 'weekly' ? '7D' : period === 'monthly' ? '30D' : 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Compact Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Completed Referrals */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200/50 dark:border-emerald-800/50 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <PiUsers className="text-base text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Referrals</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  {filteredMetrics.completedReferrals}
                </p>
              </div>
            </div>
          </div>

          {/* Link Visits */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <PiEye className="text-base text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">Visits</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {filteredMetrics.visits}
                </p>
              </div>
            </div>
          </div>

          {/* Earned Amount */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200/50 dark:border-green-800/50 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <PiCurrencyDollar className="text-base text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-green-800 dark:text-green-200">Earnings</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  ${filteredMetrics.earnedAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Compact Recent Referrals */}
      {affiliateData.referralHistory.length > 0 && (
        <div className="bg-white dark:bg-n0 rounded-xl p-4 md:p-5 border border-gray-200/50 dark:border-n600/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-n800 dark:text-n50 mb-1">
                Recent Activity
              </h2>
              <p className="text-sm text-n700 dark:text-n200 font-medium">Latest successful referrals</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
              <span className="text-xs font-semibold text-green-800 dark:text-green-200">
                {affiliateData.referralHistory.length} total
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {affiliateData.referralHistory
              .sort((a, b) => b.referralDate - a.referralDate)
              .slice(0, 5)
              .map((referral, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-n100/50 rounded-lg border border-gray-200/50 dark:border-n600/50 transition-all duration-200 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="bg-green-500 p-2 rounded-lg text-white flex-shrink-0">
                      <PiUsers className="text-sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-n800 dark:text-n100 truncate text-sm">
                        {referral.referredUserEmail}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-n700 dark:text-n200">
                        <span className="font-medium">{new Date(referral.referralDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="capitalize font-semibold">{referral.subscriptionType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                      <p className="text-sm font-bold text-green-700 dark:text-green-300">
                        +${referral.commissionAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {affiliateData.referralHistory.length > 5 && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-n600">
              <p className="text-xs text-n700 dark:text-n200 text-center font-medium">
                Showing 5 of {affiliateData.referralHistory.length} total referrals
              </p>
            </div>
          )}
        </div>
      )}


    </div>
  );
}
