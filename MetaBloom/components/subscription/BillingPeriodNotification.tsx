"use client";

import React from 'react';
import { PiCalendar, PiClock, PiWarning, PiInfo } from 'react-icons/pi';
import { useUserSubscription } from '@/hooks/useUserSubscription';

interface BillingPeriodNotificationProps {
  variant?: 'compact' | 'detailed' | 'banner';
  className?: string;
  showOnlyIfEndingSoon?: boolean;
}

function BillingPeriodNotification({
  variant = 'detailed',
  className = '',
  showOnlyIfEndingSoon = false
}: BillingPeriodNotificationProps) {
  const {
    hasActiveSubscription,
    currentPlan,
    getPlanDisplayName,
    getCurrentPeriodEnd,
    getDaysUntilPeriodEnd,
    getBillingPeriodMessage,
    willDowngradeAtPeriodEnd
  } = useUserSubscription();

  // Don't show for free plans
  if (!hasActiveSubscription || currentPlan === 'free') {
    return null;
  }

  const periodEnd = getCurrentPeriodEnd();
  const daysUntil = getDaysUntilPeriodEnd();
  const message = getBillingPeriodMessage();
  const willDowngrade = willDowngradeAtPeriodEnd();

  // Don't show if no period end date
  if (!periodEnd || !message) {
    return null;
  }

  // If showOnlyIfEndingSoon is true, only show if ending within 7 days OR if subscription is canceled/downgraded
  if (showOnlyIfEndingSoon && daysUntil > 7 && !willDowngrade) {
    return null;
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUrgencyColor = (): string => {
    if (willDowngrade) {
      if (daysUntil <= 3) {
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      } else if (daysUntil <= 7) {
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      }
    }
    
    if (daysUntil <= 3) {
      return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
    
    return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
  };

  const getIcon = () => {
    if (willDowngrade) return PiWarning;
    if (daysUntil <= 7) return PiClock;
    return PiInfo;
  };

  const planName = getPlanDisplayName();

  if (variant === 'banner') {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg border ${getUrgencyColor()} ${className}`}>
        <div className="flex items-center gap-3">
          {React.createElement(getIcon(), { className: "text-lg flex-shrink-0" })}
          <div className="text-sm">
            <span className="font-medium">{message}</span>
            {willDowngrade && (
              <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                (Subscription canceled - will downgrade to Free plan)
              </span>
            )}
          </div>
        </div>
        <div className="text-xs opacity-60">
          {formatDate(periodEnd)}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg border ${getUrgencyColor()} ${className}`}>
        {React.createElement(getIcon(), { className: "text-sm flex-shrink-0" })}
        <div className="text-xs">
          <div className="font-medium">
            {daysUntil === 0 ? 'Ends today' : daysUntil === 1 ? 'Ends in 1 day' : `Ends in ${daysUntil} days`}
            {willDowngrade && (
              <span className="ml-1 text-red-600 dark:text-red-400">(Canceled)</span>
            )}
          </div>
          <div className="opacity-80">{formatDate(periodEnd)}</div>
        </div>
      </div>
    );
  }

  // Detailed variant (default)
  return (
    <div className={`p-4 rounded-lg border ${getUrgencyColor()} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {React.createElement(getIcon(), { className: "text-lg" })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold">
              {willDowngrade ? 'Subscription Ending' : 'Current Billing Period'}
            </h4>
            <div className="flex items-center gap-1 text-xs opacity-80">
              <PiClock className="text-xs" />
              <span>
                {daysUntil === 0 ? 'Ends today' : 
                 daysUntil === 1 ? 'Ends in 1 day' : 
                 `${daysUntil} days remaining`}
              </span>
            </div>
          </div>
          
          <p className="text-xs opacity-90 mb-2">
            Your {planName} plan billing period ends on {formatDate(periodEnd)}.
          </p>

          {willDowngrade ? (
            <div className="text-xs">
              <p className="font-medium text-red-600 dark:text-red-400 mb-1">
                ⚠️ Your subscription has been canceled and will not renew.
              </p>
              <p className="font-medium text-orange-600 dark:text-orange-400 mb-1">
                You'll be automatically moved to the Free plan on {formatDate(periodEnd)}.
              </p>
              <p className="opacity-80">
                You'll continue to have access to all {planName} features until your billing period ends.
              </p>
            </div>
          ) : (
            <div className="text-xs opacity-80">
              Your subscription will automatically renew for another billing period.
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs">
            <PiCalendar className="opacity-60" />
            <span className="opacity-80">
              Billing period: {formatDate(periodEnd)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillingPeriodNotification;
