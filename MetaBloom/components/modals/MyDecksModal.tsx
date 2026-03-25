"use client";
import React, { useState, useEffect } from "react";
import { PiTrash, PiCopy, PiCheck, PiCards, PiMagnifyingGlass, PiPencil, PiX, PiTrophy, PiStar, PiCrown, PiSparkle, PiShield, PiFire } from "react-icons/pi";
import { useAuth } from "@/stores/auth";
import { SavedDeck } from "@/lib/subscription";
import DeckSpinner from "./DeckSpinner";

// Helper function to get class-specific colors and styling
const getClassStyling = (className: string) => {
  const classStyles: Record<string, { gradient: string; accent: string; icon: React.ComponentType<any> }> = {
    'Warrior': { gradient: 'from-red-500 to-orange-600', accent: 'text-red-400', icon: PiShield },
    'Paladin': { gradient: 'from-yellow-400 to-orange-500', accent: 'text-yellow-400', icon: PiCrown },
    'Hunter': { gradient: 'from-green-500 to-emerald-600', accent: 'text-green-400', icon: PiFire },
    'Rogue': { gradient: 'from-gray-600 to-gray-800', accent: 'text-gray-400', icon: PiSparkle },
    'Priest': { gradient: 'from-blue-400 to-indigo-600', accent: 'text-blue-400', icon: PiStar },
    'Shaman': { gradient: 'from-blue-600 to-purple-600', accent: 'text-blue-400', icon: PiSparkle },
    'Mage': { gradient: 'from-cyan-400 to-blue-600', accent: 'text-cyan-400', icon: PiSparkle },
    'Warlock': { gradient: 'from-purple-600 to-pink-600', accent: 'text-purple-400', icon: PiFire },
    'Druid': { gradient: 'from-amber-500 to-green-600', accent: 'text-amber-400', icon: PiStar },
    'Demon Hunter': { gradient: 'from-emerald-600 to-teal-700', accent: 'text-emerald-400', icon: PiFire },
    'Death Knight': { gradient: 'from-slate-600 to-gray-800', accent: 'text-slate-400', icon: PiShield },
  };

  return classStyles[className] || { gradient: 'from-primaryColor to-secondaryColor', accent: 'text-primaryColor', icon: PiCards };
};

