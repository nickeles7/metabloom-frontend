"use client";
import { upgradePlanDetails } from "@/constants/data";
import { useMainModal } from "@/stores/modal";
import React, { useState, useEffect } from "react";
import { PiCheckCircle, PiXCircle } from "react-icons/pi";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { useSearchParams } from "next/navigation";
import CancellationNote from "@/components/subscription/CancellationBanner";
import DowngradeCountdown from "@/components/subscription/DowngradeCountdown";

function UpgradePlan() {
  const { modalOpen } = useMainModal();
  const [showYearlyPrice] = useState(false);
  const {
    currentPlan,
    hasPlan,
    loading,
    refreshSubscription,
    getCurrentPeriodEnd,
    willDowngradeAtPeriodEnd,
    hasPendingDowngrade,
    getPendingDowngrade,
    getDowngradeDate
  } = useUserSubscription();
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState(false);

  // Handle successful payment
  useEffect(() => {
    const success = searchParams.get('success');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && sessionId) {
      processSuccessfulPayment(sessionId);
    }
  }, [searchParams]);

  const processSuccessfulPayment = async (sessionId: string) => {
    setProcessing(true);
    console.log('🎉 Processing successful payment with session ID:', sessionId);

    try {
      const response = await fetch('/api/stripe/process-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();
      console.log('📊 Process success result:', result);

      if (result.success) {
        // Show success modal instead of just refreshing
        modalOpen('Notification', {
          type: 'success',
          title: 'Subscription Updated Successfully!',
          message: `Your subscription has been upgraded to ${result.planType || 'your new plan'}. You now have access to all the features of your new plan.`,
          confirmText: 'Great!',
          onConfirm: () => {
            // Refresh subscription data after user acknowledges
            refreshSubscription(true);
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        });

        // Do background refresh to ensure data is ready (but don't reload page)
        setTimeout(async () => {
          await refreshSubscription(true);
        }, 1000);
      } else {
        console.error('❌ Failed to process payment:', result.error);
        // Show error modal instead of banner
        modalOpen('Notification', {
          type: 'error',
          title: 'Payment Issue',
          message: 'There was an issue processing your payment. Please contact support if this problem persists.',
          confirmText: 'OK'
        });
      }
    } catch (error) {
      console.error('💥 Error processing payment:', error);
      modalOpen('Notification', {
        type: 'error',
        title: 'Processing Error',
        message: 'There was an error processing your payment. Please contact support if this problem persists.',
        confirmText: 'OK'
      });
    } finally {
      setProcessing(false);
      // Clear URL parameters
      window.history.replaceState({}, '', '/upgrade-plan');
    }
  };
  return (
    <div className="  h-full flex-1 overflow-auto w-full z-20 flex justify-center items-start">
      <div className="flex flex-col justify-center items-center px-4 lg:px-6 max-w-[1080px] w-full">
        {/* Processing Message */}
        {processing && (
          <div className="mb-6 p-4 rounded-lg text-center bg-blue-100 text-blue-800">
            🔄 Processing your subscription...
          </div>
        )}

        <div className="text-center pt-2 md:pt-3">
          <div className="inline-flex items-center gap-2 bg-primaryColor/10 px-3 py-1.5 rounded-full mb-3">
            <div className="w-1.5 h-1.5 bg-primaryColor rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-primaryColor">Choose Your Plan</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-n800 dark:text-n50 mb-1">
            Upgrade Your Experience
          </h1>
          <p className="text-xs md:text-sm text-n700 dark:text-n200 max-w-lg mx-auto font-medium mb-8">
            Unlock powerful features and take your Hearthstone strategy to the next level
          </p>
        </div>

        <div className="flex justify-center items-stretch gap-3 md:gap-4 pt-4 pb-4 w-full max-sm:flex-col max-sm:gap-3">
          {upgradePlanDetails.map(
            ({ id, name, icon, price, features, notProvidedFeatures }) => {
              // Map plan names to subscription types
              const planName = name.toLowerCase() === 'Free' ? 'free' : name.toLowerCase();
              const isCurrentPlan = hasPlan(planName) || (planName === 'free' && currentPlan === 'free');



              return (
                <div
                  className={`relative border rounded-2xl flex flex-col p-4 md:p-5 flex-1 transition-all duration-300 hover:shadow-xl group ${
                    isCurrentPlan
                      ? "bg-primaryColor border-primaryColor shadow-lg text-white transform scale-105"
                      : name === "Premium"
                      ? "bg-white dark:bg-n0 border-2 border-primaryColor/40 shadow-lg"
                      : "bg-white dark:bg-n0 border-gray-200 dark:border-n200 hover:border-primaryColor/50"
                  }`}
                  key={id}
                >
                  {/* Popular badge for Premium */}
                  {name === "Premium" && !isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-primaryColor text-white px-4 py-1 rounded-full text-xs font-semibold shadow-lg">
                        Most Popular
                      </div>
                    </div>
                  )}

                  {/* Current plan badge */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-white text-primaryColor px-4 py-1 rounded-full text-xs font-semibold shadow-lg">
                        Current Plan
                      </div>
                    </div>
                  )}

                  <div className="text-center">
                    {React.createElement(icon, {
                      className: `text-2xl md:text-3xl mb-2 ${
                        isCurrentPlan ? "text-white" : "text-primaryColor"
                      }`,
                    })}
                    <h3
                      className={`text-base md:text-lg font-bold mb-2 ${
                        isCurrentPlan ? "text-white" : "text-n800 dark:text-n50"
                      }`}
                    >
                      {name}
                    </h3>

                    {/* Show cancellation note and countdown for current plan */}
                    {isCurrentPlan && (
                      <div className="mb-2 space-y-1">
                        <CancellationNote className="text-white/90" />
                        {/* Show countdown if there's a pending downgrade */}
                        {hasPendingDowngrade() && getDowngradeDate() && (
                          <DowngradeCountdown
                            endDate={getDowngradeDate()!}
                            targetPlan={getPendingDowngrade()?.toPlan || 'free'}
                            variant="minimal"
                            className="text-white/80"
                          />
                        )}
                        {/* Show countdown if subscription will downgrade at period end */}
                        {!hasPendingDowngrade() && willDowngradeAtPeriodEnd() && getCurrentPeriodEnd() && (
                          <DowngradeCountdown
                            endDate={getCurrentPeriodEnd()!}
                            targetPlan="free"
                            variant="minimal"
                            className="text-white/80"
                          />
                        )}
                      </div>
                    )}

                    <div className="mb-3">
                      <div className={`text-xl md:text-2xl font-bold ${
                        isCurrentPlan ? "text-white" : "text-n800 dark:text-n50"
                      }`}>
                        {price === 0 ? "$0" : `$${showYearlyPrice ? price * 12 : price}`}
                      </div>
                      <div className={`text-xs font-medium ${
                        isCurrentPlan ? "text-white/80" : "text-n600 dark:text-n300"
                      }`}>
                        {price === 0 ? "Forever" : "per month"}
                      </div>
                    </div>
                  </div>
                <div className="space-y-1.5 mb-4">
                  {features.map((item, index) => (
                    <div
                      className="flex items-start gap-2"
                      key={`${index}`}
                    >
                      <PiCheckCircle
                        className={`text-sm mt-0.5 flex-shrink-0 ${
                          isCurrentPlan ? "text-white" : "text-green-500"
                        }`}
                      />
                      <span className={`text-xs font-medium ${
                        isCurrentPlan ? "text-white/90" : "text-n700 dark:text-n200"
                      }`}>{item}</span>
                    </div>
                  ))}
                  {notProvidedFeatures.map((item, idx) => (
                    <div
                      className="flex items-start gap-2"
                      key={`${idx}`}
                    >
                      <PiXCircle className="text-sm mt-0.5 flex-shrink-0 text-gray-400" />
                      <span className={`text-xs font-medium ${
                        isCurrentPlan ? "text-white/60" : "text-gray-500"
                      }`}>{item}</span>
                    </div>
                  ))}
                </div>



                <div className="mt-auto">
                  {(() => {
                    const planNameLower = name.toLowerCase() === 'basic' ? 'free' : name.toLowerCase();
                    const isCurrentPlanButton = hasPlan(planNameLower);
                    const isFreeAndCurrentlyFree = planNameLower === 'free' && currentPlan === 'free';
                    const isDisabled = isCurrentPlanButton || isFreeAndCurrentlyFree || loading;

                    return (
                      <button
                        onClick={() => !isDisabled && modalOpen("Upgrade", {
                          planType: planNameLower,
                          planName: name,
                          planPrice: price,
                          isYearly: showYearlyPrice
                        })}
                        disabled={isDisabled}
                        className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          isCurrentPlanButton || isFreeAndCurrentlyFree
                            ? "bg-gray-100 dark:bg-n200 text-gray-400 cursor-not-allowed"
                            : isCurrentPlan
                            ? "bg-white text-primaryColor hover:bg-gray-50 border-2 border-white"
                            : name === "Premium"
                            ? "bg-primaryColor text-white hover:bg-primaryColor/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            : "bg-primaryColor text-white hover:bg-primaryColor/90 shadow-md hover:shadow-lg"
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {(() => {
                          if (loading) return "Loading...";
                          if (isCurrentPlanButton || isFreeAndCurrentlyFree) return "Current Plan";

                          // Get current plan hierarchy (0 = free/basic, 1 = standard, 2 = premium)
                          const getCurrentPlanLevel = () => {
                            if (currentPlan === 'free') return 0;
                            if (currentPlan === 'standard') return 1;
                            if (currentPlan === 'premium') return 2;
                            return 0;
                          };

                          // Get target plan hierarchy
                          const getTargetPlanLevel = () => {
                            if (planNameLower === 'free') return 0;
                            if (planNameLower === 'standard') return 1;
                            if (planNameLower === 'premium') return 2;
                            return 0;
                          };

                          const currentLevel = getCurrentPlanLevel();
                          const targetLevel = getTargetPlanLevel();

                          if (targetLevel > currentLevel) {
                            return `Upgrade to ${name}`;
                          } else if (targetLevel < currentLevel) {
                            return `Downgrade to ${name}`;
                          } else {
                            return `Switch to ${name}`;
                          }
                        })()}
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default UpgradePlan;
