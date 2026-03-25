import SmallButtons from "@/components/ui/buttons/SmallButtons";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { PiCreditCard, PiRocket, PiX, PiMoon, PiSun } from "react-icons/pi";
import { useAuth } from "@/stores/auth";
import { useMainModal } from "@/stores/modal";
import { useTheme } from "next-themes";
import CancellationNote from "@/components/subscription/CancellationBanner";

function SettingsModal() {
  const { user } = useAuth();
  const { modalOpen, modalClose } = useMainModal();
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [isCancelingSubscription, setIsCancelingSubscription] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const handleUpdatePayment = async () => {
    if (!user?.uid) {
      modalOpen('Notification', {
        type: 'error',
        title: 'Authentication Required',
        message: 'Please sign in to update payment information'
      });
      return;
    }

    setIsUpdatingPayment(true);

    try {
      const response = await fetch('/api/stripe/create-billing-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        // Clean implementation: Try new tab first, fallback to same tab only if blocked
        const newTab = window.open(data.url, '_blank', 'noopener,noreferrer');

        // Simple, reliable popup detection
        if (!newTab || newTab.closed) {
          // Popup was definitely blocked, redirect current tab
          console.log('Popup blocked, redirecting in current tab');
          window.location.href = data.url;
        } else {
          // New tab opened successfully - do nothing else
          console.log('Stripe billing portal opened in new tab');
        }
      } else {
        modalOpen('Notification', {
          type: 'error',
          title: 'Payment Portal Error',
          message: data.error || 'Failed to open payment portal'
        });
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      modalOpen('Notification', {
        type: 'error',
        title: 'Payment Portal Error',
        message: 'Failed to open payment portal. Please try again.'
      });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleCancelSubscription = () => {
    if (!user?.uid) {
      modalOpen('Notification', {
        type: 'error',
        title: 'Authentication Required',
        message: 'Please sign in to cancel subscription'
      });
      return;
    }

    // Show custom cancellation confirmation modal
    modalClose(); // Close settings modal first
    modalOpen('CancelSubscription');
  };

  return (
    <div className="dark:text-n30">
      {/* Theme Settings */}
      <div className="mt-6 bg-primaryColor/5 border border-primaryColor/30 rounded-xl p-5">
        <div className="pb-5 border-b border-primaryColor/30">
          <p className="text-n700 font-medium dark:text-n30">Appearance</p>
          <p className="pt-2 text-xs">
            Customize your display preferences
          </p>
        </div>
        <div className="pt-5">
          <div className="p-4 rounded-xl hover:bg-primaryColor/5 hover:border-primaryColor/30 border border-transparent duration-500">
            <div className="flex justify-between items-center w-full">
              <div>
                <p className="text-n700 font-medium dark:text-n30 text-sm flex items-center gap-2">
                  {mounted && resolvedTheme === "dark" ? (
                    <PiMoon className="text-xl text-primaryColor" />
                  ) : (
                    <PiSun className="text-xl text-primaryColor" />
                  )}
                  Theme Mode
                </p>
                <p className="pt-2 text-xs">
                  Switch between light and dark mode
                </p>
              </div>
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primaryColor/10 hover:bg-primaryColor/20 border border-primaryColor/30 transition-all duration-200"
                disabled={!mounted}
              >
                {!mounted ? (
                  <span className="text-sm text-primaryColor">Loading...</span>
                ) : (
                  <>
                    {resolvedTheme === "dark" ? (
                      <>
                        <PiSun className="text-sm text-primaryColor" />
                        <span className="text-sm text-primaryColor font-medium">Light</span>
                      </>
                    ) : (
                      <>
                        <PiMoon className="text-sm text-primaryColor" />
                        <span className="text-sm text-primaryColor font-medium">Dark</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Management */}
      <div className="mt-6 bg-primaryColor/5 border border-primaryColor/30 rounded-xl p-5">
        <div className="pb-5 border-b border-primaryColor/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-n700 font-medium dark:text-n30">Subscription Management</p>
              <p className="pt-2 text-xs">
                Manage your subscription and payment details
              </p>
            </div>
            <CancellationNote />
          </div>
        </div>
        <div className="flex flex-col gap-4 pt-5">
          {/* Upgrade Plan */}
          <div className="p-4 rounded-xl hover:bg-primaryColor/5 hover:border-primaryColor/30 border border-transparent duration-500">
            <Link
              href="/upgrade-plan"
              className="flex justify-between items-center w-full"
            >
              <div>
                <p className="text-n700 font-medium dark:text-n30 text-sm flex items-center gap-2">
                  <PiRocket className="text-xl text-primaryColor" />
                  Upgrade Plan
                </p>
                <p className="pt-2 text-xs">
                  View available plans and upgrade your subscription
                </p>
              </div>
              <div className="text-primaryColor text-sm font-medium">
                View Plans
              </div>
            </Link>
          </div>

          {/* Update Payment Info */}
          <div className="p-4 rounded-xl hover:bg-primaryColor/5 hover:border-primaryColor/30 border border-transparent duration-500">
            <button
              onClick={handleUpdatePayment}
              disabled={isUpdatingPayment}
              className="flex justify-between items-center w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div>
                <p className="text-n700 font-medium dark:text-n30 text-sm flex items-center gap-2">
                  <PiCreditCard className="text-xl text-primaryColor" />
                  Update Payment Information
                </p>
                <p className="pt-2 text-xs">
                  Change or update your payment method
                </p>
              </div>
              <div className="text-primaryColor text-sm font-medium">
                {isUpdatingPayment ? 'Loading...' : 'Update'}
              </div>
            </button>
          </div>

          {/* Cancel Subscription */}
          <div className="p-4 rounded-xl hover:bg-errorColor/5 hover:border-errorColor/30 border border-transparent duration-500">
            <button
              onClick={handleCancelSubscription}
              disabled={isCancelingSubscription}
              className="flex justify-between items-center w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div>
                <p className="text-n700 font-medium dark:text-n30 text-sm flex items-center gap-2">
                  <PiX className="text-xl text-errorColor" />
                  Cancel Subscription
                </p>
                <p className="pt-2 text-xs">
                  Cancel your current subscription plan
                </p>
              </div>
              <div className="text-errorColor text-sm font-medium">
                {isCancelingSubscription ? 'Canceling...' : 'Cancel'}
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-start items-center gap-2 pt-5 text-xs">
          <SmallButtons name="Save Changes" />
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
