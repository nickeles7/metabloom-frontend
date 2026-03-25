"use client";

import React, { useState } from 'react';
import { useAuth } from '@/stores/auth';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useMainModal } from '@/stores/modal';
import DowngradeBanner from '@/components/subscription/DowngradeBanner';
import DowngradeNotification from '@/components/subscription/DowngradeNotification';
import BillingPeriodNotification from '@/components/subscription/BillingPeriodNotification';
import DowngradeCountdown from '@/components/subscription/DowngradeCountdown';

function DebugDowngradePage() {
  const { user } = useAuth();
  const { modalOpen } = useMainModal();
  const {
    subscriptionData,
    hasPendingDowngrade,
    getPendingDowngrade,
    getDaysUntilDowngrade,
    getDowngradeDate,
    getDowngradeMessage,
    getCurrentPeriodEnd,
    getDaysUntilPeriodEnd,
    getBillingPeriodMessage,
    willDowngradeAtPeriodEnd,
    refreshSubscription,
    currentPlan,
    getPlanDisplayName
  } = useUserSubscription();

  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDebugInfo = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/debug/subscription-debug?userId=${user.uid}`);
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      console.error('Error fetching debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulateDowngrade = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/debug/subscription-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          action: 'simulate-downgrade'
        })
      });
      const data = await response.json();
      console.log('Simulate result:', data);
      
      // Refresh subscription data
      refreshSubscription(true);
      await fetchDebugInfo();
    } catch (error) {
      console.error('Error simulating downgrade:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearDowngrade = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/debug/subscription-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          action: 'clear-downgrade'
        })
      });
      const data = await response.json();
      console.log('Clear result:', data);
      
      // Refresh subscription data
      refreshSubscription(true);
      await fetchDebugInfo();
    } catch (error) {
      console.error('Error clearing downgrade:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Debug Downgrade System</h1>
        <p>Please sign in to test the downgrade system.</p>
      </div>
    );
  }

  const pendingDowngrade = getPendingDowngrade();
  const hasPending = hasPendingDowngrade();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Downgrade System</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">User Info</h2>
        <p><strong>User ID:</strong> {user.uid}</p>
        <p><strong>Email:</strong> {user.email}</p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Effective Plan Display</h2>
        <p><strong>Current Plan (Frontend Display):</strong> {currentPlan}</p>
        <p><strong>Plan Display Name:</strong> {getPlanDisplayName()}</p>
        <p><strong>Database Plan Type:</strong> {subscriptionData?.subscription?.planType || 'N/A'}</p>
        <p><strong>Has Active Subscription:</strong> {subscriptionData?.hasActiveSubscription ? 'Yes' : 'No'}</p>
        {subscriptionData?.subscription?.planType !== currentPlan && (
          <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded border">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              ⚠️ Effective plan differs from database plan - this is expected during downgrades!
            </p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Current Subscription Status</h2>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <p><strong>Plan:</strong> {subscriptionData?.currentPlan || 'Unknown'}</p>
          <p><strong>Has Active:</strong> {subscriptionData?.hasActiveSubscription ? 'Yes' : 'No'}</p>
          <p><strong>Status:</strong> {subscriptionData?.subscription?.status || 'Unknown'}</p>
          <p><strong>Current Period End:</strong> {getCurrentPeriodEnd()?.toISOString() || 'None'}</p>
          <p><strong>Days Until Period End:</strong> {getDaysUntilPeriodEnd()}</p>
          <p><strong>Will Downgrade:</strong> {willDowngradeAtPeriodEnd() ? 'Yes' : 'No'}</p>
          <p><strong>Cancel At Period End:</strong> {subscriptionData?.subscription?.cancelAtPeriodEnd ? 'Yes' : 'No'}</p>
          <p><strong>Billing Message:</strong> {getBillingPeriodMessage() || 'None'}</p>
          <p><strong>Has Pending Downgrade:</strong> {hasPending ? 'Yes' : 'No'}</p>
          {hasPending && (
            <div className="mt-2">
              <p><strong>Downgrade Message:</strong> {getDowngradeMessage()}</p>
              <p><strong>Days Until:</strong> {getDaysUntilDowngrade()}</p>
              <p><strong>Effective Date:</strong> {getDowngradeDate()?.toISOString()}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Actions</h2>
        <div className="flex gap-4">
          <button
            onClick={fetchDebugInfo}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch Debug Info'}
          </button>
          <button
            onClick={simulateDowngrade}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            Simulate Downgrade
          </button>
          <button
            onClick={clearDowngrade}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Clear Downgrade
          </button>
          <button
            onClick={() => refreshSubscription(true)}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Refresh Subscription
          </button>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              modalOpen('DowngradeConfirmation', {
                targetPlan: 'Standard',
                targetPlanType: 'standard',
                currentPlan: 'premium',
                originalModalParams: {
                  planName: 'Standard',
                  planType: 'standard',
                  planPrice: 15
                }
              });
            }}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
          >
            Test Premium → Standard Modal
          </button>

          <button
            onClick={() => {
              modalOpen('Notification', {
                type: 'success',
                title: 'Subscription Updated Successfully!',
                message: 'Your subscription has been upgraded to Premium. You now have access to all the features of your new plan.',
                confirmText: 'Great!',
                onConfirm: () => {
                  console.log('Success modal confirmed!');
                }
              });
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            Test Success Modal
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium mb-3">Countdown Timer Examples:</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium w-20">7 days:</span>
              <DowngradeCountdown
                endDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
                targetPlan="Standard"
                variant="minimal"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium w-20">1 day:</span>
              <DowngradeCountdown
                endDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
                targetPlan="Free"
                variant="minimal"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium w-20">2 hours:</span>
              <DowngradeCountdown
                endDate={new Date(Date.now() + 2 * 60 * 60 * 1000)}
                targetPlan="Standard"
                variant="minimal"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium w-20">30 min:</span>
              <DowngradeCountdown
                endDate={new Date(Date.now() + 30 * 60 * 1000)}
                targetPlan="Free"
                variant="minimal"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium w-20">Compact:</span>
              <DowngradeCountdown
                endDate={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)}
                targetPlan="Standard"
                variant="compact"
              />
            </div>
          </div>
        </div>
      </div>

      {debugInfo && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Debug Info</h2>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">UI Components Test</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Billing Period Notification (Always shows if you have active subscription):</h3>
            <BillingPeriodNotification variant="detailed" />
          </div>

          <div>
            <h3 className="font-medium mb-2">Billing Period Banner:</h3>
            <BillingPeriodNotification variant="banner" />
          </div>

          <div>
            <h3 className="font-medium mb-2">Billing Period Compact:</h3>
            <BillingPeriodNotification variant="compact" />
          </div>
        </div>

        {hasPending && (
          <div className="space-y-4 mt-6">
            <div>
              <h3 className="font-medium mb-2">Legacy Downgrade Banner:</h3>
              <DowngradeBanner />
            </div>

            <div>
              <h3 className="font-medium mb-2">Legacy Downgrade Notification (Detailed):</h3>
              <DowngradeNotification
                fromPlan={pendingDowngrade?.fromPlan || 'premium'}
                toPlan={pendingDowngrade?.toPlan || 'standard'}
                daysUntilDowngrade={getDaysUntilDowngrade()}
                downgradeDate={getDowngradeDate() || new Date()}
                reason={pendingDowngrade?.reason || 'user_initiated'}
                variant="detailed"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DebugDowngradePage;
