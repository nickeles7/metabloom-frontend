"use client";

import React from 'react';
import CardAwareText from '@/components/hearthstone/CardAwareText';
import CardDataDebug from '@/components/hearthstone/CardDataDebug';
import { isCardDataReady, getCardByName } from '@/lib/hearthstone/cardData';

export default function TestDeckCardsPage() {
  const [isReady, setIsReady] = React.useState(false);
  const [testResults, setTestResults] = React.useState<any[]>([]);

  React.useEffect(() => {
    const checkReady = () => {
      const ready = isCardDataReady();
      setIsReady(ready);
      
      if (ready) {
        // Test the specific cards from your deck
        const deckCards = [
          'Tour Guide', 'Wildfire', 'Seabreeze Chalice', 'Ancient Mysteries',
          'Sing-Along Buddy', 'Divination', 'Bitterbloom Knight', 'Spirit Gatherer',
          'Ice Block', 'Flame Ward', 'Objection!', 'Holotechnician',
          'Burndown', 'Reckless Apprentice', 'Flutterwing Guardian', 'Wisprider',
          'Mordresh Fire Eye'
        ];
        
        const results = deckCards.map(cardName => {
          const card = getCardByName(cardName);
          return {
            name: cardName,
            found: !!card,
            card: card
          };
        });
        
        setTestResults(results);
        console.log('🧪 Deck card test results:', results);
      }
    };

    checkReady();
    const interval = setInterval(checkReady, 1000);

    return () => clearInterval(interval);
  }, []);

  const deckText = `Here's your deck:

2x Tour Guide (1 mana)
2x Wildfire (1 mana)
1x Seabreeze Chalice (1 mana)
2x Ancient Mysteries (2 mana)
2x Sing-Along Buddy (2 mana)
2x Divination (2 mana)
2x Bitterbloom Knight (2 mana)
2x Spirit Gatherer (2 mana)
2x Ice Block (3 mana)
1x Flame Ward (3 mana)
2x Objection! (3 mana)
1x Holotechnician (3 mana)
2x Burndown (3 mana)
2x Reckless Apprentice (4 mana)
2x Flutterwing Guardian (4 mana)
2x Wisprider (5 mana)
1x Mordresh Fire Eye (8 mana)

This deck focuses on spell synergy and card draw.`;

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-4">Loading Card Data...</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we load the Hearthstone card database.
            </p>
            <div className="mt-4">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-300 h-4 w-4"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h1 className="text-3xl font-bold mb-4">Deck Card Detection Test</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This page tests the card detection for the specific deck you mentioned. 
            Each card name should be detected and made hoverable.
          </p>
        </div>

        {/* Debug Panel */}
        <CardDataDebug />

        {/* Test Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">Card Detection Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg border ${
                  result.found 
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{result.name}</span>
                  <span className={`text-sm ${result.found ? 'text-green-600' : 'text-red-600'}`}>
                    {result.found ? '✅ FOUND' : '❌ NOT FOUND'}
                  </span>
                </div>
                {result.card && (
                  <div className="text-xs text-gray-500 mt-1">
                    ID: {result.card.id} | Cost: {result.card.cost}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Deck Display Test */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">Deck Display Test</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The card names below should be automatically detected and made hoverable:
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <CardAwareText text={deckText} />
          </div>
        </div>

        {/* Expected vs Actual */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Expected Behavior</h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>• <strong>ALL cards should be detected:</strong> Not just "Ice Block"</li>
            <li>• <strong>Cards should be hoverable:</strong> Blue underlined text with tooltips</li>
            <li>• <strong>Images should load:</strong> Card images from HearthstoneJSON API</li>
            <li>• <strong>Case insensitive:</strong> "Tour Guide" = "tour guide"</li>
            <li>• <strong>No false positives:</strong> Regular words should not be highlighted</li>
          </ul>
        </div>

        {/* Troubleshooting */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Troubleshooting</h2>
          <div className="space-y-3 text-sm">
            <div>
              <strong>If only "Ice Block" is detected:</strong>
              <p className="text-gray-600 dark:text-gray-400">
                The API is failing and falling back to hardcoded cards. Check the browser console for API errors.
              </p>
            </div>
            <div>
              <strong>If no cards are detected:</strong>
              <p className="text-gray-600 dark:text-gray-400">
                The card data service is not initializing properly. Check the console for initialization errors.
              </p>
            </div>
            <div>
              <strong>If cards are detected but not hoverable:</strong>
              <p className="text-gray-600 dark:text-gray-400">
                The CardAwareText component is not properly rendering the hover elements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
