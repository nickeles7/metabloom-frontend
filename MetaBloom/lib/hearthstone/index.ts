// Hearthstone Card Hover System
// Main exports for the card hover functionality

// Core data management
export {
  cardDataService,
  getCardId,
  getCardByName,
  getCardById,
  getAllCardNames,
  isCardDataReady,
  initializeCardData,
  type HearthstoneCard,
  type CardNameMapping
} from './cardData';

// Card name detection
export {
  cardNameDetector,
  detectCardNames,
  processTextForCards,
  processMarkdownForCards,
  clearCardNameCache,
  processTextToJSX,
  type CardMatch,
  type ProcessedText
} from './cardNameDetection';

// Image preloading
export {
  cardImagePreloader,
  preloadCard,
  preloadCards,
  isCardPreloaded,
  preloadCardsFromText,
  getPreloadStatus,
  clearImageCache,
  getImageCacheStats
} from './imagePreloader';

// React components
export { default as CardTooltip } from '../../components/hearthstone/CardTooltip';
export { default as CardAwareText } from '../../components/hearthstone/CardAwareText';
export { default as CardAwareMarkdown } from '../../components/hearthstone/CardAwareMarkdown';
export { default as CardHoverTest } from '../../components/hearthstone/CardHoverTest';
