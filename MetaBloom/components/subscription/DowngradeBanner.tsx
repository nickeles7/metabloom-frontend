"use client";

import React, { useState } from 'react';
import { PiWarning, PiX, PiCreditCard, PiArrowDown, PiCalendar } from 'react-icons/pi';
import { useUserSubscription } from '@/hooks/useUserSubscription';

interface DowngradeBannerProps {
  className?: string;
  showUpgradeButton?: boolean;
  onUpgradeClick?: () => void;
}

function DowngradeBanner({ 
  className = '', 
  showUpgradeButton = true,
  onUpgradeClick 
}: DowngradeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const {
    hasPendingDowngrade,
    getPendingDowngrade,
    getDaysUntilDowngrade,
    getDowngradeDate,
    getDowngradeMessage
  } = useUserSubscription();

  // Don't show if no pending downgrade or if dismissed
  if (!hasPendingDowngrade() || isDismissed) {
    return null;
  }

  const pendingDowngrade = getPendingDowngrade();
  const daysUntil = getDaysUntilDowngrade();
  const downgradeDate = getDowngradeDate();
  const message = getDowngradeMessage();

  if (!pendingDowngrade || !downgradeDate) {
    return null;
  }

  const getUrgencyLevel = (): 'high' | 'medium' | 'low' => {
    if (daysUntil <= 3) return 'high';
    if (daysUntil <= 7) return 'medium';
    return 'low';
  };

  const getUrgencyStyles = () => {
    const urgency = getUrgencyLevel();
    switch (urgency) {
      case 'high':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'medium':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200';
      case 'low':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const capitalizeFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Default behavior - could open upgrade modal
      console.log('Upgrade clicked - implement upgrade flow');
    }
  };

  return (
    <div className={`relative p-4 rounded-lg border-2 ${getUrgencyStyles()} ${className}`}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
        aria-label="Dismiss notification"
      >
        <PiX className="text-lg opacity-60 hover:opacity-100" />
      </button>

      <div className="pr-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0">
            <PiWarning className="text-2xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Subscription Downgrade Scheduled</h3>
            <p className="text-sm opacity-80">{message}</p>
          </div>
        </div>

        {/* Downgrade details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Current → New Plan */}
          <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <div className="text-center">
              <div className="text-sm font-medium">{capitalizeFirst(pendingDowngrade.fromPlan)}</div>
              <div className="text-xs opacity-60">Current</div>
            </div>
            <PiArrowDown className="text-lg opacity-60" />
            <div className="text-center">
              <div className="text-sm font-medium">{capitalizeFirst(pendingDowngrade.toPlan)}</div>
              <div className="text-xs opacity-60">After {formatDate(downgradeDate)}</div>
            </div>
          </div>

          {/* Time remaining */}
          <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <PiCalendar className="text-lg opacity-60" />
            <div>
              <div className="text-sm font-medium">
                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? '1 day' : `${daysUntil} days`}
              </div>
              <div className="text-xs opacity-60">Remaining</div>
            </div>
          </div>

          {/* Reason */}
          <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <PiCreditCard className="text-lg opacity-60" />
            <div>
              <div className="text-sm font-medium">
                {pendingDowngrade.reason === 'payment_failed' ? 'Payment Failed' :
                 pendingDowngrade.reason === 'cancellation' ? 'Cancelled' : 'User Request'}
              </div>
              <div className="text-xs opacity-60">Reason</div>
            </div>
          </div>
        </div>

        {/* Action message */}
        <div className="mb-4">
          <p className="text-sm">
            <strong>What this means:</strong> You'll continue to have access to all {capitalizeFirst(pendingDowngrade.fromPlan)} features 
            until {formatDate(downgradeDate)}. After that, your account will be moved to the {capitalizeFirst(pendingDowngrade.toPlan)} plan.
          </p>
          
          {pendingDowngrade.reason === 'payment_failed' && (
            <p className="text-sm mt-2 p-2 bg-white/70 dark:bg-black/30 rounded border">
              <strong>Action needed:</strong> Update your payment method to prevent this downgrade and maintain your current features.
            </p>
          )}
        </div>

        {/* Action buttons */}
        {showUpgradeButton && (
          <div className="flex gap-3">
            {pendingDowngrade.reason === 'payment_failed' && (
              <button
                onClick={handleUpgradeClick}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Update Payment Method
              </button>
            )}
            
            {pendingDowngrade.reason === 'user_initiated' && (
              <button
                onClick={handleUpgradeClick}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Reactivate Subscription
              </button>
            )}
            
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DowngradeBanner;
