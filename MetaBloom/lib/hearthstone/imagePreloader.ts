// Image Preloader for Hearthstone Cards
// Preloads card images to improve hover performance

interface PreloadedImage {
  cardId: string;
  url: string;
  loaded: boolean;
  error: boolean;
  image?: HTMLImageElement;
}

class CardImagePreloader {
  private static instance: CardImagePreloader;
  private preloadedImages = new Map<string, PreloadedImage>();
  private preloadQueue: string[] = [];
  private isPreloading = false;
  private maxConcurrentPreloads = 3;
  private currentPreloads = 0;

  private constructor() {}

  public static getInstance(): CardImagePreloader {
    if (!CardImagePreloader.instance) {
      CardImagePreloader.instance = new CardImagePreloader();
    }
    return CardImagePreloader.instance;
  }

  /**
   * Get the image URL for a card ID
   */
  private getImageUrl(cardId: string): string {
    return `https://art.hearthstonejson.com/v1/render/latest/enUS/512x/${cardId}.png`;
  }

  /**
   * Preload a single card image
   */
  public async preloadCard(cardId: string): Promise<boolean> {
    if (!cardId) return false;

    // Check if already preloaded
    const existing = this.preloadedImages.get(cardId);
    if (existing) {
      return existing.loaded && !existing.error;
    }

    const url = this.getImageUrl(cardId);
    const preloadedImage: PreloadedImage = {
      cardId,
      url,
      loaded: false,
      error: false
    };

    this.preloadedImages.set(cardId, preloadedImage);

    return new Promise((resolve) => {
      const img = new Image();
      preloadedImage.image = img;

      img.onload = () => {
        preloadedImage.loaded = true;
        preloadedImage.error = false;
        this.currentPreloads--;
        this.processPreloadQueue();
        resolve(true);
      };

      img.onerror = () => {
        preloadedImage.loaded = false;
        preloadedImage.error = true;
        this.currentPreloads--;
        this.processPreloadQueue();
        resolve(false);
      };

      // Start loading
      this.currentPreloads++;
      img.src = url;
    });
  }

  /**
   * Preload multiple card images
   */
  public async preloadCards(cardIds: string[]): Promise<void> {
    if (!cardIds || cardIds.length === 0) return;

    // Filter out already preloaded cards
    const cardsToPreload = cardIds.filter(cardId => 
      cardId && !this.preloadedImages.has(cardId)
    );

    if (cardsToPreload.length === 0) return;

    // Add to queue
    this.preloadQueue.push(...cardsToPreload);

    // Start processing if not already running
    if (!this.isPreloading) {
      this.processPreloadQueue();
    }
  }

  /**
   * Process the preload queue with concurrency control
   */
  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) return;

    this.isPreloading = true;

    while (this.preloadQueue.length > 0 && this.currentPreloads < this.maxConcurrentPreloads) {
      const cardId = this.preloadQueue.shift();
      if (cardId) {
        // Don't await here to allow concurrent loading
        this.preloadCard(cardId);
      }
    }

    // Wait for all current preloads to complete
    while (this.currentPreloads > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isPreloading = false;

    // Continue processing if there are more items in queue
    if (this.preloadQueue.length > 0) {
      this.processPreloadQueue();
    }
  }

  /**
   * Check if a card image is preloaded and ready
   */
  public isCardPreloaded(cardId: string): boolean {
    const preloaded = this.preloadedImages.get(cardId);
    return preloaded ? preloaded.loaded && !preloaded.error : false;
  }

  /**
   * Get preload status for a card
   */
  public getPreloadStatus(cardId: string): { loaded: boolean; error: boolean; inQueue: boolean } {
    const preloaded = this.preloadedImages.get(cardId);
    const inQueue = this.preloadQueue.includes(cardId);

    return {
      loaded: preloaded ? preloaded.loaded : false,
      error: preloaded ? preloaded.error : false,
      inQueue
    };
  }

  /**
   * Clear preloaded images to free memory
   */
  public clearCache(): void {
    this.preloadedImages.clear();
    this.preloadQueue.length = 0;
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    totalPreloaded: number;
    successfullyLoaded: number;
    failedToLoad: number;
    queueLength: number;
    currentPreloads: number;
  } {
    let successfullyLoaded = 0;
    let failedToLoad = 0;

    for (const preloaded of this.preloadedImages.values()) {
      if (preloaded.loaded) successfullyLoaded++;
      if (preloaded.error) failedToLoad++;
    }

    return {
      totalPreloaded: this.preloadedImages.size,
      successfullyLoaded,
      failedToLoad,
      queueLength: this.preloadQueue.length,
      currentPreloads: this.currentPreloads
    };
  }

  /**
   * Preload images for cards detected in text
   */
  public preloadCardsFromText(cardIds: string[]): void {
    if (!cardIds || cardIds.length === 0) return;

    // Prioritize cards that are likely to be hovered soon
    const uniqueCardIds = [...new Set(cardIds)];
    
    // Start preloading in background
    this.preloadCards(uniqueCardIds).catch(error => {
      console.warn('Failed to preload some card images:', error);
    });
  }
}

// Export singleton instance
export const cardImagePreloader = CardImagePreloader.getInstance();

// Utility functions
export const preloadCard = (cardId: string): Promise<boolean> => cardImagePreloader.preloadCard(cardId);
export const preloadCards = (cardIds: string[]): Promise<void> => cardImagePreloader.preloadCards(cardIds);
export const isCardPreloaded = (cardId: string): boolean => cardImagePreloader.isCardPreloaded(cardId);
export const preloadCardsFromText = (cardIds: string[]): void => cardImagePreloader.preloadCardsFromText(cardIds);
export const getPreloadStatus = (cardId: string) => cardImagePreloader.getPreloadStatus(cardId);
export const clearImageCache = (): void => cardImagePreloader.clearCache();
export const getImageCacheStats = () => cardImagePreloader.getCacheStats();
