import React, { useState } from 'react';
import { PiCopy, PiCheck, PiHeart, PiHeartFill } from 'react-icons/pi';
import { useAuth } from '@/stores/auth';
import { decodeDeckCode } from '@/lib/deckcode/decoder';

interface DeckCodeProps {
  code: string;
}

const DeckCode: React.FC<DeckCodeProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const { user, isAuthenticated } = useAuth();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePrompt = () => {
    if (!isAuthenticated) {
      setSaveMessage('Please sign in to save decks to your collection.');
      return;
    }
    setShowSavePrompt(true);
  };

  const saveDeckToCollection = async () => {
    if (!user?.uid) return;

    try {
      setSaving(true);

      // Decode the deck to get its name
      const decodedDeck = decodeDeckCode(code);
      const deckName = decodedDeck ? `Deck ${code.slice(0, 8)}` : 'Unknown Deck';

      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          deckCode: code,
          deckName,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSaved(true);
        setSaveMessage('Deck saved to your collection!');
        setShowSavePrompt(false);
        setTimeout(() => {
          setSaveMessage('');
          setSaved(false);
        }, 3000);
      } else {
        setSaveMessage(result.message || result.error || 'Failed to save deck');
        if (result.limitReached) {
          setShowSavePrompt(false);
        }
      }
    } catch (error) {
      console.error('Error saving deck:', error);
      setSaveMessage('Failed to save deck. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-4 relative w-full">
      <div className="bg-gray-800 text-white p-4 rounded-md overflow-hidden">
        <pre className="font-mono text-sm whitespace-pre-wrap break-all">{code}</pre>
      </div>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex gap-2">
        <button
          onClick={handleSavePrompt}
          className="p-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 transition-colors"
          title="Save to My Decks"
          disabled={saved}
        >
          {saved ? (
            <PiHeartFill className="text-red-400" />
          ) : (
            <PiHeart className="text-white" />
          )}
        </button>
        <button
          onClick={copyToClipboard}
          className="p-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 transition-colors"
          title="Copy deck code"
        >
          {copied ? <PiCheck className="text-green-400" /> : <PiCopy />}
        </button>
      </div>

      {/* Save confirmation prompt */}
      {showSavePrompt && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            Would you like to save this deck to your inventory? You can view it later under &apos;My Decks&apos;.
          </p>
          <div className="flex gap-2">
            <button
              onClick={saveDeckToCollection}
              disabled={saving}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {saving ? 'Saving...' : 'Yes, Save Deck'}
            </button>
            <button
              onClick={() => setShowSavePrompt(false)}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Save message */}
      {saveMessage && (
        <div className={`mt-2 p-2 rounded-lg text-sm ${
          saved
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
        }`}>
          {saveMessage}
        </div>
      )}

      <div className="mt-2 text-center">
        <span className="text-xs text-gray-500">
          Copy this code to import the deck directly into Hearthstone
        </span>
      </div>
    </div>
  );
};

// Add display name for better component detection in ReactMarkdown
DeckCode.displayName = 'DeckCode';

export default DeckCode;
