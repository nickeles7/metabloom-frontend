"use client";

import React, { useState, useEffect } from 'react';
import { 
  isCardDataReady, 
  getAllCardNames, 
  getCardByName, 
  cardDataService 
} from '@/lib/hearthstone/cardData';

const CardDataDebug: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [cardCount, setCardCount] = useState(0);
  const [sampleCards, setSampleCards] = useState<string[]>([]);
  const [testCardName, setTestCardName] = useState('Fireball');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    const checkStatus = () => {
      const ready = isCardDataReady();
      setIsReady(ready);
      
      if (ready) {
        const allCards = getAllCardNames();
        setCardCount(allCards.length);
        
        // Get a sample of card names for display
        const sample = allCards.slice(0, 20);
        setSampleCards(sample);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const testCardLookup = () => {
    if (!testCardName.trim()) return;
    
    const card = getCardByName(testCardName);
    setTestResult({
      searchTerm: testCardName,
      found: !!card,
      cardData: card
    });
  };

  const refreshCardData = async () => {
    try {
      await cardDataService.refresh();
      console.log('Card data refreshed');
    } catch (error) {
      console.error('Failed to refresh card data:', error);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Card Data Debug Panel</h2>
        
        {/* Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Status</h3>
            <div className={`text-lg font-bold ${isReady ? 'text-green-600' : 'text-yellow-600'}`}>
              {isReady ? '✅ Ready' : '⏳ Loading...'}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Card Count</h3>
            <div className="text-lg font-bold text-blue-600">
              {cardCount.toLocaleString()} cards
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Actions</h3>
            <button
              onClick={refreshCardData}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Sample Cards */}
        {isReady && sampleCards.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Sample Card Names (First 20)</h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {sampleCards.map((cardName, index) => (
                  <div key={index} className="text-gray-700 dark:text-gray-300">
                    {cardName}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Card Lookup Test */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Test Card Lookup</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={testCardName}
              onChange={(e) => setTestCardName(e.target.value)}
              placeholder="Enter card name..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={testCardLookup}
              disabled={!isReady}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
            >
              Test
            </button>
          </div>
          
          {testResult && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="mb-2">
                <strong>Search:</strong> "{testResult.searchTerm}"
              </div>
              <div className="mb-2">
                <strong>Found:</strong> {testResult.found ? '✅ Yes' : '❌ No'}
              </div>
              {testResult.cardData && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border">
                  <div className="text-sm space-y-1">
                    <div><strong>Name:</strong> {testResult.cardData.name}</div>
                    <div><strong>ID:</strong> {testResult.cardData.id}</div>
                    <div><strong>Type:</strong> {testResult.cardData.type}</div>
                    {testResult.cardData.cost !== undefined && (
                      <div><strong>Cost:</strong> {testResult.cardData.cost}</div>
                    )}
                    {testResult.cardData.attack !== undefined && (
                      <div><strong>Attack:</strong> {testResult.cardData.attack}</div>
                    )}
                    {testResult.cardData.health !== undefined && (
                      <div><strong>Health:</strong> {testResult.cardData.health}</div>
                    )}
                    {testResult.cardData.rarity && (
                      <div><strong>Rarity:</strong> {testResult.cardData.rarity}</div>
                    )}
                    {testResult.cardData.set && (
                      <div><strong>Set:</strong> {testResult.cardData.set}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Test Cards */}
        <div>
          <h3 className="font-semibold mb-3">Quick Test Cards</h3>
          <div className="flex flex-wrap gap-2">
            {[
              'Fireball', 'Frostbolt', 'Lightning Bolt', 'The Lich King', 
              'Ragnaros the Firelord', 'Zilliax', 'Dr. Boom', 'Deathwing',
              'Bloodmage Thalnos', 'Arcane Intellect', 'Flamestrike'
            ].map((cardName) => (
              <button
                key={cardName}
                onClick={() => {
                  setTestCardName(cardName);
                  setTimeout(() => {
                    const card = getCardByName(cardName);
                    setTestResult({
                      searchTerm: cardName,
                      found: !!card,
                      cardData: card
                    });
                  }, 100);
                }}
                disabled={!isReady}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50"
              >
                {cardName}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDataDebug;
