"use client";

import React from 'react';
import AiReply from '@/components/chatComponents/AiReply';
import CardDataDebug from '@/components/hearthstone/CardDataDebug';
import { isCardDataReady } from '@/lib/hearthstone/cardData';

export default function TestAiCardsPage() {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const checkReady = () => {
      setIsReady(isCardDataReady());
    };

    checkReady();
    const interval = setInterval(checkReady, 1000);

    return () => clearInterval(interval);
  }, []);

  // Mock AI responses that should have card names detected
  const mockAiResponses = [
    {
      id: 'test-1',
      text: `# Mage Deck Recommendation

For a strong Mage deck, I recommend including these key cards:

**Core Spells:**
- Fireball - Essential direct damage
- Frostbolt - Great early game removal
- Flamestrike - Excellent board clear
- Arcane Intellect - Card draw is crucial

**Control Options:**
- Polymorph - Hard removal for big threats
- Counterspell - Disrupts opponent's plans
- Ice Block - Survival tool

**Win Conditions:**
- Pyroblast - Finisher spell
- Ragnaros the Firelord - Powerful late game threat

This combination gives you early game control with Frostbolt, mid-game board presence, and late game power with Pyroblast and Ragnaros the Firelord.`,
      replyTime: 'just now'
    },
    {
      id: 'test-2', 
      text: `Looking at the current meta, here are some strong card choices:

**Neutral Legendaries:**
- The Lich King provides great value
- Zilliax offers healing and board presence
- Dr. Boom gives explosive turns

**Class Specific:**
- Lightning Bolt is excellent for Shaman
- Blessing of Kings works well in Paladin
- Consecration clears small boards effectively

Consider your mana curve when building - you want early game like Acidic Swamp Ooze, mid-game threats, and powerful late game finishers.`,
      replyTime: '2 min ago'
    },
    {
      id: 'test-3',
      text: `**Deck Building Tips:**

1. **Early Game (1-3 mana):** Include cards like Kobold Geomancer for spell power
2. **Mid Game (4-6 mana):** Consider Guardian of Kings for healing
3. **Late Game (7+ mana):** Deathwing can be a game-changer

**Synergies to Consider:**
- Bloodmage Thalnos works great with damage spells
- Mirror Entity can steal opponent's threats
- Ice Barrier provides extra survivability

Remember: A good deck balances offense and defense. Cards like Frost Nova can buy you time while you set up your win conditions.`,
      replyTime: '5 min ago'
    }
  ];

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-4">Loading Card Data...</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we load the Hearthstone card database. This may take a moment on first load.
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
          <h1 className="text-3xl font-bold mb-4">AI Response Card Detection Test</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This page tests the dynamic card name detection in AI responses. Card names should be automatically 
            detected and made hoverable with tooltips showing card images from the HearthstoneJSON API.
          </p>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">✅ Card Data Ready!</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Hover over any blue underlined card names in the AI responses below to see their images and details.
            </p>
          </div>
        </div>

        {/* Debug Panel */}
        <CardDataDebug />

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Mock AI Responses</h2>
          
          {mockAiResponses.map((response, index) => (
            <div key={response.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Response {index + 1}</h3>
              <div className="border-l-4 border-blue-500 pl-4">
                <AiReply
                  replyText={response.text}
                  replyTime={response.replyTime}
                  isStreaming={false}
                  messageId={response.id}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Test Instructions</h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>• <strong>Hover over card names:</strong> Blue underlined text should show card tooltips</li>
            <li>• <strong>Image loading:</strong> Card images should load from HearthstoneJSON API</li>
            <li>• <strong>Dynamic detection:</strong> Any valid Hearthstone card name should be detected</li>
            <li>• <strong>Markdown support:</strong> Card detection works in headers, lists, and formatted text</li>
            <li>• <strong>Case insensitive:</strong> Card names work regardless of capitalization</li>
            <li>• <strong>No false positives:</strong> Regular words should not be highlighted</li>
          </ul>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Expected Card Detections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Mage Spells:</h3>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Fireball</li>
                <li>• Frostbolt</li>
                <li>• Flamestrike</li>
                <li>• Arcane Intellect</li>
                <li>• Polymorph</li>
                <li>• Counterspell</li>
                <li>• Ice Block</li>
                <li>• Pyroblast</li>
                <li>• Frost Nova</li>
                <li>• Ice Barrier</li>
                <li>• Mirror Entity</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Legendary Minions:</h3>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Ragnaros the Firelord</li>
                <li>• The Lich King</li>
                <li>• Zilliax</li>
                <li>• Dr. Boom</li>
                <li>• Bloodmage Thalnos</li>
                <li>• Deathwing</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Other Cards:</h3>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Lightning Bolt</li>
                <li>• Blessing of Kings</li>
                <li>• Consecration</li>
                <li>• Acidic Swamp Ooze</li>
                <li>• Kobold Geomancer</li>
                <li>• Guardian of Kings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
