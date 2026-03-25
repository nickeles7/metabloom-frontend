"use client";
import React, { useState, useEffect } from "react";
import { Wheel } from "react-custom-roulette";
import { PiSparkle, PiTrophy, PiCards, PiX, PiCopy, PiCheck, PiStar, PiFire } from "react-icons/pi";
import { SavedDeck } from "@/lib/subscription";

interface DeckSpinnerProps {
  decks: SavedDeck[];
  onClose: () => void;
  onDeckSelected?: (deck: SavedDeck) => void;
}

// Helper function to get class-specific colors for wheel segments
const getClassColor = (className: string): string => {
  const classColors: Record<string, string> = {
    'Warrior': '#dc2626', // red-600
    'Paladin': '#f59e0b', // amber-500
    'Hunter': '#059669', // emerald-600
    'Rogue': '#4b5563', // gray-600
    'Priest': '#3b82f6', // blue-500
    'Shaman': '#7c3aed', // violet-600
    'Mage': '#06b6d4', // cyan-500
    'Warlock': '#9333ea', // purple-600
    'Druid': '#65a30d', // lime-600
    'Demon Hunter': '#047857', // emerald-700
    'Death Knight': '#374151', // gray-700
  };
  return classColors[className] || '#6366f1'; // indigo-500 as default
};

// Helper function to get contrasting text color
const getTextColor = (backgroundColor: string): string => {
  // For darker colors, use white text
  const darkColors = ['#dc2626', '#4b5563', '#7c3aed', '#9333ea', '#047857', '#374151'];
  return darkColors.includes(backgroundColor) ? '#ffffff' : '#000000';
};

