"use client";

import React from 'react';
import { PiClock } from 'react-icons/pi';
import { useUserSubscription } from '@/hooks/useUserSubscription';

interface CancellationNoteProps {
  className?: string;
}

function CancellationNote({ className = '' }: CancellationNoteProps) {
  const {
    hasActiveSubscription,
    currentPlan,
    getCurrentPeriodEnd,
    getDaysUntilPeriodEnd,
    willDowngradeAtPeriodEnd
  } = useUserSubscription();

  // Only show for active subscriptions that are canceled/scheduled for downgrade
  if (!hasActiveSubscription || currentPlan === 'free' || !willDowngradeAtPeriodEnd()) {
    return null;
  }

  const periodEnd = getCurrentPeriodEnd();
  const daysUntil = getDaysUntilPeriodEnd();

  if (!periodEnd) {
    return null;
  }

  const getTimeText = (): string => {
    if (daysUntil === 0) {
      return 'Ends today';
    } else if (daysUntil === 1) {
      return '1 day remaining';
    } else {
      return `${daysUntil} days remaining`;
    }
  };

  const getTextColor = (): string => {
    if (daysUntil <= 3) {
      return 'text-red-600 dark:text-red-400';
    } else if (daysUntil <= 7) {
      return 'text-orange-600 dark:text-orange-400';
    } else {
      return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  return (
    <div className={`flex items-center gap-1 text-xs ${getTextColor()} ${className}`}>
      <PiClock className="text-xs" />
      <span>{getTimeText()}</span>
    </div>
  );
}

export default CancellationNote;
