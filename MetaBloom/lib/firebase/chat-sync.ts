/**
 * Firebase Chat Synchronization Utilities
 * Real-time synchronization and conflict resolution for chat data
 * Follows MetaBloom's established patterns for offline resilience
 */

import { Timestamp } from 'firebase/firestore';
import {
  SyncQueue,
  SyncOperation,
  SyncStatus,
  SyncStatusResponse,
  FirebaseChatDocument,
  FirebaseChatMessage,
  LocalStorageChat,
  LocalStorageChatMessage,
  ChatServiceError,
  ChatErrorCode
} from './chat-types';
import {
  createChat,
  createMessage,
  updateChat,
  updateMessage,
  getChatList,
  getMessages
} from './chat-service';

// ============================================================================
// SYNC QUEUE MANAGEMENT
// ============================================================================

/**
 * In-memory sync queue for offline operations
 */
class ChatSyncManager {
  private syncQueue: SyncQueue = {
    operations: [],
    isProcessing: false,
    lastProcessed: Date.now()
  };
  
  private readonly STORAGE_KEY = 'metabloom_chat_sync_queue';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second base delay
  
  constructor() {
    this.loadQueueFromStorage();
    this.setupPeriodicProcessing();
  }
  
  /**
   * Add operation to sync queue
   */
  addOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): void {
    const syncOperation: SyncOperation = {
      ...operation,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.MAX_RETRY_ATTEMPTS
    };
    
    this.syncQueue.operations.push(syncOperation);
    this.saveQueueToStorage();
    
    console.log(`📥 Added sync operation: ${syncOperation.type} ${syncOperation.collection}/${syncOperation.documentId}`);
    
    // Process immediately if online
    if (navigator.onLine && !this.syncQueue.isProcessing) {
      this.processQueue();
    }
  }
  
  /**
   * Process pending sync operations
   */
  async processQueue(): Promise<void> {
    if (this.syncQueue.isProcessing || this.syncQueue.operations.length === 0) {
      return;
    }
    
    this.syncQueue.isProcessing = true;
    console.log(`🔄 Processing ${this.syncQueue.operations.length} sync operations`);
    
    const processedOperations: string[] = [];
    
    for (const operation of this.syncQueue.operations) {
      try {
        await this.executeOperation(operation);
        processedOperations.push(operation.id);
        console.log(`✅ Completed sync operation: ${operation.id}`);
      } catch (error) {
        operation.retryCount++;
        operation.error = error instanceof Error ? error.message : 'Unknown error';
        
        if (operation.retryCount >= operation.maxRetries) {
          console.error(`❌ Failed sync operation after ${operation.maxRetries} attempts: ${operation.id}`, error);
          processedOperations.push(operation.id); // Remove failed operations
        } else {
          console.warn(`⚠️ Retry ${operation.retryCount}/${operation.maxRetries} for operation: ${operation.id}`);
          // Add exponential backoff delay
          await new Promise(resolve => 
            setTimeout(resolve, this.RETRY_DELAY_BASE * Math.pow(2, operation.retryCount - 1))
          );
        }
      }
    }
    
    // Remove processed operations
    this.syncQueue.operations = this.syncQueue.operations.filter(
      op => !processedOperations.includes(op.id)
    );
    
    this.syncQueue.lastProcessed = Date.now();
    this.syncQueue.isProcessing = false;
    this.saveQueueToStorage();
    
    console.log(`✅ Sync queue processing complete. ${this.syncQueue.operations.length} operations remaining`);
  }
  
  /**
   * Execute a single sync operation
   */
  private async executeOperation(operation: SyncOperation): Promise<void> {
    const { type, collection, documentId, data } = operation;
    
    switch (collection) {
      case 'chats':
        await this.executeChatOperation(type, documentId, data);
        break;
      case 'messages':
        await this.executeMessageOperation(type, documentId, data);
        break;
      default:
        throw new Error(`Unknown collection: ${collection}`);
    }
  }
  
  /**
   * Execute chat-specific operations
   */
  private async executeChatOperation(type: string, chatId: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        const createResult = await createChat(data);
        if (!createResult.success) {
          throw new Error(createResult.error);
        }
        break;
      case 'update':
        const updateResult = await updateChat(data.userId, chatId, data.updates);
        if (!updateResult.success) {
          throw new Error(updateResult.error);
        }
        break;
      default:
        throw new Error(`Unknown chat operation: ${type}`);
    }
  }
  
  /**
   * Execute message-specific operations
   */
  private async executeMessageOperation(type: string, messageId: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        const createResult = await createMessage(data);
        if (!createResult.success) {
          throw new Error(createResult.error);
        }
        break;
      case 'update':
        const updateResult = await updateMessage(data.userId, data.chatId, messageId, data.updates);
        if (!updateResult.success) {
          throw new Error(updateResult.error);
        }
        break;
      default:
        throw new Error(`Unknown message operation: ${type}`);
    }
  }
  
  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatusResponse {
    const isOnline = navigator.onLine;
    const hasPendingOperations = this.syncQueue.operations.length > 0;
    const hasErrors = this.syncQueue.operations.some(op => op.error);
    
    let status: SyncStatusResponse['status'];
    if (!isOnline) {
      status = 'offline';
    } else if (this.syncQueue.isProcessing) {
      status = 'syncing';
    } else if (hasErrors) {
      status = 'error';
    } else {
      status = 'synced';
    }
    
    return {
      status,
      pendingOperations: this.syncQueue.operations.length,
      lastSyncAt: this.syncQueue.lastProcessed > 0 ? Timestamp.fromMillis(this.syncQueue.lastProcessed) : undefined,
      errors: this.syncQueue.operations
        .filter(op => op.error)
        .map(op => `${op.type} ${op.collection}/${op.documentId}: ${op.error}`)
    };
  }
  
  /**
   * Clear all sync operations (use with caution)
   */
  clearQueue(): void {
    this.syncQueue.operations = [];
    this.saveQueueToStorage();
    console.log('🧹 Cleared sync queue');
  }
  
  /**
   * Load sync queue from sessionStorage
   */
  private loadQueueFromStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        console.log(`📂 Loaded ${this.syncQueue.operations.length} sync operations from storage`);
      }
    } catch (error) {
      console.warn('Failed to load sync queue from storage:', error);
      this.syncQueue = { operations: [], isProcessing: false, lastProcessed: Date.now() };
    }
  }
  
  /**
   * Save sync queue to sessionStorage
   */
  private saveQueueToStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.warn('Failed to save sync queue to storage:', error);
    }
  }
  
  /**
   * Set up periodic queue processing
   */
  private setupPeriodicProcessing(): void {
    if (typeof window === 'undefined') return;
    
    // Process queue when coming back online
    window.addEventListener('online', () => {
      console.log('🌐 Back online - processing sync queue');
      this.processQueue();
    });
    
    // Periodic processing every 30 seconds
    setInterval(() => {
      if (navigator.onLine && this.syncQueue.operations.length > 0) {
        this.processQueue();
      }
    }, 30000);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Global sync manager instance
 */
export const chatSyncManager = new ChatSyncManager();

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Queue a chat creation for sync
 */
export function queueChatCreation(chatData: any): void {
  chatSyncManager.addOperation({
    type: 'create',
    collection: 'chats',
    documentId: chatData.id,
    data: chatData,
    maxRetries: 3
  });
}

/**
 * Queue a message creation for sync
 */
export function queueMessageCreation(messageData: any): void {
  chatSyncManager.addOperation({
    type: 'create',
    collection: 'messages',
    documentId: messageData.id,
    data: messageData,
    maxRetries: 3
  });
}

/**
 * Get current synchronization status
 */
export function getSyncStatus(): SyncStatusResponse {
  return chatSyncManager.getSyncStatus();
}

/**
 * Force process sync queue
 */
export async function forceSyncProcess(): Promise<void> {
  await chatSyncManager.processQueue();
}

/**
 * Clear sync queue (use with caution)
 */
export function clearSyncQueue(): void {
  chatSyncManager.clearQueue();
}
