import Image from "next/image";
import React, { useState } from "react";
import {
  PiCheckCircle,
  PiLockKey,
  PiX,
} from "react-icons/pi";
import upgradeImg from "@/public/images/upgrade-header.png";
import { useMainModal } from "@/stores/modal";
import { useStripeSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/stores/auth";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { useSubscription } from "@/stores/subscription";

// This will be dynamically generated based on plan

function UpgradeModal() {
  const [selectedPrice, setSelectedPrice] = useState(0);
  const { modalClose, modalOpen, modalParams } = useMainModal();
  const { createCheckoutSession, loading, error } = useStripeSubscription();
  const { isAuthenticated } = useAuth();
  const { currentPlan, loading: subscriptionLoading } = useUserSubscription();
  const { subscriptionPlan: persistedPlan } = useSubscription();

  // Use persisted plan as initial state to prevent flickering, fall back to currentPlan when loaded
  const effectiveCurrentPlan = subscriptionLoading && persistedPlan ? persistedPlan : currentPlan;

  // Extract plan details from modal parameters
  const planName = modalParams.planName || 'Premium';
  const planType = modalParams.planType || 'premium';

  // Set correct pricing based on plan type
  let planPrice = modalParams.planPrice;
  if (planPrice === undefined) {
    // Default pricing based on plan type
    switch (planType.toLowerCase()) {
      case 'basic':
      case 'free':
        planPrice = 0;
        break;
      case 'standard':
        planPrice = 10;
        break;
      case 'premium':
      default:
        planPrice = 20;
        break;
    }
  }

  // Generate dynamic pricing data based on plan
  // Apply 20% discount for yearly plans
  const yearlyPrice = planPrice === 0 ? 0 : Math.round(planPrice * 12 * 0.8);
  const pricingData = [
    {
      id: 1,
      title: planPrice === 0 ? "Free forever" : "Pay monthly",
      price: planPrice === 0 ? "Free" : `$${planPrice}/month`,
    },
    {
      id: 2,
      title: planPrice === 0 ? "Free forever" : "Pay yearly",
      price: planPrice === 0 ? "Free" : `$${yearlyPrice}/year`,
    },
  ];

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      modalOpen('Notification', {
        type: 'error',
        title: 'Authentication Required',
        message: 'Please sign in to subscribe'
      });
      return;
    }

    // Handle free plan - allow downgrades to free
    if (planPrice === 0) {
      // Check if this is a downgrade from a paid plan
      const getCurrentPlanLevel = () => {
        if (effectiveCurrentPlan === 'free') return 0;
        if (effectiveCurrentPlan === 'standard') return 1;
        if (effectiveCurrentPlan === 'premium') return 2;
        return 0;
      };

      const currentLevel = getCurrentPlanLevel();

      if (currentLevel > 0) {
        // This is a downgrade to free - show custom confirmation modal
        modalClose(); // Close current modal
        modalOpen('DowngradeConfirmation', {
          targetPlan: planName,
          targetPlanType: planType,
          currentPlan: effectiveCurrentPlan,
          // Pass original modal params so user can return to this modal if they cancel
          originalModalParams: {
            planName: planName,
            planType: planType,
            planPrice: planPrice
          }
        });
        return;
      } else {
        // User is already on free plan
        modalOpen('Notification', {
          type: 'info',
          title: 'Already on Free Plan',
          message: 'You already have access to the free plan features!'
        });
        return;
      }
    }

    // Check for Premium to Standard downgrade
    if (effectiveCurrentPlan === 'premium' && planType === 'standard') {
      modalClose(); // Close current modal
      modalOpen('DowngradeConfirmation', {
        targetPlan: planName,
        targetPlanType: planType,
        currentPlan: effectiveCurrentPlan,
        // Pass original modal params so user can return to this modal if they cancel
        originalModalParams: {
          planName: planName,
          planType: planType,
          planPrice: planPrice
        }
      });
      return;
    }

    const isYearly = selectedPrice === 1;
    await createCheckoutSession(planType, isYearly);
  };

  // Get dynamic button text based on current plan vs target plan
  const getButtonText = () => {
    if (loading) return "Processing...";

    // Show loading text while subscription data is being fetched
    if (subscriptionLoading) return "Loading...";

    // Handle free plan
    if (planPrice === 0) {
      return `Start ${planName} Plan`;
    }

    // Get current plan hierarchy (0 = free/basic, 1 = standard, 2 = premium)
    const getCurrentPlanLevel = () => {
      if (effectiveCurrentPlan === 'free') return 0;
      if (effectiveCurrentPlan === 'standard') return 1;
      if (effectiveCurrentPlan === 'premium') return 2;
      return 0;
    };

    // Get target plan hierarchy
    const getTargetPlanLevel = () => {
      if (planType === 'free' || planType === 'basic') return 0;
      if (planType === 'standard') return 1;
      if (planType === 'premium') return 2;
      return 0;
    };

    const currentLevel = getCurrentPlanLevel();
    const targetLevel = getTargetPlanLevel();

    if (targetLevel > currentLevel) {
      return `Upgrade to ${planName}`;
    } else if (targetLevel < currentLevel) {
      return `Downgrade to ${planName}`;
    } else {
      return `Switch to ${planName}`;
    }
  };
  return (
    <div className="">
      <div className="relative">
        <Image src={upgradeImg} alt="" className="w-full" />
        <div
          onClick={modalClose}
          className="absolute top-4 right-4  rounded-full p-1 sm:p-2 flex justify-center items-center bg-white cursor-pointer dark:bg-n0"
        >
          <PiX className="text-errorColor text-xl sm:text-2xl" />
        </div>
      </div>
      <div className="px-4 sm:px-[60px] pb-6 sm:pb-10  ">
        <div className="bg-white dark:bg-n0 relative z-10 rounded-xl">
          <div className="bg-secondaryColor/5 border border-secondaryColor/30 rounded-xl p-3 sm:py-5 sm:px-6 -mt-12">
            <p className="text-xl sm:text-2xl font-semibold">{planName}</p>
            <p className="text-n700 pt-2 max-sm:text-sm dark:text-n30">
              {planPrice === 0 ? "0$/month" : `$${planPrice}.00/month`}
            </p>
          </div>
          {planPrice > 0 && (
            <div className="pt-3 flex justify-start items-center gap-2 sm:gap-3 max-[430px]:flex-col">
              {pricingData.map(({ id, title, price }, idx) => (
                <div
                  className={`p-3 sm:p-5 rounded-xl flex-1 bg-primaryColor/5 border relative w-full ${
                    selectedPrice === idx
                      ? " border-primaryColor"
                      : "border-primaryColor/30"
                  }`}
                  key={id}
                  onClick={() => setSelectedPrice(idx)}
                >
                  <div
                    className={`absolute top-2 right-2 text-primaryColor ${
                      selectedPrice === idx ? "" : "opacity-0"
                    }`}
                  >
                    <PiCheckCircle className="text-2xl" />
                  </div>
                  <p className="text-sm font-medium pb-2">{title}</p>
                  <div className="flex justify-between items-center ">
                    <p className="font-semibold text-n700 dark:text-n30">
                      {price}
                    </p>
                    {idx === 1 && planPrice > 0 && (
                      <p className="text-successColor bg-successColor/5 border border-successColor/30 rounded-md px-2 text-sm">
                        Save 20%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-start items-center gap-2 pt-6">
            <PiLockKey className="text-xl text-primaryColor" />
            <p className="text-sm">Secure payment powered by Stripe</p>
          </div>
          <div className="pt-6 sm:pt-10 flex flex-col justify-end items-end text-end">
            <p className="text-n700 text-2xl font-semibold pt-2 dark:text-n30">
              {planPrice === 0 ? "Free Plan" : `Billed Now: $${selectedPrice === 0 ? planPrice : yearlyPrice}`}
            </p>
            <p className="text-sm py-5 w-full sm:w-[450px]">
              {planPrice === 0
                ? `By clicking "Start ${planName} plan", you'll get access to the free tier features with no charges.`
                : `By clicking "Start ${planName} plan", you agree to be charged $${selectedPrice === 0 ? planPrice : yearlyPrice} every ${selectedPrice === 0 ? 'month' : 'year'}, unless you cancel.`
              }
            </p>
            <button
              onClick={handleSubscribe}
              disabled={loading || subscriptionLoading}
              className="text-white bg-primaryColor rounded-full py-3 px-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getButtonText()}
            </button>
            {error && (
              <p className="text-errorColor text-sm mt-2">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
