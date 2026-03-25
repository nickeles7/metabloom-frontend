"use client";

import React from 'react';
import { PiWarning, PiCalendarX, PiClock } from 'react-icons/pi';

interface CancellationStatusIndicatorProps {
  daysUntilCancellation: number;
  cancellationDate: Date;
  currentPlan: string;
  targetPlan: string;
  variant?: 'compact' | 'detailed' | 'badge';
  className?: string;
}

function CancellationStatusIndicator({
  daysUntilCancellation,
  cancellationDate,
  currentPlan,
  targetPlan,
  variant = 'detailed',
  className = ''
}: CancellationStatusIndicatorProps) {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTimeText = (): string => {
    if (daysUntilCancellation === 0) {
      return 'Today';
    } else if (daysUntilCancellation === 1) {
      return '1 day';
    } else {
      return `${daysUntilCancellation} days`;
    }
  };

  const getUrgencyColor = (): string => {
    if (daysUntilCancellation <= 3) {
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    } else if (daysUntilCancellation <= 7) {
      return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    } else {
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
  };

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor()} ${className}`}>
        <PiWarning className="text-xs" />
        <span>Canceling in {getTimeText()}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg border ${getUrgencyColor()} ${className}`}>
        <PiCalendarX className="text-sm flex-shrink-0" />
        <div className="text-xs">
          <div className="font-medium">Downgrading to {targetPlan}</div>
          <div className="opacity-80">in {getTimeText()}</div>
        </div>
      </div>
    );
  }

  // Detailed variant (default)
  return (
    <div className={`p-3 rounded-lg border ${getUrgencyColor()} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <PiWarning className="text-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold">Subscription Ending</h4>
            <div className="flex items-center gap-1 text-xs opacity-80">
              <PiClock className="text-xs" />
              <span>{getTimeText()} remaining</span>
            </div>
          </div>
          <p className="text-xs opacity-90 mb-2">
            Your {currentPlan} plan will end on {formatDate(cancellationDate)}. 
            You'll be automatically moved to the {targetPlan} plan.
          </p>
          <div className="text-xs opacity-80">
            You'll continue to have access to {currentPlan} features until then.
          </div>
        </div>
      </div>
    </div>
  );
}

export default CancellationStatusIndicator;
