import Stripe from 'stripe';

/**
 * Utility functions to calculate subscription periods when Stripe doesn't provide them
 * 
 * This handles the common issue where Stripe test subscriptions don't populate
 * current_period_start and current_period_end fields properly.
 */

export interface CalculatedPeriod {
  current_period_start: number;
  current_period_end: number;
  source: 'stripe' | 'calculated' | 'invoice';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Calculate subscription period from various Stripe data sources
 */
export async function calculateSubscriptionPeriod(
  stripe: Stripe,
  subscription: Stripe.Subscription
): Promise<CalculatedPeriod> {
  
  // Method 1: Use Stripe's period data if available (highest confidence)
  if ((subscription as any).current_period_start && (subscription as any).current_period_end) {
    return {
      current_period_start: (subscription as any).current_period_start,
      current_period_end: (subscription as any).current_period_end,
      source: 'stripe',
      confidence: 'high'
    };
  }

  // Method 2: Get period from latest invoice (high confidence)
  try {
    const latestInvoice = await getLatestInvoiceWithPeriod(stripe, subscription.id);
    if (latestInvoice) {
      return {
        current_period_start: latestInvoice.period_start,
        current_period_end: latestInvoice.period_end,
        source: 'invoice',
        confidence: 'high'
      };
    }
  } catch (error) {
    console.warn('Failed to fetch invoice period data:', error);
  }

  // Method 3: Calculate from subscription data (medium confidence)
  const calculatedPeriod = calculatePeriodFromSubscription(subscription);
  if (calculatedPeriod) {
    return {
      ...calculatedPeriod,
      source: 'calculated',
      confidence: 'medium'
    };
  }

  // Fallback: Use start_date as both start and end (low confidence)
  const startDate = subscription.start_date || subscription.created;
  return {
    current_period_start: startDate,
    current_period_end: startDate,
    source: 'calculated',
    confidence: 'low'
  };
}

/**
 * Get the latest invoice with period information
 */
async function getLatestInvoiceWithPeriod(
  stripe: Stripe,
  subscriptionId: string
): Promise<{ period_start: number; period_end: number } | null> {
  
  try {
    // Get invoices for this subscription
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 5,
      status: 'paid'
    });

    // Find the most recent invoice with line items that have periods
    for (const invoice of invoices.data) {
      if (invoice.lines.data.length > 0) {
        const lineItem = invoice.lines.data[0];
        if (lineItem.period?.start && lineItem.period?.end) {
          return {
            period_start: lineItem.period.start,
            period_end: lineItem.period.end
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.warn('Error fetching invoice period:', error);
    return null;
  }
}

/**
 * Calculate period from subscription metadata
 */
function calculatePeriodFromSubscription(
  subscription: Stripe.Subscription
): { current_period_start: number; current_period_end: number } | null {
  
  const startDate = subscription.start_date || subscription.created;
  
  // Get the billing interval from the first price item
  const firstItem = subscription.items.data[0];
  if (!firstItem?.price.recurring) {
    return null;
  }

  const { interval, interval_count } = firstItem.price.recurring;
  
  // Calculate period end based on interval
  const periodStart = startDate;
  let periodEnd: number;

  switch (interval) {
    case 'day':
      periodEnd = periodStart + (interval_count * 24 * 60 * 60);
      break;
    case 'week':
      periodEnd = periodStart + (interval_count * 7 * 24 * 60 * 60);
      break;
    case 'month':
      // Approximate month calculation (30 days)
      periodEnd = periodStart + (interval_count * 30 * 24 * 60 * 60);
      break;
    case 'year':
      // Approximate year calculation (365 days)
      periodEnd = periodStart + (interval_count * 365 * 24 * 60 * 60);
      break;
    default:
      return null;
  }

  return {
    current_period_start: periodStart,
    current_period_end: periodEnd
  };
}

/**
 * Enhanced timestamp conversion with period calculation fallback
 */
export function safeTimestampConversionWithFallback(
  timestamp: any,
  fallbackCalculation?: () => number
): number | undefined {
  
  // Try normal conversion first
  if (timestamp !== undefined && timestamp !== null) {
    const numericTimestamp = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
    if (!isNaN(numericTimestamp) && numericTimestamp > 0) {
      return Math.floor(numericTimestamp) * 1000;
    }
  }

  // Use fallback calculation if provided
  if (fallbackCalculation) {
    try {
      const calculated = fallbackCalculation();
      if (calculated > 0) {
        return calculated;
      }
    } catch (error) {
      console.warn('Fallback calculation failed:', error);
    }
  }

  return undefined;
}

/**
 * Get subscription with calculated periods
 */
export async function getSubscriptionWithPeriods(
  stripe: Stripe,
  subscriptionId: string
): Promise<Stripe.Subscription & { calculatedPeriod?: CalculatedPeriod }> {
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const calculatedPeriod = await calculateSubscriptionPeriod(stripe, subscription);
  
  return {
    ...subscription,
    calculatedPeriod
  };
}

/**
 * Utility to format period information for logging
 */
export function formatPeriodInfo(period: CalculatedPeriod): string {
  const start = new Date(period.current_period_start * 1000).toISOString();
  const end = new Date(period.current_period_end * 1000).toISOString();
  return `${start} to ${end} (${period.source}, ${period.confidence} confidence)`;
}

/**
 * Check if a subscription period is likely accurate
 */
export function isPeriodReliable(period: CalculatedPeriod): boolean {
  // Consider it reliable if:
  // 1. It comes from Stripe directly, OR
  // 2. It comes from invoice data, OR  
  // 3. It's calculated with high confidence and the period makes sense
  
  if (period.source === 'stripe' || period.source === 'invoice') {
    return true;
  }
  
  if (period.source === 'calculated' && period.confidence === 'medium') {
    // Check if the period duration makes sense (between 1 day and 2 years)
    const duration = period.current_period_end - period.current_period_start;
    const oneDaySeconds = 24 * 60 * 60;
    const twoYearsSeconds = 2 * 365 * 24 * 60 * 60;
    
    return duration >= oneDaySeconds && duration <= twoYearsSeconds;
  }
  
  return false;
}
