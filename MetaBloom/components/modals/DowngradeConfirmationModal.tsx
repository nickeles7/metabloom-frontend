import React, { useState } from "react";
import { PiWarning, PiX } from "react-icons/pi";
import { useMainModal } from "@/stores/modal";
import { useAuth } from "@/stores/auth";

function DowngradeConfirmationModal() {
  const { modalClose, modalOpen, modalParams } = useMainModal();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const targetPlan = modalParams.targetPlan || 'Free';
  const targetPlanType = modalParams.targetPlanType || 'free';
  const currentPlan = modalParams.currentPlan || 'premium';

  // Store original modal params to restore the UpgradeModal
  const originalModalParams = modalParams.originalModalParams || {};

  const handleConfirmDowngrade = async () => {
    if (!user?.uid) {
      modalClose();
      modalOpen('Notification', {
        type: 'error',
        title: 'Authentication Required',
        message: 'Please sign in to manage your subscription'
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Cancel the current subscription
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          cancelAtPeriodEnd: true, // Cancel at end of billing period
        }),
      });

      const data = await response.json();

      if (data.success) {
        modalClose();
        modalOpen('Notification', {
          type: 'success',
          title: 'Downgrade Scheduled',
          message: data.message || 'Your subscription has been scheduled for cancellation. You\'ll be downgraded to the free plan at the end of your current billing period.',
          onConfirm: () => {
            // Refresh the page to show updated subscription status
            window.location.reload();
          }
        });
      } else {
        modalClose();
        modalOpen('Notification', {
          type: 'error',
          title: 'Downgrade Failed',
          message: data.error || 'Failed to downgrade subscription'
        });
      }
    } catch (error) {
      console.error('Error downgrading subscription:', error);
      modalClose();
      modalOpen('Notification', {
        type: 'error',
        title: 'Downgrade Failed',
        message: 'Failed to downgrade subscription. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    // Close current modal and reopen the original UpgradeModal
    modalClose();
    // Small delay to ensure smooth transition
    setTimeout(() => {
      modalOpen('Upgrade', originalModalParams);
    }, 100);
  };

  return (
    <div className="relative">
      {/* Close button positioned at modal edge */}
      <button
        onClick={handleCancel}
        className="absolute top-0 right-0 p-2 hover:bg-n100 dark:hover:bg-n800 rounded-full transition-colors z-10"
      >
        <PiX className="text-xl text-n500 dark:text-n400" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pr-10">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full">
          <PiWarning className="text-xl text-orange-600 dark:text-orange-400" />
        </div>
        <h2 className="text-xl font-semibold text-n700 dark:text-n30">
          Confirm Downgrade
        </h2>
      </div>

      {/* Content */}
      <div className="space-y-4 mb-6">
        <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            <strong>Important:</strong> You're about to downgrade from your <span className="capitalize font-medium">{currentPlan}</span> plan to the <span className="capitalize font-medium">{targetPlan}</span> plan.
          </p>
        </div>

        <div className="p-3 bg-n50 dark:bg-n800 rounded-lg">
          <p className="text-xs text-n600 dark:text-n400">
            You can always upgrade again later if you change your mind.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-n600 dark:text-n400 bg-n100 dark:bg-n800 hover:bg-n200 dark:hover:bg-n700 rounded-lg transition-colors"
        >
          Keep Current Plan
        </button>
        <button
          onClick={handleConfirmDowngrade}
          disabled={isProcessing}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Confirm Downgrade'}
        </button>
      </div>
    </div>
  );
}

export default DowngradeConfirmationModal;
