"use client";

import React from 'react';
import { PiWarning, PiCalendarX, PiClock, PiArrowDown } from 'react-icons/pi';

interface DowngradeNotificationProps {
  fromPlan: string;
  toPlan: string;
  daysUntilDowngrade: number;
  downgradeDate: Date;
  reason?: 'user_initiated' | 'payment_failed' | 'cancellation';
  variant?: 'compact' | 'detailed' | 'banner';
  className?: string;
  onDismiss?: () => void;
}

function DowngradeNotification({
  fromPlan,
  toPlan,
  daysUntilDowngrade,
  downgradeDate,
  reason = 'user_initiated',
  variant = 'detailed',
  className = '',
  onDismiss
}: DowngradeNotificationProps) {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTimeText = (): string => {
    if (daysUntilDowngrade === 0) {
      return 'Today';
    } else if (daysUntilDowngrade === 1) {
      return '1 day';
    } else {
      return `${daysUntilDowngrade} days`;
    }
  };

  const getUrgencyColor = (): string => {
    if (daysUntilDowngrade <= 3) {
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    } else if (daysUntilDowngrade <= 7) {
      return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    } else {
      return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const getReasonText = (): string => {
    switch (reason) {
      case 'payment_failed':
        return 'due to payment failure';
      case 'cancellation':
        return 'due to subscription cancellation';
      case 'user_initiated':
      default:
        return 'as requested';
    }
  };

  const capitalizeFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (variant === 'banner') {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg border ${getUrgencyColor()} ${className}`}>
        <div className="flex items-center gap-3">
          <PiArrowDown className="text-lg flex-shrink-0" />
          <div className="text-sm">
            <span className="font-medium">
              {capitalizeFirst(fromPlan)} → {capitalizeFirst(toPlan)} in {getTimeText()}
            </span>
            <span className="opacity-80 ml-2">{getReasonText()}</span>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            Dismiss
          </button>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg border ${getUrgencyColor()} ${className}`}>
        <PiCalendarX className="text-sm flex-shrink-0" />
        <div className="text-xs">
          <div className="font-medium">
            Downgrading to {capitalizeFirst(toPlan)}
          </div>
          <div className="opacity-80">in {getTimeText()}</div>
        </div>
      </div>
    );
  }

  // Detailed variant (default)
  return (
    <div className={`p-4 rounded-lg border ${getUrgencyColor()} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <PiWarning className="text-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold">Subscription Downgrade Scheduled</h4>
            <div className="flex items-center gap-1 text-xs opacity-80">
              <PiClock className="text-xs" />
              <span>{getTimeText()} remaining</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium">{capitalizeFirst(fromPlan)}</span>
            <PiArrowDown className="text-sm opacity-60" />
            <span className="text-sm font-medium">{capitalizeFirst(toPlan)}</span>
          </div>

          <p className="text-xs opacity-90 mb-2">
            Your subscription will be downgraded on {formatDate(downgradeDate)} {getReasonText()}.
          </p>
          
          <div className="text-xs opacity-80">
            You'll continue to have access to {capitalizeFirst(fromPlan)} features until then.
          </div>

          {reason === 'payment_failed' && (
            <div className="mt-3 p-2 bg-white/50 dark:bg-black/20 rounded border">
              <p className="text-xs">
                <strong>Action needed:</strong> Update your payment method to prevent this downgrade.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {onDismiss && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onDismiss}
            className="text-xs opacity-60 hover:opacity-100 transition-opacity px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default DowngradeNotification;
