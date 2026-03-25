/**
 * Firebase Chat Migration Utilities
 * Tools for migrating existing localStorage chat data to Firebase
 * Follows MetaBloom's established patterns for error handling and logging
 */

import { Timestamp } from 'firebase/firestore';
import {
  LocalStorageChat,
  LocalStorageChatMessage,
  FirebaseChatDocument,
  FirebaseChatMessage,
  MigrationProgress,
  MigrationOptions,
  ChatServiceError,
  ChatErrorCode,
  SyncStatus,
  ComplexTextObject
} from './chat-types';
import {
  createChat,
  createMessagesBatch,
  getChatList
} from './chat-service';

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

/**
 * Extract text preview from message for chat title generation
 */
function extractChatTitle(messages: LocalStorageChatMessage[]): string {
  if (messages.length === 0) return 'Empty Chat';
  
  const firstUserMessage = messages.find(msg => msg.isUser);
  if (!firstUserMessage) return 'New Chat';
  
  const text = typeof firstUserMessage.text === 'string' 
    ? firstUserMessage.text 
    : firstUserMessage.text.summary || 'Complex Message';
  
  // Clean and truncate title
  const cleanTitle = text
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleanTitle.length > 100 ? cleanTitle.substring(0, 100) + '...' : cleanTitle;
}

/**
 * Convert localStorage message to Firebase format
 */
function convertMessageToFirebase(
  message: LocalStorageChatMessage,
  order: number,
  deviceOrigin: string = 'migration'
): Omit<FirebaseChatMessage, 'id' | 'createdAt' | 'updatedAt'> {
  const timestamp = message.timestamp 
    ? Timestamp.fromDate(new Date(message.timestamp))
    : Timestamp.now();
  
  return {
    text: message.text,
    isUser: message.isUser,
    timestamp,
    isStreaming: message.isStreaming || false,
    syncStatus: 'synced' as SyncStatus,
    deviceOrigin,
    order
  };
}

/**
 * Convert localStorage chat to Firebase format
 */
function convertChatToFirebase(
  chat: LocalStorageChat,
  userId: string,
  deviceOrigin: string = 'migration'
): Omit<FirebaseChatDocument, 'createdAt' | 'updatedAt' | 'lastMessageAt'> {
  const now = Timestamp.now();
  const title = chat.title || extractChatTitle(chat.messages);
  
  // Find the last message for preview
  const lastMessage = chat.messages.length > 0 
    ? chat.messages[chat.messages.length - 1]
    : null;
  
  const lastMessageTimestamp = lastMessage?.timestamp
    ? Timestamp.fromDate(new Date(lastMessage.timestamp))
    : now;
  
  // Analyze messages for metadata
  const hasCodeBlocks = chat.messages.some(msg => 
    typeof msg.text === 'object' && msg.text.code
  );
  
  const hasDeckCodes = chat.messages.some(msg => {
    const text = typeof msg.text === 'string' ? msg.text : msg.text.summary || '';
    return /AAE[A-Za-z0-9+/=]+/.test(text); // Hearthstone deck code pattern
  });
  
  return {
    id: chat.id,
    title,
    messageCount: chat.messages.length,
    isArchived: false,
    syncStatus: 'synced' as SyncStatus,
    deviceOrigin,
    lastMessage: lastMessage ? {
      text: typeof lastMessage.text === 'string' 
        ? lastMessage.text.substring(0, 100)
        : lastMessage.text.summary?.substring(0, 100) || 'Complex message',
      isUser: lastMessage.isUser,
      timestamp: lastMessageTimestamp
    } : {
      text: '',
      isUser: false,
      timestamp: now
    },
    metadata: {
      totalTokensUsed: 0, // Will be calculated later if needed
      hasCodeBlocks,
      hasDeckCodes,
      tags: []
    },
    userId
  };
}

// ============================================================================
// MIGRATION MANAGER
// ============================================================================

/**
 * Chat Migration Manager
 * Handles the complete migration process from localStorage to Firebase
 */
export class ChatMigrationManager {
  private readonly STORAGE_KEY = 'chat-list';
  private readonly BATCH_SIZE = 10; // Messages per batch
  private readonly DELAY_BETWEEN_BATCHES = 100; // ms
  
  /**
   * Load chat data from localStorage
   */
  private loadLocalStorageChats(): LocalStorageChat[] {
    try {
      if (typeof window === 'undefined') return [];
      
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (!storedData) return [];
      
      const chats = JSON.parse(storedData);
      return Array.isArray(chats) ? chats : [];
    } catch (error) {
      console.error('Failed to load localStorage chats:', error);
      return [];
    }
  }
  
  /**
   * Check if chat already exists in Firebase
   */
  private async chatExistsInFirebase(userId: string, chatId: string): Promise<boolean> {
    try {
      const result = await getChatList({ userId, limit: 1000 }); // Get all chats
      if (!result.success || !result.data) return false;
      
      return result.data.chats.some(chat => chat.id === chatId);
    } catch (error) {
      console.warn('Failed to check if chat exists in Firebase:', error);
      return false;
    }
  }
  
