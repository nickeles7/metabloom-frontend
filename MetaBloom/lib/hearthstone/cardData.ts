// Hearthstone Card Data Management System
// Fetches and caches card data from HearthstoneJSON API

export interface HearthstoneCard {
  id: string;
  name: string;
  cost?: number;
  attack?: number;
  health?: number;
  type: string;
  rarity?: string;
  set: string;
  playerClass?: string;
  text?: string;
  flavor?: string;
  artist?: string;
  collectible: boolean;
}

export interface CardNameMapping {
  [cardName: string]: string; // cardName -> cardId
}

class HearthstoneCardDataService {
  private static instance: HearthstoneCardDataService;
  private cardData: HearthstoneCard[] = [];
  private nameToIdMap: CardNameMapping = {};
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  // Cache configuration
  private readonly CACHE_KEY = 'hearthstone_card_data';
  private readonly CACHE_VERSION_KEY = 'hearthstone_card_data_version';
  private readonly CACHE_EXPIRY_HOURS = 24; // Cache for 24 hours
  private readonly API_URL = 'https://api.hearthstonejson.com/v1/223542/enUS/cards.collectible.json';

  // Fallback card data for common cards (in case API fails)
  private readonly FALLBACK_CARDS: HearthstoneCard[] = [
    // Classic/Core Cards
    { id: 'CS2_029', name: 'Fireball', cost: 4, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_024', name: 'Frostbolt', cost: 2, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_032', name: 'Flamestrike', cost: 7, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_023', name: 'Arcane Intellect', cost: 3, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_022', name: 'Polymorph', cost: 4, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_026', name: 'Frost Nova', cost: 3, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_028', name: 'Blizzard', cost: 6, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_025', name: 'Arcane Explosion', cost: 2, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_027', name: 'Mirror Image', cost: 1, type: 'SPELL', set: 'CORE', collectible: true },

    // Paladin Cards
    { id: 'CS2_087', name: 'Blessing of Might', cost: 1, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_092', name: 'Blessing of Kings', cost: 4, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_093', name: 'Consecration', cost: 4, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_088', name: 'Guardian of Kings', cost: 7, attack: 5, health: 6, type: 'MINION', set: 'CORE', collectible: true },
    { id: 'EX1_371', name: 'Hand of Protection', cost: 1, type: 'SPELL', set: 'EXPERT1', collectible: true },
    { id: 'EX1_360', name: 'Humility', cost: 1, type: 'SPELL', set: 'EXPERT1', collectible: true },
    { id: 'EX1_619', name: 'Equality', cost: 2, type: 'SPELL', set: 'EXPERT1', collectible: true },
    { id: 'CS2_089', name: 'Holy Light', cost: 2, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'CS2_091', name: 'Light\'s Justice', cost: 1, attack: 1, type: 'WEAPON', set: 'CORE', collectible: true },
    { id: 'CS2_094', name: 'Hammer of Wrath', cost: 4, type: 'SPELL', set: 'CORE', collectible: true },
    { id: 'EX1_365', name: 'Holy Wrath', cost: 5, type: 'SPELL', set: 'EXPERT1', collectible: true },

    // Common Neutral Minions
    { id: 'EX1_066', name: 'Acidic Swamp Ooze', cost: 2, attack: 3, health: 2, type: 'MINION', set: 'EXPERT1', collectible: true },
    { id: 'CS2_142', name: 'Kobold Geomancer', cost: 2, attack: 2, health: 2, type: 'MINION', set: 'CORE', collectible: true },
    { id: 'EX1_298', name: 'Ragnaros the Firelord', cost: 8, attack: 8, health: 8, type: 'MINION', set: 'EXPERT1', collectible: true },
    { id: 'NEW1_007', name: 'Nat Pagle', cost: 2, attack: 0, health: 4, type: 'MINION', set: 'EXPERT1', collectible: true },
    { id: 'EX1_012', name: 'Bloodmage Thalnos', cost: 2, attack: 1, health: 1, type: 'MINION', set: 'EXPERT1', collectible: true },

    // More Spells
    { id: 'EX1_287', name: 'Counterspell', cost: 3, type: 'SPELL', set: 'EXPERT1', collectible: true },
    { id: 'EX1_294', name: 'Mirror Entity', cost: 3, type: 'SPELL', set: 'EXPERT1', collectible: true },
    { id: 'EX1_279', name: 'Pyroblast', cost: 10, type: 'SPELL', set: 'EXPERT1', collectible: true },
    { id: 'EX1_295', name: 'Ice Block', cost: 3, type: 'SPELL', set: 'EXPERT1', collectible: true },
    { id: 'EX1_289', name: 'Ice Barrier', cost: 3, type: 'SPELL', set: 'EXPERT1', collectible: true },

    // Add some placeholder cards for the ones mentioned in the response
    { id: 'PLACEHOLDER_001', name: 'Righteous Protector', cost: 1, attack: 1, health: 1, type: 'MINION', set: 'PLACEHOLDER', collectible: true },
    { id: 'PLACEHOLDER_002', name: 'Dragonscale Armaments', cost: 1, type: 'SPELL', set: 'PLACEHOLDER', collectible: true },
    { id: 'PLACEHOLDER_003', name: 'Goldpetal Drake', cost: 3, attack: 3, health: 3, type: 'MINION', set: 'PLACEHOLDER', collectible: true },
    { id: 'PLACEHOLDER_004', name: 'Flutterwing Guardian', cost: 4, attack: 3, health: 5, type: 'MINION', set: 'PLACEHOLDER', collectible: true },
    { id: 'PLACEHOLDER_005', name: 'Anachronos', cost: 7, attack: 7, health: 7, type: 'MINION', set: 'PLACEHOLDER', collectible: true },
    { id: 'PLACEHOLDER_006', name: 'Malorne the Waywatcher', cost: 8, attack: 8, health: 8, type: 'MINION', set: 'PLACEHOLDER', collectible: true },
    { id: 'PLACEHOLDER_007', name: 'The Ceaseless Expanse', cost: 125, attack: 30, health: 30, type: 'MINION', set: 'PLACEHOLDER', collectible: true }
  ];

  private constructor() {}

  public static getInstance(): HearthstoneCardDataService {
    if (!HearthstoneCardDataService.instance) {
      HearthstoneCardDataService.instance = new HearthstoneCardDataService();
    }
    return HearthstoneCardDataService.instance;
  }

  /**
   * Initialize the card data service
   * This should be called early in the app lifecycle
   */
  public async initialize(): Promise<void> {
    if (this.isLoaded) return;
    if (this.isLoading) return this.loadPromise!;

    this.isLoading = true;
    this.loadPromise = this.loadCardData();
    
    try {
      await this.loadPromise;
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to initialize Hearthstone card data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load card data from cache or API
   */
  private async loadCardData(): Promise<void> {
    try {
      // Try to load from cache first
      const cachedData = this.loadFromCache();
      if (cachedData) {
        this.cardData = cachedData.cards;
        this.nameToIdMap = cachedData.nameMap;
        console.log(`✅ Loaded ${this.cardData.length} Hearthstone cards from cache`);
        return;
      }

      // Try to fetch from API if cache is empty or expired
      console.log('📡 Fetching Hearthstone card data from API:', this.API_URL);

      try {
        // Create timeout controller for better browser compatibility
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(this.API_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('📡 API Response status:', response.status, response.statusText);
        console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          throw new Error(`API responded with ${response.status}: ${response.statusText}`);
        }

        const cards: HearthstoneCard[] = await response.json();
        console.log('📦 Raw API response - received', cards.length, 'cards');

        // Filter and process cards
        this.cardData = cards.filter(card =>
          card.collectible &&
          card.name &&
          card.id &&
          card.type !== 'ENCHANTMENT' // Exclude enchantments
        );

        // Build name-to-ID mapping
        this.buildNameMapping();

        // Cache the processed data
        this.saveToCache();

        console.log(`✅ Loaded ${this.cardData.length} Hearthstone cards from API`);

        // Test specific cards from your deck
        const testCards = ['tour guide', 'wildfire', 'seabreeze chalice', 'ice block', 'mordresh fire eye', 'flutterwing guardian'];
        console.log('🧪 Testing specific cards from your deck:');
        testCards.forEach(cardName => {
          const found = cardName in this.nameToIdMap;
          const cardId = this.nameToIdMap[cardName];
          console.log(`  - "${cardName}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}${cardId ? ` (ID: ${cardId})` : ''}`);
        });

        // Show sample of loaded card names
        const sampleNames = Object.keys(this.nameToIdMap).slice(0, 20);
        console.log('📋 Sample card names loaded:', sampleNames);

      } catch (apiError) {
        console.warn('⚠️ API fetch failed, using fallback card data:', apiError);

        // Use fallback card data
        this.cardData = [...this.FALLBACK_CARDS];
        this.buildNameMapping();

        // Cache the fallback data
        this.saveToCache();

        console.log(`✅ Loaded ${this.cardData.length} Hearthstone cards from fallback data`);
        console.log('📋 Available card names:', this.cardData.map(c => c.name).slice(0, 10));
      }
    } catch (error) {
      console.error('❌ Failed to load Hearthstone card data:', error);
      // Try to use any existing cached data as fallback
      const fallbackData = this.loadFromCache(true); // Skip expiry check
      if (fallbackData) {
        this.cardData = fallbackData.cards;
        this.nameToIdMap = fallbackData.nameMap;
        console.log('⚠️ Using expired cache data as fallback');
      }
    }
  }

  /**
   * Build the card name to ID mapping
   */
  private buildNameMapping(): void {
    this.nameToIdMap = {};
    
    for (const card of this.cardData) {
      if (card.name) {
        // Store exact name match
        this.nameToIdMap[card.name] = card.id;
        
        // Store lowercase version for case-insensitive matching
        this.nameToIdMap[card.name.toLowerCase()] = card.id;
        
        // Store version without special characters for fuzzy matching
        const cleanName = card.name.replace(/[^\w\s]/g, '').toLowerCase();
        if (cleanName !== card.name.toLowerCase()) {
          this.nameToIdMap[cleanName] = card.id;
        }
      }
    }
  }

  /**
   * Load data from localStorage cache
   */
  private loadFromCache(skipExpiryCheck = false): { cards: HearthstoneCard[], nameMap: CardNameMapping } | null {
    try {
      const cachedData = localStorage.getItem(this.CACHE_KEY);
      const cachedVersion = localStorage.getItem(this.CACHE_VERSION_KEY);
      
      if (!cachedData || !cachedVersion) return null;

      const versionData = JSON.parse(cachedVersion);
      const now = Date.now();
      const cacheAge = now - versionData.timestamp;
      const maxAge = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

      // Check if cache is expired (unless skipping expiry check)
      if (!skipExpiryCheck && cacheAge > maxAge) {
        console.log('🕒 Card data cache expired, will fetch fresh data');
        return null;
      }

      const data = JSON.parse(cachedData);
      return {
        cards: data.cards || [],
        nameMap: data.nameMap || {}
      };
    } catch (error) {
      console.error('Failed to load card data from cache:', error);
      return null;
    }
  }

  /**
   * Save data to localStorage cache
   */
  private saveToCache(): void {
    try {
      const cacheData = {
        cards: this.cardData,
        nameMap: this.nameToIdMap
      };

      const versionData = {
        timestamp: Date.now(),
        version: '1.0'
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      localStorage.setItem(this.CACHE_VERSION_KEY, JSON.stringify(versionData));
      
      console.log('💾 Cached Hearthstone card data');
    } catch (error) {
      console.error('Failed to cache card data:', error);
    }
  }

  /**
   * Get card ID by name (case-insensitive)
   */
  public getCardId(cardName: string): string | null {
    if (!this.isLoaded) {
      console.warn('Card data not loaded yet. Call initialize() first.');
      return null;
    }

    // Try exact match first
    if (this.nameToIdMap[cardName]) {
      return this.nameToIdMap[cardName];
    }

    // Try case-insensitive match
    const lowerName = cardName.toLowerCase();
    if (this.nameToIdMap[lowerName]) {
      return this.nameToIdMap[lowerName];
    }

    // Try fuzzy match (without special characters)
    const cleanName = cardName.replace(/[^\w\s]/g, '').toLowerCase();
    if (this.nameToIdMap[cleanName]) {
      return this.nameToIdMap[cleanName];
    }

    return null;
  }

  /**
   * Get card data by ID
   */
  public getCardById(cardId: string): HearthstoneCard | null {
    if (!this.isLoaded) return null;
    return this.cardData.find(card => card.id === cardId) || null;
  }

  /**
   * Get card data by name
   */
  public getCardByName(cardName: string): HearthstoneCard | null {
    const cardId = this.getCardId(cardName);
    return cardId ? this.getCardById(cardId) : null;
  }

  /**
   * Get all card names for text processing
   */
  public getAllCardNames(): string[] {
    if (!this.isLoaded) return [];
    return this.cardData.map(card => card.name).filter(Boolean);
  }

  /**
   * Check if the service is ready
   */
  public isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Get loading status
   */
  public getLoadingStatus(): { isLoading: boolean; isLoaded: boolean } {
    return {
      isLoading: this.isLoading,
      isLoaded: this.isLoaded
    };
  }

  /**
   * Force refresh card data from API
   */
  public async refresh(): Promise<void> {
    // Clear cache
    localStorage.removeItem(this.CACHE_KEY);
    localStorage.removeItem(this.CACHE_VERSION_KEY);
    
    // Reset state
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.cardData = [];
    this.nameToIdMap = {};

    // Reload
    await this.initialize();
  }
}

// Export singleton instance
export const cardDataService = HearthstoneCardDataService.getInstance();

// Utility functions for easy access
export const getCardId = (cardName: string): string | null => cardDataService.getCardId(cardName);
export const getCardByName = (cardName: string): HearthstoneCard | null => cardDataService.getCardByName(cardName);
export const getCardById = (cardId: string): HearthstoneCard | null => cardDataService.getCardById(cardId);
export const getAllCardNames = (): string[] => cardDataService.getAllCardNames();
export const isCardDataReady = (): boolean => cardDataService.isReady();

// Initialize card data service (call this in your app initialization)
export const initializeCardData = (): Promise<void> => cardDataService.initialize();
