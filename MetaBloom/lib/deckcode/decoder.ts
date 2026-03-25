/**
 * Hearthstone Deck Code Decoder
 * Handles detection and decoding of Hearthstone deck codes
 */

import { decode, FormatType } from 'deckstrings';

export interface DecodedDeck {
  cards: Array<[number, number]>; // [dbfId, count] pairs
  sideboardCards?: Array<[number, number, number]>; // [dbfId, count, sideboardOwnerDbfId] triplets
  heroes: number[]; // Hero DBF IDs
  format: FormatType; // FT_WILD, FT_STANDARD, FT_CLASSIC
}

export interface DeckCodeDetectionResult {
  hasDeckCode: boolean;
  deckCode?: string;
  decodedDeck?: DecodedDeck;
  originalMessage: string;
  messageWithoutDeckCode?: string;
}

/**
 * Regex patterns for detecting Hearthstone deck codes
 * Deck codes are base64-encoded strings, typically 20-150 characters
 */
const DECK_CODE_PATTERNS = [
  // Standard deck code pattern (base64 with padding)
  /\b[A-Za-z0-9+/]{20,150}={0,2}\b/g,
  // Deck code without padding
  /\b[A-Za-z0-9+/]{20,150}\b/g,
  // Deck code with AAE prefix (common Hearthstone pattern)
  /\bAAE[A-Za-z0-9+/=]{17,147}\b/g
];

/**
 * Detect if a message contains a Hearthstone deck code
 */
export function detectDeckCode(message: string): string | null {
  if (!message || typeof message !== 'string') {
    return null;
  }

  // Try each pattern to find a deck code
  for (const pattern of DECK_CODE_PATTERNS) {
    const matches = message.match(pattern);
    if (matches && matches.length > 0) {
      // Return the first match
      return matches[0];
    }
  }

  return null;
}

/**
 * Validate if a string is a valid Hearthstone deck code
 */
export function isValidDeckCode(deckCode: string): boolean {
  if (!deckCode || typeof deckCode !== 'string') {
    return false;
  }

  try {
    // Try to decode the deck code
    const decoded = decode(deckCode);

    // Basic validation: should have cards and heroes
    return (
      decoded &&
      Array.isArray(decoded.cards) &&
      decoded.cards.length > 0 &&
      Array.isArray(decoded.heroes) &&
      decoded.heroes.length > 0
    );
  } catch {
    // If decoding fails, it's not a valid deck code
    return false;
  }
}

/**
 * Decode a Hearthstone deck code into deck data
 */
export function decodeDeckCode(deckCode: string): DecodedDeck | null {
  if (!deckCode || !isValidDeckCode(deckCode)) {
    return null;
  }

  try {
    const decoded = decode(deckCode);
    return decoded as DecodedDeck;
  } catch (error) {
    console.error('Error decoding deck code:', error);
    return null;
  }
}

/**
 * Process a user message to detect and decode deck codes
 */
export function processDeckCodeMessage(message: string): DeckCodeDetectionResult {
  const result: DeckCodeDetectionResult = {
    hasDeckCode: false,
    originalMessage: message
  };

  // Detect deck code in the message
  const detectedDeckCode = detectDeckCode(message);

  if (!detectedDeckCode) {
    return result;
  }

  // Validate the detected deck code
  if (!isValidDeckCode(detectedDeckCode)) {
    return result;
  }

  // Decode the deck code
  const decodedDeck = decodeDeckCode(detectedDeckCode);

  if (!decodedDeck) {
    return result;
  }

  // Remove the deck code from the message
  const messageWithoutDeckCode = message.replace(detectedDeckCode, '').trim();

  return {
    hasDeckCode: true,
    deckCode: detectedDeckCode,
    decodedDeck,
    originalMessage: message,
    messageWithoutDeckCode: messageWithoutDeckCode || 'Please analyze this deck.'
  };
}

/**
 * Format decoded deck data for AI analysis
 */
export function formatDeckForAI(decodedDeck: DecodedDeck): string {
  const formatNames: Record<number, string> = {
    1: 'Wild',     // FT_WILD
    2: 'Standard', // FT_STANDARD
    3: 'Classic'   // FT_CLASSIC
  };

  const formatName = formatNames[decodedDeck.format] || 'Unknown';

  // Map hero DBF ID to class name
  const heroNames: Record<number, string> = {
    274: 'Druid',
    31: 'Hunter',
    637: 'Mage',
    671: 'Paladin',
    813: 'Priest',
    930: 'Rogue',
    1066: 'Shaman',
    893: 'Warlock',
    7: 'Warrior',
    56550: 'Demon Hunter'
  };

  const heroClass = heroNames[decodedDeck.heroes[0]] || `Unknown (DBF ID: ${decodedDeck.heroes[0]})`;

  let deckInfo = `[SYSTEM: I have automatically decoded the user's deck code for you. Here is the decoded deck data:]\n\n`;
  deckInfo += `DECK ANALYSIS DATA:\n`;
  deckInfo += `Class: ${heroClass}\n`;
  deckInfo += `Format: ${formatName}\n`;
  deckInfo += `Total Cards: ${decodedDeck.cards.length} unique cards\n\n`;
  deckInfo += `CARD LIST (DBF ID: Count):\n`;

  for (const [dbfId, count] of decodedDeck.cards) {
    deckInfo += `- ${dbfId}: ${count}x\n`;
  }

  if (decodedDeck.sideboardCards && decodedDeck.sideboardCards.length > 0) {
    deckInfo += `\nSIDEBOARD CARDS:\n`;
    for (const [dbfId, count, ownerDbfId] of decodedDeck.sideboardCards) {
      deckInfo += `- ${dbfId}: ${count}x (Owner: ${ownerDbfId})\n`;
    }
  }

  deckInfo += `\n[SYSTEM: Please analyze this decoded deck data for the user.]`;

  return deckInfo;
}

/**
 * Get format type name as string
 */
export function getFormatName(format: FormatType): string {
  switch (format) {
    case 1: // FT_WILD
      return 'Wild';
    case 2: // FT_STANDARD
      return 'Standard';
    case 3: // FT_CLASSIC
      return 'Classic';
    default:
      return 'Unknown';
  }
}
