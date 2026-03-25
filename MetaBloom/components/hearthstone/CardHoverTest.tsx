"use client";

import React, { useState, useEffect } from 'react';
import CardAwareText from './CardAwareText';
import CardAwareMarkdown from './CardAwareMarkdown';
import { isCardDataReady, cardDataService } from '@/lib/hearthstone/cardData';
import { getImageCacheStats } from '@/lib/hearthstone/imagePreloader';

const CardHoverTest: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);

  useEffect(() => {
    const checkReady = () => {
      setIsReady(isCardDataReady());
      setCacheStats(getImageCacheStats());
    };

    checkReady();
    const interval = setInterval(checkReady, 1000);

    return () => clearInterval(interval);
  }, []);

  const testTexts = [
    "I recommend using Fireball and Frostbolt in your deck.",
    "The best cards for this meta are Zilliax and Dr. Boom.",
    "Consider adding Arcane Intellect for card draw.",
    "Ragnaros the Firelord is a powerful late-game threat.",
    "**Bold text with Flamestrike** and *italic with Ice Block*.",
    "Here's a list:\n- Polymorph\n- Counterspell\n- Mirror Entity",
    "Some cards like Lightning Bolt deal 3 damage.",
    "The Lich King and Deathwing are both powerful dragons."
  ];

  const markdownTest = `
# Hearthstone Deck Guide

This deck focuses on **control** and uses several key cards:

## Core Cards
- **Flamestrike**: Great for board clear
- **Arcane Intellect**: Essential card draw
- **Counterspell**: Protects your plays

## Win Conditions
1. **Ragnaros the Firelord** - Late game threat
2. **Pyroblast** - Direct damage finisher

### Mulligan Guide
Always keep **Frostbolt** and **Fireball** in your opening hand.

> "Well played!" - Jaina Proudmoore
`;

  if (!isReady) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Loading Card Data...</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Fetching Hearthstone card database. This may take a moment on first load.
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
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Card Hover System Test</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Hover over card names to see their images and details. Card data is ready!
        </p>
        
        {cacheStats && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Cache Stats: {cacheStats.successfullyLoaded} loaded, {cacheStats.failedToLoad} failed, {cacheStats.queueLength} queued
          </div>
        )}
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-lg font-semibold mb-3">Plain Text Tests</h3>
          <div className="space-y-3">
            {testTexts.map((text, index) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <CardAwareText text={text} className="text-sm" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-3">Markdown Test</h3>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
            <CardAwareMarkdown 
              content={markdownTest}
              className="prose dark:prose-invert max-w-none"
            />
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-3">Edge Cases</h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <CardAwareText 
                text="This text has no card names, just regular words like fire and ice." 
                className="text-sm"
              />
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <CardAwareText 
                text="Invalid card names like Nonexistent Card and Fake Spell should not be highlighted." 
                className="text-sm"
              />
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <CardAwareText 
                text="Multiple instances of Fireball and Fireball again should work correctly." 
                className="text-sm"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-3">Performance Test</h3>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <CardAwareText 
              text="This is a longer text with many card names: Fireball, Frostbolt, Polymorph, Counterspell, Mirror Entity, Flamestrike, Arcane Intellect, Pyroblast, Ice Block, Ice Barrier, Frost Nova, Blizzard, Cone of Cold, and Arcane Missiles. All of these should be detected and hoverable." 
              className="text-sm"
            />
          </div>
        </section>
      </div>

      <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Test Instructions</h3>
        <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
          <li>• Hover over any blue underlined card name to see the tooltip</li>
          <li>• Tooltips should appear near your cursor with card images</li>
          <li>• Images should load smoothly (preloaded in background)</li>
          <li>• Tooltips should work in both light and dark modes</li>
          <li>• Non-card words should not be highlighted</li>
          <li>• Multiple instances of the same card should all work</li>
        </ul>
      </div>
    </div>
  );
};

export default CardHoverTest;
