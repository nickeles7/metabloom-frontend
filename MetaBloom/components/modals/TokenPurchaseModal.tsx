import React, { useState } from 'react';
import { PiCreditCard, PiSpinner, PiRobot } from 'react-icons/pi';
import { useAuth } from '@/stores/auth';
import { useTokenUsage } from '@/stores/tokenUsage';

const TokenPurchaseModal: React.FC = () => {
  const [purchaseAmount, setPurchaseAmount] = useState<number | ''>(''); // Start empty
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();
  const { syncWithFirebase } = useTokenUsage();

  // Calculate tokens based on purchase amount ($1 = 5,000 tokens)
  const tokensToReceive = typeof purchaseAmount === 'number' ? purchaseAmount * 5000 : 0;

  // Calculate approximate messages (600 tokens ≈ 1 message)
  const approximateMessages = Math.floor(tokensToReceive / 600);

  const handlePurchase = async () => {
    if (!user?.uid) {
      setError('Please sign in to purchase tokens');
      return;
    }

    // Validate purchase amount
    if (purchaseAmount === '' || typeof purchaseAmount !== 'number') {
      setError('Please select a purchase amount');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      // Create Stripe checkout session for token purchase
      const response = await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          amount: purchaseAmount,
          tokens: tokensToReceive,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.checkoutUrl) {
          // Clean implementation: Try new tab first, fallback to same tab only if blocked
          const newTab = window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');

          // Simple, reliable popup detection
          if (!newTab || newTab.closed) {
            // Popup was definitely blocked, redirect current tab
            console.log('Popup blocked, redirecting in current tab');
            window.location.href = result.checkoutUrl;
          } else {
            // New tab opened successfully - do nothing else
            console.log('Stripe checkout opened in new tab');
          }
        } else {
          // Direct token addition (for testing or if no Stripe)
          setSuccess(`Successfully added approximately ${approximateMessages} messages (${tokensToReceive.toLocaleString()} tokens) to your account!`);

          // Sync with Firebase to get updated token count
          setTimeout(() => {
            syncWithFirebase(user.uid);
          }, 1000);
        }
      } else {
        setError(result.error || 'Failed to process purchase');
      }
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      setError('Failed to process purchase. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAmountSelect = (amount: number) => {
    setPurchaseAmount(amount);
    setError(''); // Clear any existing errors
  };

  return (
    <div className="bg-white dark:bg-n0 rounded-xl max-w-md w-full mx-auto">
      <div className="p-4 flex flex-col items-center">
        {/* Header with Icon */}
        <div className="text-center mb-4 w-full">
          <div className="flex flex-col items-center justify-center mb-3">
            <div className="relative mb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <PiCreditCard className="text-3xl text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">+</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-n700 dark:text-n30 mb-2">
              Boost Your Messages
            </h2>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              ⚡ Instant top-up • 🚀 Never expire • 📈 Stack with subscription
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="mb-2 text-center w-full">
          <p className="text-n600 dark:text-n200 mb-1 leading-relaxed">
           Want to create more decks? Top up with extra messages as needed!
          </p>
        </div>

        {/* Purchase Amount Buttons */}
        <div className="mb-4 text-center w-full">
          <p className="text-sm text-n600 dark:text-n400 mb-4 font-medium">
            Choose your recharge amount:
          </p>
          <div className="space-y-3 max-w-sm mx-auto">
            {/* First row - 3 buttons */}
            <div className="grid grid-cols-3 gap-3">
              {[3, 5, 10].map((amount) => {
                const tokens = amount * 5000;
                const messages = Math.floor(tokens / 600);
                const isSelected = purchaseAmount === amount;

                return (
                  <button
                    key={amount}
                    onClick={() => handleAmountSelect(amount)}
                    className={`
                      p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 font-medium
                      ${isSelected
                        ? 'border-blue-500 bg-blue-500 text-white shadow-lg'
                        : 'border-gray-300 bg-white hover:border-blue-400 hover:shadow-md text-gray-800 dark:bg-gray-50 dark:border-gray-400 dark:text-gray-900'
                      }
                    `}
                  >
                    <div className="text-lg font-bold">${amount}</div>
                    <div className="text-xs opacity-75">{messages} msgs</div>
                  </button>
                );
              })}
            </div>

            {/* Second row - 2 buttons centered */}
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              {[15, 20].map((amount) => {
                const tokens = amount * 5000;
                const messages = Math.floor(tokens / 600);
                const isSelected = purchaseAmount === amount;

                return (
                  <button
                    key={amount}
                    onClick={() => handleAmountSelect(amount)}
                    className={`
                      p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 font-medium
                      ${isSelected
                        ? 'border-blue-500 bg-blue-500 text-white shadow-lg'
                        : 'border-gray-300 bg-white hover:border-blue-400 hover:shadow-md text-gray-800 dark:bg-gray-50 dark:border-gray-400 dark:text-gray-900'
                      }
                    `}
                  >
                    <div className="text-lg font-bold">${amount}</div>
                    <div className="text-xs opacity-75">{messages} msgs</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>



        {/* Error/Success Messages */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center w-full">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center w-full">
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center mb-3 w-full">
          <button
            onClick={handlePurchase}
            disabled={isProcessing}
            className="bg-primaryColor text-white py-3 px-8 rounded-lg font-medium hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[200px]"
          >
            {isProcessing ? (
              <>
                <PiSpinner className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PiCreditCard />
                {purchaseAmount && typeof purchaseAmount === 'number'
                  ? `Recharge ${approximateMessages} Messages ($${purchaseAmount})`
                  : 'Recharge Robot'
                }
              </>
            )}
          </button>
        </div>

        {/* Additional Info */}
        <div className="text-center w-full">
          <p className="text-xs text-n500">
            💡 Pro tip: Purchased messages stack with your subscription and never expire - keep your AI powered up!
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokenPurchaseModal;
