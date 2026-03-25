"use client";

import { useState } from 'react';
import { useAuth } from '@/stores/auth';

export default function TestSubscription() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const simulateWebhook = async (planType: 'standard' | 'premium') => {
    if (!user?.uid) {
      alert('Please sign in first');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test/simulate-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          planType,
          sessionId: `cs_test_${Date.now()}`,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        alert(`✅ Successfully simulated ${planType} subscription! Check your subscription status.`);
        // Refresh the page to see updated subscription
        window.location.reload();
      } else {
        alert(`❌ Failed to simulate subscription: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error simulating webhook');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    if (!user?.uid) {
      alert('Please sign in first');
      return;
    }

    try {
      const response = await fetch(`/api/subscription/status?userId=${user.uid}`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error checking subscription');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Test Subscription System</h1>
        
        {user ? (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="mb-4">Signed in as: <strong>{user.email}</strong></p>
            <p className="mb-6">User ID: <code className="bg-gray-100 px-2 py-1 rounded">{user.uid}</code></p>
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Simulate Webhook (Manual Test)</h2>
              <p className="text-sm text-gray-600">
                Since webhooks don't work on localhost, use these buttons to manually simulate a successful subscription.
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => simulateWebhook('standard')}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Simulate Standard Plan'}
                </button>
                
                <button
                  onClick={() => simulateWebhook('premium')}
                  disabled={loading}
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Simulate Premium Plan'}
                </button>
              </div>
              
              <button
                onClick={checkSubscription}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Check Current Subscription
              </button>
            </div>
            
            {result && (
              <div className="mt-6 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Result:</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p>Please sign in to test the subscription system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
