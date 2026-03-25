// Card Name Detection and Wrapping Utility
// Processes text to detect Hearthstone card names and wrap them with hoverable spans

import { getCardId, getAllCardNames, isCardDataReady } from './cardData';

export interface CardMatch {
  cardName: string;
  cardId: string;
  startIndex: number;
  endIndex: number;
}

export interface ProcessedText {
  html: string;
  cardMatches: CardMatch[];
}

class CardNameDetector {
  private static instance: CardNameDetector;
  private cardNameRegexCache: RegExp | null = null;
  private lastCacheUpdate = 0;
  private readonly CACHE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): CardNameDetector {
    if (!CardNameDetector.instance) {
      CardNameDetector.instance = new CardNameDetector();
    }
    return CardNameDetector.instance;
  }

  /**
   * Build regex pattern for card name detection
   * Creates an optimized regex that matches card names in order of length (longest first)
   */
  private buildCardNameRegex(): RegExp | null {
    if (!isCardDataReady()) {
      console.warn('Card data not ready for regex building');
      return null;
    }

    const now = Date.now();
    
    // Use cached regex if it's recent
    if (this.cardNameRegexCache && (now - this.lastCacheUpdate) < this.CACHE_REFRESH_INTERVAL) {
      return this.cardNameRegexCache;
    }

    try {
      const cardNames = getAllCardNames();
      
      if (cardNames.length === 0) {
        console.warn('No card names available for regex building');
        return null;
      }

      // Sort by length (longest first) to prioritize longer matches
      const sortedNames = cardNames
        .filter(name => name && name.length > 2) // Filter out very short names
        .sort((a, b) => b.length - a.length);

      // Escape special regex characters and create pattern
      const escapedNames = sortedNames.map(name => 
        name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      );

      // Create regex pattern with word boundaries
      // Use non-capturing groups for better performance
      const pattern = `\\b(?:${escapedNames.join('|')})\\b`;
      
      this.cardNameRegexCache = new RegExp(pattern, 'gi');
      this.lastCacheUpdate = now;

      console.log(`🔍 Built card name regex with ${sortedNames.length} patterns`);
      return this.cardNameRegexCache;

    } catch (error) {
      console.error('Failed to build card name regex:', error);
      return null;
    }
  }

  /**
   * Detect card names in text and return matches
   */
  public detectCardNames(text: string): CardMatch[] {
    if (!text || !isCardDataReady()) {
      console.log('🔍 Card detection skipped - text empty or data not ready:', { hasText: !!text, isReady: isCardDataReady() });
      return [];
    }

    const regex = this.buildCardNameRegex();
    if (!regex) {
      console.log('🔍 Card detection failed - no regex built');
      return [];
    }

    const matches: CardMatch[] = [];
    let match;

    // Reset regex lastIndex to ensure we start from the beginning
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const cardName = match[0];
      const cardId = getCardId(cardName);

      if (cardId) {
        matches.push({
          cardName,
          cardId,
          startIndex: match.index,
          endIndex: match.index + cardName.length
        });
      }

      // Prevent infinite loop on zero-length matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    // Remove overlapping matches (keep the first/longest one)
    const finalMatches = this.removeOverlappingMatches(matches);

    if (finalMatches.length > 0) {
      console.log('🔍 Card matches found:', finalMatches.map(m => m.cardName));
    }

    return finalMatches;
  }

  /**
   * Remove overlapping matches, keeping the first (longest due to sorting) match
   */
  private removeOverlappingMatches(matches: CardMatch[]): CardMatch[] {
    if (matches.length <= 1) return matches;

    // Sort by start index
    const sortedMatches = matches.sort((a, b) => a.startIndex - b.startIndex);
    const filteredMatches: CardMatch[] = [];

    for (const match of sortedMatches) {
      // Check if this match overlaps with any already accepted match
      const hasOverlap = filteredMatches.some(existing => 
        (match.startIndex < existing.endIndex && match.endIndex > existing.startIndex)
      );

      if (!hasOverlap) {
        filteredMatches.push(match);
      }
    }

    return filteredMatches;
  }

  /**
   * Process text and wrap card names with hoverable spans
   */
  public processText(text: string): ProcessedText {
    if (!text) {
      return { html: text, cardMatches: [] };
    }

    const cardMatches = this.detectCardNames(text);

    if (cardMatches.length === 0) {
      return { html: text, cardMatches: [] };
    }

    // Sort matches by start index in reverse order to process from end to beginning
    // This prevents index shifting when we insert HTML
    const sortedMatches = cardMatches.sort((a, b) => b.startIndex - a.startIndex);

    let processedText = text;

    for (const match of sortedMatches) {
      const beforeText = processedText.substring(0, match.startIndex);
      const afterText = processedText.substring(match.endIndex);
      
      // Create the hoverable span
      const wrappedCard = `<span class="card-hover" data-card-id="${match.cardId}" data-card-name="${match.cardName}">${match.cardName}</span>`;
      
      processedText = beforeText + wrappedCard + afterText;
    }

    return {
      html: processedText,
      cardMatches: cardMatches.sort((a, b) => a.startIndex - b.startIndex) // Return matches in original order
    };
  }

  /**
   * Process markdown text while preserving markdown syntax
   * This is more complex as we need to avoid wrapping card names inside code blocks, links, etc.
   */
  public processMarkdownText(markdownText: string): ProcessedText {
    if (!markdownText) {
      return { html: markdownText, cardMatches: [] };
    }

    // For now, use simple text processing
    // TODO: Implement proper markdown-aware processing if needed
    return this.processText(markdownText);
  }

  /**
   * Clear the regex cache (useful when card data is updated)
   */
  public clearCache(): void {
    this.cardNameRegexCache = null;
    this.lastCacheUpdate = 0;
  }

  /**
   * Get statistics about the current regex cache
   */
  public getCacheStats(): { isCached: boolean; lastUpdate: number; age: number } {
    const now = Date.now();
    return {
      isCached: this.cardNameRegexCache !== null,
      lastUpdate: this.lastCacheUpdate,
      age: now - this.lastCacheUpdate
    };
  }
}

// Export singleton instance
export const cardNameDetector = CardNameDetector.getInstance();

// Utility functions for easy access
export const detectCardNames = (text: string): CardMatch[] => cardNameDetector.detectCardNames(text);
export const processTextForCards = (text: string): ProcessedText => cardNameDetector.processText(text);
export const processMarkdownForCards = (markdownText: string): ProcessedText => cardNameDetector.processMarkdownText(markdownText);
export const clearCardNameCache = (): void => cardNameDetector.clearCache();

// React-specific utility for processing JSX content
export const processTextToJSX = (text: string): { jsx: React.ReactNode; cardMatches: CardMatch[] } => {
  const processed = cardNameDetector.processText(text);
  
  // Convert HTML string to JSX (this will be handled by the React component)
  return {
    jsx: processed.html,
    cardMatches: processed.cardMatches
  };
};
