import React, { useState } from 'react';
import { PiX, PiHeart, PiHeartFill, PiSpinner } from 'react-icons/pi';
import { useAuth } from '@/stores/auth';
import { decodeDeckCode, isValidDeckCode } from '@/lib/deckcode/decoder';

interface DeckSavePromptProps {
  deckCodes: string[];
  onClose: () => void;
  onSave?: (deckCode: string, success: boolean) => void;
}

const DeckSavePrompt: React.FC<DeckSavePromptProps> = ({ deckCodes, onClose, onSave }) => {
  const [saving, setSaving] = useState<string | null>(null);
  const [savedDecks, setSavedDecks] = useState<Set<string>>(new Set());
  const [saveMessage, setSaveMessage] = useState('');
  const { user, isAuthenticated } = useAuth();

  const saveDeckToCollection = async (deckCode: string) => {
    if (!user?.uid || !isAuthenticated) {
      setSaveMessage('Please sign in to save decks to your collection.');
      return;
    }

    try {
      setSaving(deckCode);

      // Validate and decode the deck to get its name using new system
      if (!isValidDeckCode(deckCode)) {
        setSaveMessage('Invalid deck code format.');
        return;
      }

      const decodedDeck = decodeDeckCode(deckCode);
      const deckName = decodedDeck ? `Deck ${deckCode.slice(0, 8)}` : 'Unknown Deck';

      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          deckCode,
          deckName,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSavedDecks(prev => new Set([...prev, deckCode]));
        setSaveMessage('Deck saved to your collection!');
        onSave?.(deckCode, true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveMessage('');
        }, 3000);
      } else {
        setSaveMessage(result.message || result.error || 'Failed to save deck');
        onSave?.(deckCode, false);
      }
    } catch (error) {
      console.error('Error saving deck:', error);
      setSaveMessage('Failed to save deck. Please try again.');
      onSave?.(deckCode, false);
    } finally {
      setSaving(null);
    }
  };

  // Filter out invalid deck codes
  const validDeckCodes = deckCodes.filter(code => isValidDeckCode(code));

  if (validDeckCodes.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-n0 rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-n700 dark:text-n30">
              Save Deck{validDeckCodes.length > 1 ? 's' : ''} to Collection
            </h3>
            <button
              onClick={onClose}
              className="text-n300 hover:text-n500 transition-colors"
            >
              <PiX className="text-xl" />
            </button>
          </div>

          {/* Message */}
          {saveMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              saveMessage.includes('saved') || saveMessage.includes('success')
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {saveMessage}
            </div>
          )}

          {/* Deck List */}
          <div className="space-y-3">
            {validDeckCodes.map((deckCode, index) => {
              const isSaving = saving === deckCode;
              const isSaved = savedDecks.has(deckCode);
              
              // Try to decode for basic info
              const decodedDeck = decodeDeckCode(deckCode);
              const deckInfo = {
                name: `Deck ${deckCode.slice(0, 8)}`,
                totalCards: decodedDeck?.cards?.reduce((sum, [, count]) => sum + count, 0) || 0,
                className: 'Unknown', // TODO: Add class detection
                formatName: 'Unknown' // TODO: Add format detection
              };

              return (
                <div
                  key={index}
                  className="border border-primaryColor/20 rounded-lg p-4 hover:border-primaryColor/40 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-n700 dark:text-n30 mb-1">
                        {deckInfo.name}
                      </h4>
                      <p className="text-xs text-n300">
                        {deckInfo.className} • {deckInfo.formatName} • {deckInfo.totalCards} cards
                      </p>
                    </div>
                    <button
                      onClick={() => saveDeckToCollection(deckCode)}
                      disabled={isSaving || isSaved || !isAuthenticated}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSaved
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : isAuthenticated
                          ? 'bg-primaryColor text-white hover:bg-primaryColor/90'
                          : 'bg-n100 text-n400 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <PiSpinner className="animate-spin" />
                          Saving...
                        </>
                      ) : isSaved ? (
                        <>
                          <PiHeartFill />
                          Saved
                        </>
                      ) : (
                        <>
                          <PiHeart />
                          Save
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Deck Code Preview */}
                  <div className="bg-gray-100 dark:bg-n100/10 rounded p-2 mt-2">
                    <code className="text-xs text-n500 dark:text-n300 break-all">
                      {deckCode.slice(0, 40)}...
                    </code>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-n500 hover:text-n700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckSavePrompt;
