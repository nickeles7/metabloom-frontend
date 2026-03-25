import React, { useState } from "react";
import { PiWarning, PiX } from "react-icons/pi";
import { useMainModal } from "@/stores/modal";
import { useAuth } from "@/stores/auth";

function CancelSubscriptionModal() {
  const { modalClose, modalOpen } = useMainModal();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmCancel = async () => {
    if (!user?.uid) {
      modalClose();
      modalOpen('Notification', {
        type: 'error',
        title: 'Authentication Required',
        message: 'Please sign in to cancel subscription'
      });
      return;
    }

    setIsProcessing(true);

    try {
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
          title: 'Subscription Canceled',
          message: data.message || 'Your subscription has been canceled successfully.',
          onConfirm: () => {
            // Refresh the page to show updated subscription status
            window.location.reload();
          }
        });
      } else {
        modalClose();
        modalOpen('Notification', {
          type: 'error',
          title: 'Cancellation Failed',
          message: data.error || 'Failed to cancel subscription'
        });
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      modalClose();
      modalOpen('Notification', {
        type: 'error',
        title: 'Cancellation Failed',
        message: 'Failed to cancel subscription. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeepSubscription = () => {
    modalClose();
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
            <PiWarning className="text-xl text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-n700 dark:text-n30">
            Cancel Subscription
          </h2>
        </div>
        <button
          onClick={handleKeepSubscription}
          className="p-1 hover:bg-n100 dark:hover:bg-n800 rounded-full transition-colors"
        >
          <PiX className="text-xl text-n500 dark:text-n400" />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4 mb-6">
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>Are you sure you want to cancel your subscription?</strong>
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-n700 dark:text-n30">What happens when you cancel:</h3>
          <ul className="space-y-2 text-sm text-n600 dark:text-n400">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Your subscription will be canceled at the end of your current billing period</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>You'll continue to have access to your current plan features until then</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>After that, you'll be automatically moved to the free plan</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Some features may become unavailable or limited</span>
            </li>
          </ul>
        </div>

        <div className="p-3 bg-n50 dark:bg-n800 rounded-lg">
          <p className="text-xs text-n600 dark:text-n400">
            You can always resubscribe later if you change your mind.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleKeepSubscription}
          className="flex-1 px-4 py-2 text-sm font-medium text-n600 dark:text-n400 bg-n100 dark:bg-n800 hover:bg-n200 dark:hover:bg-n700 rounded-lg transition-colors"
        >
          Keep Subscription
        </button>
        <button
          onClick={handleConfirmCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {isProcessing ? 'Canceling...' : 'Cancel Subscription'}
        </button>
      </div>
    </div>
  );
}

export default CancelSubscriptionModal;
