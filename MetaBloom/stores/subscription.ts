import { create } from "zustand";
import { persist } from "zustand/middleware";

type SubscriptionState = {
  hasActiveSubscription: boolean;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  customerId: string | null;
  setSubscription: (subscription: {
    hasActiveSubscription: boolean;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    customerId?: string;
  }) => void;
  clearSubscription: () => void;
};

export const useSubscription = create<SubscriptionState>()(
  persist(
    (set) => ({
      hasActiveSubscription: false,
      subscriptionPlan: null,
      subscriptionStatus: null,
      customerId: null,
      setSubscription: (subscription) => set({
        hasActiveSubscription: subscription.hasActiveSubscription,
        subscriptionPlan: subscription.subscriptionPlan || null,
        subscriptionStatus: subscription.subscriptionStatus || null,
        customerId: subscription.customerId || null,
      }),
      clearSubscription: () => set({
        hasActiveSubscription: false,
        subscriptionPlan: null,
        subscriptionStatus: null,
        customerId: null,
      }),
    }),
    {
      name: "subscription-storage",
    }
  )
);