function MyDecksModal() {
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedDeckId, setCopiedDeckId] = useState<string | null>(null);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const { user } = useAuth();

  // Load saved decks on component mount
  useEffect(() => {
    if (user?.uid) {
      loadSavedDecks();
    }
  }, [user?.uid]);

  const loadSavedDecks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/decks?userId=${user?.uid}`);
      if (response.ok) {
        const data = await response.json();
        setSavedDecks(data.decks || []);
      }
    } catch (error) {
      console.error("Error loading saved decks:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDeck = async (deckId: string) => {
    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user?.uid }),
      });

      if (response.ok) {
        setSavedDecks(prev => prev.filter(deck => deck.id !== deckId));
      }
    } catch (error) {
      console.error("Error deleting deck:", error);
    }
  };

  const copyDeckCode = (deckCode: string, deckId: string) => {
    navigator.clipboard.writeText(deckCode);
    setCopiedDeckId(deckId);
    setTimeout(() => setCopiedDeckId(null), 2000);
  };

  const startEditing = (deck: SavedDeck) => {
    setEditingDeckId(deck.id);
    setEditingName(deck.name);
  };

  const cancelEditing = () => {
    setEditingDeckId(null);
    setEditingName("");
  };

  const saveEdit = async (deckId: string) => {
    if (!editingName.trim() || savingEdit) return;

    try {
      setSavingEdit(true);
      const response = await fetch(`/api/decks/${deckId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.uid,
          deckName: editingName.trim(),
        }),
      });

      if (response.ok) {
        await response.json();
        // Update the local state
        setSavedDecks(prev =>
          prev.map(deck =>
            deck.id === deckId
              ? { ...deck, name: editingName.trim() }
              : deck
          )
        );
        setEditingDeckId(null);
        setEditingName("");
      } else {
        const errorData = await response.json();
        console.error("Error updating deck name:", errorData.error);
        // You could add a toast notification here
      }
    } catch (error) {
      console.error("Error updating deck name:", error);
      // You could add a toast notification here
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredDecks = savedDecks.filter(deck =>
    deck.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deck.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deck.formatName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate collection stats for gamification
  const allClasses = savedDecks.map(deck => deck.className);
  const validClasses = savedDecks.filter(deck => deck.className !== 'Unknown').map(deck => deck.className);
  const uniqueClasses = new Set(validClasses);

  // Debug logging
  console.log('🎴 Modal deck analysis:', {
    totalDecks: savedDecks.length,
    allClasses,
    validClasses,
    uniqueClasses: Array.from(uniqueClasses),
    uniqueClassCount: uniqueClasses.size,
    sampleDeck: savedDecks[0]
  });

  const collectionStats = {
    totalDecks: savedDecks.length,
    uniqueClasses: uniqueClasses.size,
    achievements: [
      { name: 'Deck Collector', unlocked: savedDecks.length >= 5, icon: PiCards },
      { name: 'Class Master', unlocked: uniqueClasses.size >= 3, icon: PiTrophy },
      { name: 'Legendary Builder', unlocked: savedDecks.some(deck => deck.totalCards >= 30), icon: PiCrown },
    ]
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Gamified Loading Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primaryColor to-secondaryColor bg-clip-text text-transparent mb-2">
            🎮 Loading Your Collection...
          </h2>
          <p className="text-sm text-n300">Gathering your legendary decks</p>
        </div>

        <div className="flex justify-center items-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primaryColor/20 border-t-primaryColor"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <PiCards className="text-primaryColor text-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Gamified Header */}
      <div className="text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primaryColor/10 via-secondaryColor/10 to-primaryColor/10 rounded-2xl blur-xl"></div>
        <div className="relative bg-white/50 dark:bg-n0/50 backdrop-blur-sm rounded-2xl p-6 border border-primaryColor/20">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primaryColor to-secondaryColor bg-clip-text text-transparent mb-4">
            🏆 Your Deck Collection
          </h2>

          {/* Collection Stats */}
          <div className="grid grid-cols-2 gap-8 mb-4 max-w-sm mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primaryColor">{collectionStats.totalDecks}</div>
              <div className="text-sm text-n300">Total Decks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondaryColor">{collectionStats.uniqueClasses}</div>
              <div className="text-sm text-n300">Classes</div>
            </div>
          </div>

          {/* Achievements */}
          <div className="flex justify-center gap-2 mb-4">
            {collectionStats.achievements.map((achievement, index) => {
              const IconComponent = achievement.icon;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs ${
                    achievement.unlocked
                      ? 'bg-warningColor/20 text-warningColor border border-warningColor/30'
                      : 'bg-n100/20 text-n300 border border-n100/30'
                  }`}
                  title={achievement.name}
                >
                  <IconComponent className="text-sm" />
                  <span className="max-sm:hidden">{achievement.name}</span>
                </div>
              );
            })}
          </div>

          {/* Random Deck Button */}
          {savedDecks.length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowSpinner(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-warningColor to-orange-500 text-white font-bold hover:shadow-lg hover:scale-105 transition-all duration-300 active:scale-95"
              >
                <span className="text-xl">🎲</span>
                Random Deck Spinner
                <PiSparkle className="text-lg animate-pulse" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primaryColor/20 to-secondaryColor/20 rounded-xl blur-sm"></div>
        <div className="relative flex justify-between items-center gap-4 bg-white/80 dark:bg-n0/80 backdrop-blur-sm border border-primaryColor/30 rounded-xl py-3 px-5 hover:border-primaryColor/50 transition-all duration-300">
          <input
            type="text"
            placeholder="🔍 Search your legendary decks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="outline-none bg-transparent flex-1 text-sm placeholder:text-n300"
          />
          <PiMagnifyingGlass className="text-2xl text-primaryColor" />
        </div>
      </div>

      {/* Enhanced Deck Count with Progress */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <p className="text-sm text-n300">
            {filteredDecks.length} of {savedDecks.length} decks
          </p>
          {savedDecks.length >= 20 && (
            <span className="flex items-center gap-1 text-xs text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
              <PiTrophy className="text-sm" />
              Collection Full!
            </span>
          )}
        </div>

        {/* Collection Progress Bar */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-n100/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primaryColor to-secondaryColor rounded-full transition-all duration-500"
              style={{ width: `${Math.min((savedDecks.length / 20) * 100, 100)}%` }}
            ></div>
          </div>
          <span className="text-xs text-n300">{savedDecks.length}/20</span>
        </div>
      </div>

      {/* Enhanced Empty State */}
      {filteredDecks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primaryColor/5 via-secondaryColor/5 to-warningColor/5 rounded-2xl"></div>
          <div className="relative">
            <div className="flex justify-center mb-6">
              <PiCards className="text-8xl text-n100 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-primaryColor to-secondaryColor bg-clip-text text-transparent mb-3">
              {savedDecks.length === 0 ? "🌟 Start Your Collection!" : "🔍 No Matches Found"}
            </h3>
            <p className="text-sm text-n300 max-w-md">
              {savedDecks.length === 0
                ? "Begin your legendary journey! Chat with HearthForge to discover powerful deck combinations and build your ultimate collection."
                : "Your search didn't match any decks in your collection. Try different keywords or browse all your decks."
              }
            </p>
            {savedDecks.length === 0 && (
              <div className="mt-4 flex justify-center gap-2">
                <span className="px-3 py-1 bg-primaryColor/10 text-primaryColor text-xs rounded-full border border-primaryColor/20">
                  💬 Chat with AI
                </span>
                <span className="px-3 py-1 bg-secondaryColor/10 text-secondaryColor text-xs rounded-full border border-secondaryColor/20">
                  🎯 Get Recommendations
                </span>
                <span className="px-3 py-1 bg-successColor/10 text-successColor text-xs rounded-full border border-successColor/20">
                  💾 Save Decks
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="deck-grid-container grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[500px] overflow-y-auto p-2">
          {filteredDecks.map((deck) => {
            const classStyle = getClassStyling(deck.className);
            const IconComponent = classStyle.icon;

            return (
            <div
              key={deck.id}
              className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
            >
              {/* Card Background with Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${classStyle.gradient} opacity-80`}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

              {/* Animated Border */}
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-white/20 via-white/10 to-white/20 group-hover:from-white/40 group-hover:via-white/20 group-hover:to-white/40 transition-all duration-500"></div>

              {/* Content */}
              <div className="relative p-5 text-white"
            >
                {/* Class Icon */}
                <div className="absolute top-3 left-3">
                  <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                    <IconComponent className="text-xl text-white" />
                  </div>
                </div>

                {/* Main Content */}
                <div className="mt-12 mb-4">
                  {editingDeckId === deck.id ? (
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 text-lg font-bold bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-2 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50"
                        maxLength={100}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveEdit(deck.id);
                          } else if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                      />
                      <button
                        onClick={() => saveEdit(deck.id)}
                        disabled={!editingName.trim() || savingEdit}
                        className="p-2.5 rounded-lg bg-green-500/90 hover:bg-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-green-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:hover:scale-100"
                        title="Save"
                      >
                        <PiCheck className="text-white text-sm" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-2.5 rounded-lg bg-red-500/90 hover:bg-red-500 transition-all duration-200 border border-red-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                        title="Cancel"
                      >
                        <PiX className="text-white text-sm" />
                      </button>
                    </div>
                  ) : (
                    <h4 className="text-lg font-bold text-white mb-2 group-hover:text-yellow-200 transition-colors">
                      {deck.name}
                    </h4>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-white/90">{deck.formatName}</span>
                    <span className="text-white/60">•</span>
                    <span className="text-sm text-white/80 flex items-center gap-1">
                      <PiCards className="text-xs" />
                      {deck.totalCards} cards
                    </span>
                  </div>

                  <p className="text-xs text-white/70">
                    Collected {new Date(deck.savedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  {editingDeckId !== deck.id && (
                    <button
                      onClick={() => startEditing(deck)}
                      className="p-2.5 rounded-lg bg-white/90 hover:bg-white transition-all duration-200 backdrop-blur-sm border border-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                      title="Edit deck name"
                    >
                      <PiPencil className="text-gray-700 text-sm" />
                    </button>
                  )}
                  <button
                    onClick={() => copyDeckCode(deck.deckCode, deck.id)}
                    className="p-2.5 rounded-lg bg-white/90 hover:bg-white transition-all duration-200 backdrop-blur-sm border border-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                    title="Copy deck code"
                  >
                    {copiedDeckId === deck.id ? (
                      <PiCheck className="text-green-600 text-sm" />
                    ) : (
                      <PiCopy className="text-gray-700 text-sm" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteDeck(deck.id)}
                    className="p-2.5 rounded-lg bg-red-500/90 hover:bg-red-500 transition-all duration-200 backdrop-blur-sm border border-red-400 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                    title="Delete deck"
                  >
                    <PiTrash className="text-white text-sm" />
                  </button>
                </div>

                {/* Enhanced Deck Code Preview */}
                <div className="mt-4 bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/70 font-medium">Deck Code</span>
                    <div className="flex items-center gap-1">
                      <PiSparkle className="text-xs text-yellow-400" />
                      <span className="text-xs text-yellow-400">Legendary</span>
                    </div>
                  </div>
                  <code className="text-xs font-mono text-white/90 break-all block">
                    {deck.deckCode.substring(0, 35)}...
                  </code>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Deck Spinner Modal */}
      {showSpinner && (
        <DeckSpinner
          decks={savedDecks}
          onClose={() => setShowSpinner(false)}
          onDeckSelected={(deck) => {
            // Optional: You can add additional logic here when a deck is selected
            console.log('Selected deck:', deck);
          }}
        />
      )}
    </div>
  );
}

export default MyDecksModal;