  /**
   * Migrate a single chat with its messages
   */
  private async migrateSingleChat(
    chat: LocalStorageChat,
    userId: string,
    options: MigrationOptions,
    progress: MigrationProgress
  ): Promise<void> {
    try {
      // Check if chat already exists and skip if requested
      if (options.skipExisting && await this.chatExistsInFirebase(userId, chat.id)) {
        console.log(`⏭️ Skipping existing chat: ${chat.id}`);
        progress.processedChats++;
        progress.processedMessages += chat.messages.length;
        return;
      }
      
      // Convert chat to Firebase format
      const firebaseChat = convertChatToFirebase(chat, userId, 'migration');
      
      // Create chat document
      const chatResult = await createChat({
        userId,
        title: firebaseChat.title,
        deviceOrigin: 'migration'
      });
      
      if (!chatResult.success) {
        throw new Error(`Failed to create chat: ${chatResult.error}`);
      }
      
      console.log(`✅ Created chat: ${chat.id} -> ${chatResult.data?.id}`);
      progress.processedChats++;
      
      // Migrate messages in batches
      if (chat.messages.length > 0) {
        await this.migrateMessagesInBatches(
          chat.messages,
          userId,
          chatResult.data!.id,
          options,
          progress
        );
      }
      
    } catch (error) {
      const errorMessage = `Failed to migrate chat ${chat.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      progress.errors.push(errorMessage);
    }
  }
  
  /**
   * Migrate messages in batches to avoid overwhelming Firebase
   */
  private async migrateMessagesInBatches(
    messages: LocalStorageChatMessage[],
    userId: string,
    chatId: string,
    options: MigrationOptions,
    progress: MigrationProgress
  ): Promise<void> {
    const batchSize = options.batchSize || this.BATCH_SIZE;
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      try {
        // Convert messages to Firebase format
        const firebaseMessages = batch.map((msg, index) => ({
          text: msg.text,
          isUser: msg.isUser,
          isStreaming: msg.isStreaming || false,
          deviceOrigin: 'migration'
        }));
        
        // Create messages batch
        const result = await createMessagesBatch(userId, chatId, firebaseMessages);
        
        if (!result.success) {
          throw new Error(`Failed to create messages batch: ${result.error}`);
        }
        
        progress.processedMessages += batch.length;
        console.log(`📦 Migrated ${batch.length} messages (${progress.processedMessages}/${progress.totalMessages})`);
        
        // Update progress callback
        if (options.onProgress) {
          options.onProgress({ ...progress });
        }
        
        // Delay between batches to avoid rate limiting
        if (i + batchSize < messages.length) {
          await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_BATCHES));
        }
        
      } catch (error) {
        const errorMessage = `Failed to migrate message batch ${i}-${i + batch.length}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMessage);
        progress.errors.push(errorMessage);
      }
    }
  }
  
  /**
   * Perform complete migration from localStorage to Firebase
   */
  async migrateToFirebase(options: MigrationOptions): Promise<MigrationProgress> {
    const startTime = Date.now();
    
    // Initialize progress tracking
    const progress: MigrationProgress = {
      totalChats: 0,
      processedChats: 0,
      totalMessages: 0,
      processedMessages: 0,
      errors: [],
      startedAt: startTime
    };
    
    try {
      console.log('🚀 Starting chat migration to Firebase...');
      
      // Load chats from localStorage
      const localChats = this.loadLocalStorageChats();
      
      if (localChats.length === 0) {
        console.log('📭 No chats found in localStorage');
        progress.completedAt = Date.now();
        return progress;
      }
      
      // Calculate totals
      progress.totalChats = localChats.length;
      progress.totalMessages = localChats.reduce((sum, chat) => sum + chat.messages.length, 0);
      
      console.log(`📊 Migration plan: ${progress.totalChats} chats, ${progress.totalMessages} messages`);
      
      // Initial progress callback
      if (options.onProgress) {
        options.onProgress({ ...progress });
      }
      
      // Migrate each chat
      for (const chat of localChats) {
        await this.migrateSingleChat(chat, options.userId, options, progress);
        
        // Update progress callback
        if (options.onProgress) {
          options.onProgress({ ...progress });
        }
      }
      
      progress.completedAt = Date.now();
      const duration = progress.completedAt - startTime;
      
      console.log(`✅ Migration completed in ${duration}ms`);
      console.log(`📊 Results: ${progress.processedChats}/${progress.totalChats} chats, ${progress.processedMessages}/${progress.totalMessages} messages`);
      
      if (progress.errors.length > 0) {
        console.warn(`⚠️ ${progress.errors.length} errors occurred during migration`);
        progress.errors.forEach(error => console.warn(`  - ${error}`));
      }
      
      return progress;
      
    } catch (error) {
      const errorMessage = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      progress.errors.push(errorMessage);
      progress.completedAt = Date.now();
      
      throw new ChatServiceError(
        ChatErrorCode.MIGRATION_ERROR,
        errorMessage,
        { progress }
      );
    }
  }
  
  /**
   * Clear localStorage chat data after successful migration
   */
  clearLocalStorageChats(): void {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🧹 Cleared localStorage chat data');
    } catch (error) {
      console.warn('Failed to clear localStorage chat data:', error);
    }
  }
  
  /**
   * Get migration preview without actually migrating
   */
  getMigrationPreview(): { totalChats: number; totalMessages: number; chats: LocalStorageChat[] } {
    const chats = this.loadLocalStorageChats();
    const totalMessages = chats.reduce((sum, chat) => sum + chat.messages.length, 0);
    
    return {
      totalChats: chats.length,
      totalMessages,
      chats
    };
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Global migration manager instance
 */
export const chatMigrationManager = new ChatMigrationManager();

/**
 * Migrate localStorage chats to Firebase
 */
export async function migrateChatsToFirebase(options: MigrationOptions): Promise<MigrationProgress> {
  return chatMigrationManager.migrateToFirebase(options);
}

/**
 * Get migration preview
 */
export function getMigrationPreview() {
  return chatMigrationManager.getMigrationPreview();
}

/**
 * Clear localStorage after migration
 */
export function clearLocalStorageChats(): void {
  chatMigrationManager.clearLocalStorageChats();
}
