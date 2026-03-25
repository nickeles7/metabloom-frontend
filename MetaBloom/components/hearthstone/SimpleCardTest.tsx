"use client";

import React, { useState, useEffect } from 'react';
import CardAwareText from './CardAwareText';
import { isCardDataReady } from '@/lib/hearthstone/cardData';

const SimpleCardTest: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkReady = () => {
      setIsReady(isCardDataReady());
    };

    checkReady();
    const interval = setInterval(checkReady, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isReady) {
    return (
      <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
        <p>Loading card data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Card Hover Test</h3>

      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <p className="text-sm font-medium mb-2">Basic Cards Test:</p>
        <CardAwareText
          text="Try hovering over Fireball and Frostbolt in this sentence!"
          className="text-sm"
        />
      </div>

      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
        <p className="text-sm font-medium mb-2">More Cards Test:</p>
        <CardAwareText
          text="Other cards like Flamestrike, Arcane Intellect, and Polymorph should also work."
          className="text-sm"
        />
      </div>

      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md">
        <p className="text-sm font-medium mb-2">Paladin Cards Test:</p>
        <CardAwareText
          text="Paladin cards: Righteous Protector, Consecration, Equality, and Blessing of Kings."
          className="text-sm"
        />
      </div>

      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
        <p className="text-sm font-medium mb-2">Dragon Cards Test:</p>
        <CardAwareText
          text="Dragon synergy: Dragonscale Armaments, Goldpetal Drake, Flutterwing Guardian, and Anachronos."
          className="text-sm"
        />
      </div>

      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
        <p className="text-sm font-medium mb-2">Legendary Test:</p>
        <CardAwareText
          text="Big threats: Malorne the Waywatcher and The Ceaseless Expanse (125 mana!)."
          className="text-sm"
        />
      </div>
    </div>
  );
};

export default SimpleCardTest;
