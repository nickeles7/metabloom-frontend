"use client";

import React, { useState } from 'react';

interface CardImageTestProps {
  cardId: string;
  cardName?: string;
}

const CardImageTest: React.FC<CardImageTestProps> = ({ cardId, cardName }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const imageUrl = `https://art.hearthstonejson.com/v1/render/latest/enUS/512x/${cardId}.png`;

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    setIsLoading(false);
    console.log(`✅ Image loaded successfully for card: ${cardId}`);
  };

  const handleImageError = () => {
    setImageLoaded(false);
    setImageError(true);
    setIsLoading(false);
    console.log(`❌ Image failed to load for card: ${cardId}`);
  };

  return (
    <div className="border rounded-lg p-4 max-w-xs">
      <h3 className="text-lg font-semibold mb-2">
        {cardName || `Card ${cardId}`}
      </h3>
      
      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
        <strong>Card ID:</strong> {cardId}
      </div>
      
      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
        <strong>Image URL:</strong> 
        <br />
        <a 
          href={imageUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 break-all"
        >
          {imageUrl}
        </a>
      </div>

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {imageError ? (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md p-4 text-center">
            <div className="text-red-600 dark:text-red-400 mb-2">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <strong>Image failed to load</strong>
            </div>
            <p className="text-sm text-red-500 dark:text-red-300">
              The card image could not be loaded from HearthstoneJSON.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              This could be due to:
              <br />• Invalid card ID
              <br />• Network issues
              <br />• Card not available in the database
            </p>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={cardName || `Hearthstone card ${cardId}`}
            className={`w-full h-auto rounded-md transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ maxWidth: '256px' }}
          />
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        <strong>Status:</strong> {
          isLoading ? 'Loading...' : 
          imageLoaded ? '✅ Loaded' : 
          imageError ? '❌ Failed' : 'Unknown'
        }
      </div>
    </div>
  );
};

// Test component with multiple card IDs
const CardImageTestSuite: React.FC = () => {
  const testCards = [
    { id: 'ETC_418', name: 'Test Card ETC_418' },
    { id: 'CS2_029', name: 'Fireball' },
    { id: 'CS2_024', name: 'Frostbolt' },
    { id: 'EX1_298', name: 'Ragnaros the Firelord' },
    { id: 'INVALID_ID', name: 'Invalid Card (should fail)' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Hearthstone Card Image Test</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Testing image loading from HearthstoneJSON API. Check the console for detailed logs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testCards.map((card) => (
          <CardImageTest 
            key={card.id} 
            cardId={card.id} 
            cardName={card.name}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Instructions:</h3>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <li>• Each card should attempt to load its image from HearthstoneJSON</li>
          <li>• Valid cards should show the card image</li>
          <li>• Invalid cards should show an error message</li>
          <li>• Check the browser console for detailed loading logs</li>
          <li>• Click the image URL to test it directly in a new tab</li>
        </ul>
      </div>
    </div>
  );
};

export default CardImageTestSuite;
