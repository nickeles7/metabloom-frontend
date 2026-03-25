"use client";

import React from 'react';
import CardImageTestSuite from '@/components/hearthstone/CardImageTest';
import CardAwareText from '@/components/hearthstone/CardAwareText';
import SimpleCardMarkdown from '@/components/hearthstone/SimpleCardMarkdown';
import CardHoverTest from '@/components/hearthstone/CardHoverTest';

export default function TestCardsPage() {
  const testMarkdown = `
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

### Paladin Cards
Try **Righteous Protector**, **Consecration**, and **Equality** for board control.

### Dragon Synergy
Cards like **Dragonscale Armaments**, **Goldpetal Drake**, and **Anachronos** work well together.
`;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto py-8 space-y-8">

        {/* Card Hover Test */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Card Hover Test</h2>

          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-md">
              <h3 className="font-semibold mb-2">Simple Text Test:</h3>
              <CardAwareText text="Try hovering over Fireball and Frostbolt in this sentence!" />
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-md">
              <h3 className="font-semibold mb-2">Dynamic Card Detection Test:</h3>
              <CardAwareText text="This should detect any Hearthstone card names from the full database, like Lightning Bolt, The Lich King, or Zilliax." />
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-md">
              <h3 className="font-semibold mb-2">AI Response Simulation:</h3>
              <CardAwareText text="For your deck, I recommend adding Flamestrike for board clear, Arcane Intellect for card draw, and maybe consider Polymorph for removal." />
            </div>
          </div>
        </div>

        {/* Markdown Test */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Markdown with Card Hover Test</h2>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-md">
            <SimpleCardMarkdown content={testMarkdown} className="prose dark:prose-invert max-w-none" />
          </div>
        </div>

        {/* Comprehensive Card Hover Test */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Comprehensive Card Hover Test</h2>
          <CardHoverTest />
        </div>

        {/* Image Loading Test */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Image Loading Test</h2>
          <CardImageTestSuite />
        </div>

      </div>
    </div>
  );
}
