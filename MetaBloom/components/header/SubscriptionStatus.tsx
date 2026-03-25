"use client";

import React from 'react';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { PiCrown, PiStar } from 'react-icons/pi';
import CancellationStatusIndicator from '@/components/subscription/CancellationStatusIndicator';
import DowngradeNotification from '@/components/subscription/DowngradeNotification';
import BillingPeriodNotification from '@/components/subscription/BillingPeriodNotification';
import CancellationNote from '@/components/subscription/CancellationBanner';
import DowngradeCountdown from '@/components/subscription/DowngradeCountdown';

function SubscriptionStatus() {
  const {
    hasActiveSubscription,
    getPlanDisplayName,
    currentPlan,
    isCancelationScheduled,
    getDaysUntilCancellation,
    getCancellationDate,
    getTargetPlanAfterCancellation,
    hasPendingDowngrade,
    getPendingDowngrade,
    getDaysUntilDowngrade,
    getDowngradeDate,
    getCurrentPeriodEnd,
    getDaysUntilPeriodEnd,
    willDowngradeAtPeriodEnd
  } = useUserSubscription();

  if (!hasActiveSubscription || currentPlan === 'free') {
    return null;
  }

  const planName = getPlanDisplayName();
  const icon = currentPlan === 'premium' ? PiCrown : PiStar;
  const isScheduledForCancellation = isCancelationScheduled();
  const hasPendingDowngradeScheduled = hasPendingDowngrade();
  const willDowngrade = willDowngradeAtPeriodEnd();
  const periodEnd = getCurrentPeriodEnd();
  const daysUntilPeriodEnd = getDaysUntilPeriodEnd();

  // Show billing period notification if subscription will downgrade or is ending soon
  if (willDowngrade || (periodEnd && daysUntilPeriodEnd <= 7)) {
    return (
      <div className="flex items-center gap-2">
        {/* Current plan badge with cancellation note and countdown */}
        <div className="flex flex-col items-start gap-1 px-3 py-2 bg-primaryColor/10 border border-primaryColor/30 rounded-lg">
          <div className="flex items-center gap-2">
            {React.createElement(icon, { className: "text-primaryColor text-sm" })}
            <span className="text-xs font-medium text-primaryColor">
              {planName}
            </span>
          </div>
          <CancellationNote />
          {/* Add countdown if there's a period end date */}
          {periodEnd && (
            <DowngradeCountdown
              endDate={periodEnd}
              targetPlan="Free"
              variant="minimal"
              className="mt-1"
            />
          )}
        </div>
      </div>
    );
  }

  // Check for pending downgrade (legacy system)
  if (hasPendingDowngradeScheduled) {
    const pendingDowngrade = getPendingDowngrade();
    const daysUntil = getDaysUntilDowngrade();
    const downgradeDate = getDowngradeDate();

    if (pendingDowngrade && downgradeDate) {
      return (
        <div className="flex items-center gap-2">
          {/* Current plan badge with countdown */}
          <div className="flex flex-col items-start gap-1 px-3 py-2 bg-primaryColor/10 border border-primaryColor/30 rounded-lg">
            <div className="flex items-center gap-2">
              {React.createElement(icon, { className: "text-primaryColor text-sm" })}
              <span className="text-xs font-medium text-primaryColor">
                {planName}
              </span>
            </div>
            {/* Minimalistic countdown inside the tier container */}
            <DowngradeCountdown
              endDate={downgradeDate}
              targetPlan={pendingDowngrade.toPlan}
              variant="minimal"
            />
          </div>

          {/* Downgrade notification */}
          <DowngradeNotification
            fromPlan={pendingDowngrade.fromPlan}
            toPlan={pendingDowngrade.toPlan}
            daysUntilDowngrade={daysUntil}
            downgradeDate={downgradeDate}
            reason={pendingDowngrade.reason}
            variant="banner"
            className="animate-pulse"
          />
        </div>
      );
    }
  }

  // Check for cancellation (fallback if no downgrade)
  if (isScheduledForCancellation) {
    const daysUntil = getDaysUntilCancellation();
    const cancellationDate = getCancellationDate();
    const targetPlan = getTargetPlanAfterCancellation();

    return (
      <div className="flex items-center gap-2">
        {/* Current plan badge */}
        <div className="flex items-center gap-2 px-3 py-1 bg-primaryColor/10 border border-primaryColor/30 rounded-full">
          {React.createElement(icon, { className: "text-primaryColor text-sm" })}
          <span className="text-xs font-medium text-primaryColor">
            {planName}
          </span>
        </div>

        {/* Cancellation indicator */}
        {cancellationDate && (
          <CancellationStatusIndicator
            daysUntilCancellation={daysUntil}
            cancellationDate={cancellationDate}
            currentPlan={planName}
            targetPlan={targetPlan}
            variant="badge"
            className="animate-pulse"
          />
        )}
      </div>
    );
  }

  // Default: show the plan badge with cancellation note if applicable
  return (
    <div className="flex flex-col items-start gap-1 px-3 py-2 bg-primaryColor/10 border border-primaryColor/30 rounded-lg">
      <div className="flex items-center gap-2">
        {React.createElement(icon, { className: "text-primaryColor text-sm" })}
        <span className="text-xs font-medium text-primaryColor">
          {planName}
        </span>
      </div>
      <CancellationNote />
      {/* Show countdown if there's a billing period end and it's ending soon */}
      {periodEnd && daysUntilPeriodEnd <= 30 && willDowngrade && (
        <DowngradeCountdown
          endDate={periodEnd}
          targetPlan="Free"
          variant="minimal"
          className="mt-1"
        />
      )}
    </div>
  );
}

export default SubscriptionStatus;