function DeckSpinner({ decks, onClose, onDeckSelected }: DeckSpinnerProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [selectedDeck, setSelectedDeck] = useState<SavedDeck | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [copiedDeckId, setCopiedDeckId] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Prepare wheel data from decks
  const wheelData = decks.map((deck) => {
    const backgroundColor = getClassColor(deck.className);
    const textColor = getTextColor(backgroundColor);
    
    return {
      option: deck.name.length > 20 ? `${deck.name.substring(0, 17)}...` : deck.name,
      style: {
        backgroundColor,
        textColor,
        fontSize: decks.length > 8 ? 12 : 14, // Smaller text for more segments
      },
    };
  });

  const handleSpinClick = () => {
    if (!mustSpin && decks.length > 0) {
      const newPrizeNumber = Math.floor(Math.random() * decks.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
      setIsSpinning(true);
      setShowResult(false);
      setSelectedDeck(null);
    }
  };

  const handleStopSpinning = () => {
    setMustSpin(false);
    setIsSpinning(false);
    const winningDeck = decks[prizeNumber];
    setSelectedDeck(winningDeck);
    setShowResult(true);
    
    // Call the callback if provided
    if (onDeckSelected) {
      onDeckSelected(winningDeck);
    }
  };

  const copyDeckCode = (deckCode: string, deckId: string) => {
    navigator.clipboard.writeText(deckCode);
    setCopiedDeckId(deckId);
    setTimeout(() => setCopiedDeckId(null), 2000);
  };

  const resetSpinner = () => {
    setShowResult(false);
    setSelectedDeck(null);
    setIsSpinning(false);
    setMustSpin(false);
  };

  // Handle empty state
  if (decks.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-n0 rounded-2xl p-8 max-w-md w-full relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-n100/20 transition-colors"
          >
            <PiX className="text-xl text-n300" />
          </button>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <PiCards className="text-6xl text-n200 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-n700 dark:text-n30 mb-2">
              No Decks to Spin!
            </h3>
            <p className="text-sm text-n300">
              You need at least one saved deck to use the random deck spinner. 
              Start building your collection by chatting with HearthForge!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-n0 rounded-2xl p-8 max-w-2xl w-full relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-n100/20 transition-colors z-10"
        >
          <PiX className="text-xl text-n300" />
        </button>

        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primaryColor/5 via-secondaryColor/5 to-warningColor/5"></div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-primaryColor/10 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-secondaryColor/10 rounded-full animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primaryColor to-secondaryColor bg-clip-text text-transparent mb-2">
              🎲 Deck Spinner
            </h2>
            <p className="text-sm text-n300">
              {isSpinning ? "Spinning..." : showResult ? "Your destiny awaits!" : `Spin to randomly select from your ${decks.length} deck${decks.length === 1 ? '' : 's'}!`}
            </p>
          </div>

          {/* Wheel Container */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {/* Sparkle effects around wheel */}
              {isSpinning && (
                <>
                  <PiSparkle className="absolute -top-4 -left-4 text-2xl text-warningColor animate-ping" />
                  <PiSparkle className="absolute -top-4 -right-4 text-xl text-primaryColor animate-ping delay-300" />
                  <PiSparkle className="absolute -bottom-4 -left-4 text-xl text-secondaryColor animate-ping delay-500" />
                  <PiSparkle className="absolute -bottom-4 -right-4 text-2xl text-warningColor animate-ping delay-700" />
                </>
              )}
              
              <Wheel
                mustStartSpinning={mustSpin}
                prizeNumber={prizeNumber}
                data={wheelData}
                onStopSpinning={handleStopSpinning}
                backgroundColors={['#f3f4f6', '#e5e7eb']} // Light gray alternating
                textColors={['#374151']}
                outerBorderColor="#6366f1"
                outerBorderWidth={4}
                innerRadius={20}
                radiusLineColor="#6366f1"
                radiusLineWidth={2}
                fontSize={decks.length > 8 ? 12 : 14}
                textDistance={70}
                spinDuration={0.8}
              />
            </div>
          </div>

          {/* Spin Button */}
          {!showResult && (
            <div className="text-center mb-6">
              <button
                onClick={handleSpinClick}
                disabled={mustSpin}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                  mustSpin
                    ? 'bg-n100 text-n300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primaryColor to-secondaryColor text-white hover:shadow-lg hover:scale-105 active:scale-95'
                }`}
              >
                {mustSpin ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-n300 border-t-transparent"></div>
                    Spinning...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <PiTrophy className="text-xl" />
                    Spin the Wheel!
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Result Display */}
          {showResult && selectedDeck && (
            <div className="bg-gradient-to-br from-warningColor/10 to-primaryColor/10 rounded-2xl p-6 border border-warningColor/30">
              <div className="text-center mb-4">
                <div className="flex justify-center items-center gap-2 mb-2">
                  <PiStar className="text-2xl text-warningColor animate-pulse" />
                  <h3 className="text-xl font-bold text-warningColor">Congratulations!</h3>
                  <PiStar className="text-2xl text-warningColor animate-pulse" />
                </div>
                <p className="text-sm text-n300">The wheel has chosen your deck:</p>
              </div>

              {/* Selected Deck Card */}
              <div className="bg-white dark:bg-n0 rounded-xl p-4 border border-primaryColor/20 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-bold text-primaryColor">{selectedDeck.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-n300">{selectedDeck.className}</span>
                    <span className="text-n200">•</span>
                    <span className="text-sm text-n300">{selectedDeck.formatName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-n300">
                    <PiCards className="text-primaryColor" />
                    {selectedDeck.totalCards} cards
                  </div>

                  <button
                    onClick={() => copyDeckCode(selectedDeck.deckCode, selectedDeck.id)}
                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primaryColor/10 hover:bg-primaryColor/20 transition-colors text-sm text-primaryColor"
                  >
                    {copiedDeckId === selectedDeck.id ? (
                      <>
                        <PiCheck className="text-sm" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <PiCopy className="text-sm" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={resetSpinner}
                  className="px-6 py-2 rounded-lg bg-primaryColor/10 hover:bg-primaryColor/20 text-primaryColor font-medium transition-colors"
                >
                  Spin Again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-primaryColor to-secondaryColor text-white font-medium hover:shadow-lg transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeckSpinner;
