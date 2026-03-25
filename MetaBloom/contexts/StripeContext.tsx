"use client";

import React, { createContext, useContext } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';

const StripeContext = createContext<null>(null);

export function StripeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}

export function useStripe() {
  const context = useContext(StripeContext);
  return context;
}
