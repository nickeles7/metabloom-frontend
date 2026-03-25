/**
 * Hearthstone Deck Code Encoder
 * Handles encoding of deck data into Hearthstone deck codes
 */

import { encode, FormatType } from 'deckstrings';

export interface EncodeDeckRequest {
  heroClass: string;
  format: 'Standard' | 'Wild' | 'Classic';
  cards: Array<{
    name: string;
    count: number;
    dbfId?: number;
  }>;
}

export interface EncodeDeckResponse {
  success: boolean;
  deckCode?: string;
  formattedDeck?: string;
  error?: string;
}

// Hero class to DBF ID mapping
const HERO_CLASS_TO_DBF: Record<string, number> = {
  'Druid': 274,
  'Hunter': 31,
  'Mage': 637,
  'Paladin': 671,
  'Priest': 813,
  'Rogue': 930,
  'Shaman': 1066,
  'Warlock': 893,
  'Warrior': 7,
  'Demon Hunter': 56550
};

// Format mapping
const FORMAT_MAPPING: Record<string, FormatType> = {
  'Standard': 2, // FT_STANDARD
  'Wild': 1,     // FT_WILD
  'Classic': 3   // FT_CLASSIC
};

/**
 * Get DBF ID for hero class
 */
export function getHeroDbfId(heroClass: string): number | null {
  return HERO_CLASS_TO_DBF[heroClass] || null;
}

/**
 * Get format type from string
 */
export function getFormatType(format: string): FormatType | null {
  return FORMAT_MAPPING[format] || null;
}

/**
 * Encode deck data into a Hearthstone deck code
 */
export function encodeDeck(request: EncodeDeckRequest): EncodeDeckResponse {
  try {
    // Validate hero class
    const heroDbfId = getHeroDbfId(request.heroClass);
    if (!heroDbfId) {
      return {
        success: false,
        error: `Unknown hero class: ${request.heroClass}`
      };
    }

    // Validate format
    const format = getFormatType(request.format);
    if (format === null) {
      return {
        success: false,
        error: `Unknown format: ${request.format}`
      };
    }

    // Validate cards have DBF IDs
    const missingDbfIds = request.cards.filter(card => !card.dbfId);
    if (missingDbfIds.length > 0) {
      return {
        success: false,
        error: `Cards missing DBF IDs: ${missingDbfIds.map(c => c.name).join(', ')}`
      };
    }

    // Build cards array for encoding
    const cards: Array<[number, number]> = request.cards.map(card => [
      card.dbfId!,
      card.count
    ]);

    // Generate deck code
    const deckCode = encode({
      cards,
      heroes: [heroDbfId],
      format
    });

    // Format deck for display
    const formattedDeck = formatDeckForDisplay(request, deckCode);

    return {
      success: true,
      deckCode,
      formattedDeck
    };

  } catch (error) {
    console.error('Error encoding deck:', error);
    return {
      success: false,
      error: `Failed to encode deck: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Format deck for display
 */
function formatDeckForDisplay(request: EncodeDeckRequest, deckCode: string): string {
  let formatted = `### Custom Deck\n`;
  formatted += `# Class: ${request.heroClass}\n`;
  formatted += `# Format: ${request.format}\n`;
  formatted += `# Deck Code: ${deckCode}\n\n`;

  // Sort cards by cost if we had cost data
  // For now, just list them as provided
  for (const card of request.cards) {
    formatted += `# ${card.count}x ${card.name}\n`;
  }

  formatted += `\n${deckCode}\n`;

  return formatted;
}

/**
 * Validate deck composition
 */
export function validateDeckComposition(cards: Array<{ name: string; count: number }>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check total card count (should be 30 for constructed)
  const totalCards = cards.reduce((sum, card) => sum + card.count, 0);
  if (totalCards !== 30) {
    errors.push(`Deck must have exactly 30 cards, found ${totalCards}`);
  }

  // Check individual card counts (max 2 copies, 1 for legendaries)
  for (const card of cards) {
    if (card.count < 1 || card.count > 2) {
      errors.push(`Invalid card count for ${card.name}: ${card.count} (must be 1-2)`);
    }
  }

  // Check for duplicate card names
  const cardNames = cards.map(c => c.name);
  const duplicates = cardNames.filter((name, index) => cardNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    const uniqueDuplicates = Array.from(new Set(duplicates));
    errors.push(`Duplicate cards found: ${uniqueDuplicates.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create a deck code from card names (requires DBF ID lookup)
 */
export async function createDeckCodeFromNames(
  heroClass: string,
  format: string,
  cards: Array<{ name: string; count: number }>,
  getCardDbfId: (cardName: string) => Promise<number | null>
): Promise<EncodeDeckResponse> {
  try {
    // Validate deck composition first
    const validation = validateDeckComposition(cards);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Invalid deck composition: ${validation.errors.join(', ')}`
      };
    }

    // Get DBF IDs for all cards
    const cardsWithDbfIds = [];
    const missingCards = [];

    for (const card of cards) {
      const dbfId = await getCardDbfId(card.name);
      if (dbfId) {
        cardsWithDbfIds.push({
          ...card,
          dbfId
        });
      } else {
        missingCards.push(card.name);
      }
    }

    if (missingCards.length > 0) {
      return {
        success: false,
        error: `Unknown cards: ${missingCards.join(', ')}`
      };
    }

    // Encode the deck
    return encodeDeck({
      heroClass,
      format: format as 'Standard' | 'Wild' | 'Classic',
      cards: cardsWithDbfIds
    });

  } catch (error) {
    console.error('Error creating deck code from names:', error);
    return {
      success: false,
      error: `Failed to create deck code: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Quick deck code generation for testing
 */
export function createTestDeckCode(): string {
  // Create a simple test deck
  const testDeck = {
    cards: [
      [254, 2], // Innervate x2
      [548, 2], // Wrath x2
      [282, 2], // Wild Growth x2
      [462, 2], // Swipe x2
      [587, 2], // Druid of the Claw x2
      [96, 1],  // Ancient of Lore x1
      [242, 1], // Ancient of War x1
      [576, 2], // Bloodfen Raptor x2
      [535, 2], // River Crocolisk x2
      [31, 2],  // Chillwind Yeti x2
      [326, 2], // Sen'jin Shieldmasta x2
      [519, 2], // Boulderfist Ogre x2
      [323, 2], // War Golem x2
      [455, 2], // Core Hound x2
      [362, 2], // Magma Rager x2
      [619, 2]  // Moonfire x2
    ] as Array<[number, number]>,
    heroes: [274], // Druid
    format: 2 as FormatType // FT_STANDARD
  };

  return encode(testDeck);
}
