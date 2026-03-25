"use client";

import { useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { useAuth } from '@/stores/auth';

export function useStripeSubscription() {
  const stripe = useStripe();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = async (planType: string, isYearly: boolean = false) => {
    if (!stripe || !user) {
      setError('Stripe not loaded or user not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First check if user can subscribe to this plan
      const eligibilityResponse = await fetch('/api/subscription/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          planType,
        }),
      });

      const eligibilityData = await eligibilityResponse.json();

      if (!eligibilityResponse.ok) {
        setError(eligibilityData.error || 'Cannot subscribe to this plan');
        return;
      }

      if (!eligibilityData.canSubscribe) {
        setError(eligibilityData.error || 'You already have this subscription');
        return;
      }

      // If user has existing subscription, just continue without confirmation for upgrades
      // The initial modal is the only confirmation needed

      // Create checkout session (this now handles existing subscriptions automatically)
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          isYearly,
          userId: user.uid,
        }),
      });

      const responseData = await response.json();
      const { sessionId, error: apiError, action, message, success } = responseData;

      if (apiError) {
        setError(apiError);
        return;
      }

      // Handle different response types
      if (success && action === 'updated') {
        // Subscription was updated directly, no checkout needed
        // Show success modal instead of just reloading
        const { useMainModal } = await import('@/stores/modal');
        const { modalOpen } = useMainModal.getState();

        modalOpen('Notification', {
          type: 'success',
          title: 'Subscription Updated Successfully!',
          message: message || `Your subscription has been updated successfully. You now have access to all the features of your new plan.`,
          confirmText: 'Great!',
          onConfirm: () => {
            window.location.reload();
          }
        });
        return;
      }

      if (!sessionId) {
        setError('No checkout session created');
        return;
      }

      // Show message about what's happening
      if (message && action === 'replaced') {
        // Brief notification that old subscription was canceled
        console.log('📋 Subscription change info:', message);
      }

      // Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        setError(stripeError.message || 'Failed to redirect to checkout');
      }
    } catch (err) {
      setError('Failed to create checkout session');
      console.error('Subscription error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    createCheckoutSession,
    loading,
    error,
  };
}
