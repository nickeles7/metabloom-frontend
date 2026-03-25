import { loadStripe } from '@stripe/stripe-js';
import Stripe from 'stripe';

// Client-side Stripe instance
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined in environment variables');
}

export const stripePromise = loadStripe(stripePublishableKey!);

// Server-side Stripe instance (lazy initialization)
let _stripe: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!_stripe) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }

    _stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-04-30.basil',
    });
  }

  return _stripe;
};

// Use getStripe() function instead of direct export to avoid initialization errors

// Subscription plan configurations
export const SUBSCRIPTION_PLANS = {
  standard: {
    name: 'Standard',
    price: 10,
    priceId: 'price_1RSlBdQ4uabTTSX2FB42wYKN', // Standard Monthly - $10
    yearlyPriceId: 'price_1RSlRwQ4uabTTSX2waKHXIpn', // Standard Yearly - $96
    features: [
      'Access to MetaBloom mini and reasoning',
      'Standard voice mode',
      'Real-time data from the web with search',
      'Limited access to MetaBloom',
      'Limited access to file uploads, data analysis, and image generation',
    ],
  },
  premium: {
    name: 'Premium',
    price: 20,
    priceId: 'price_1RSlThQ4uabTTSX2vNrlcpaS', // Premium Monthly - $20
    yearlyPriceId: 'price_1RSlUIQ4uabTTSX2OuWNDMoI', // Premium Yearly - $192
    features: [
      'Access to MetaBloom mini and reasoning',
      'Standard voice mode',
      'Real-time data from the web with search',
      'Limited access to MetaBloom',
      'Limited access to file uploads, data analysis, and image generation',
      'Use custom MetaBloom',
    ],
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;
