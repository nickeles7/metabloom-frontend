/**
 * Firebase Chat Storage Types
 * TypeScript interfaces for chat history storage in Firestore
 * Follows MetaBloom's established patterns and conventions
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// CORE CHAT INTERFACES
// ============================================================================

/**
 * Complex text object for rich message content
 * Matches existing ChatMessagesType from stores/chatList.ts
 */
export interface ComplexTextObject {
  summary: string;
  isCommandSuggestion?: boolean;
  commands?: { command: string; label: string }[];
  code?: string;
  language?: string;
  image?: string;
}

/**
 * Firebase Chat Message Document
 * Stored in subcollection: /users/{userId}/chats/{chatId}/messages/{messageId}
 */
export interface FirebaseChatMessage {
  id: string;
  text: string | ComplexTextObject;
  isUser: boolean;
  timestamp: Timestamp;
  isStreaming: boolean;
  syncStatus: SyncStatus;
  deviceOrigin: string;
  
  // Performance optimization
  order: number; // For efficient ordering without timestamp sorting
  batchId?: string; // For batch operations
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Firebase Chat Document
 * Stored in collection: /users/{userId}/chats/{chatId}
 */
export interface FirebaseChatDocument {
  id: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt: Timestamp;
  messageCount: number;
  isArchived: boolean;
  syncStatus: SyncStatus;
  deviceOrigin: string; // Device that created the chat
  
  // Message preview for quick loading
  lastMessage: {
    text: string;
    isUser: boolean;
    timestamp: Timestamp;
  };
  
  // Metadata for UI optimization
  metadata: {
    totalTokensUsed: number;
    hasCodeBlocks: boolean;
    hasDeckCodes: boolean;
    tags: string[];
  };
  
  // User isolation
  userId: string;
}

// ============================================================================
// SYNC AND STATUS TYPES
// ============================================================================

/**
 * Synchronization status for cross-device operations
 */
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'conflict';

/**
 * Sync operation metadata
 */
export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: 'chats' | 'messages';
  documentId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

/**
 * Sync queue for offline operations
 */
export interface SyncQueue {
  operations: SyncOperation[];
  isProcessing: boolean;
  lastProcessed: number;
}

// ============================================================================
// COMPATIBILITY TYPES
// ============================================================================

/**
 * Local storage chat format (for migration)
 * Matches existing Chat interface from stores/chatList.ts
 */
export interface LocalStorageChat {
  id: string;
  title: string;
  messages: LocalStorageChatMessage[];
}

/**
 * Local storage message format (for migration)
 * Matches existing ChatMessagesType from stores/chatList.ts
 */
export interface LocalStorageChatMessage {
  id?: string;
  text: string | ComplexTextObject;
  isUser: boolean;
  timestamp: string; // ISO string format
  isStreaming?: boolean;
}

// ============================================================================
// SERVICE OPERATION TYPES
// ============================================================================

/**
 * Chat creation parameters
 */
export interface CreateChatParams {
  userId: string;
  title: string;
  initialMessage?: LocalStorageChatMessage;
  deviceOrigin?: string;
}

/**
 * Message creation parameters
 */
export interface CreateMessageParams {
  userId: string;
  chatId: string;
  text: string | ComplexTextObject;
  isUser: boolean;
  isStreaming?: boolean;
  deviceOrigin?: string;
}

/**
 * Chat query parameters
 */
export interface ChatQueryParams {
  userId: string;
  limit?: number;
  startAfter?: Timestamp;
  includeArchived?: boolean;
  orderBy?: 'createdAt' | 'lastMessageAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Message query parameters
 */
export interface MessageQueryParams {
  userId: string;
  chatId: string;
  limit?: number;
  startAfter?: number; // order field
  orderDirection?: 'asc' | 'desc';
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Service operation result
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Chat list response
 */
export interface ChatListResponse {
  chats: FirebaseChatDocument[];
  hasMore: boolean;
  lastDocument?: Timestamp;
  totalCount?: number;
}

/**
 * Message list response
 */
export interface MessageListResponse {
  messages: FirebaseChatMessage[];
  hasMore: boolean;
  lastOrder?: number;
  totalCount?: number;
}

/**
 * Sync status response
 */
export interface SyncStatusResponse {
  status: 'synced' | 'syncing' | 'error' | 'offline';
  pendingOperations: number;
  lastSyncAt?: Timestamp;
  errors?: string[];
}

// ============================================================================
// REAL-TIME LISTENER TYPES
// ============================================================================

/**
 * Real-time listener callback for chats
 */
export type ChatListenerCallback = (chats: FirebaseChatDocument[]) => void;

/**
 * Real-time listener callback for messages
 */
export type MessageListenerCallback = (messages: FirebaseChatMessage[]) => void;

/**
 * Listener error callback
 */
export type ListenerErrorCallback = (error: Error) => void;

/**
 * Listener options
 */
export interface ListenerOptions {
  includeMetadataChanges?: boolean;
  source?: 'default' | 'server' | 'cache';
}

// ============================================================================
// MIGRATION TYPES
// ============================================================================

/**
 * Migration progress tracking
 */
export interface MigrationProgress {
  totalChats: number;
  processedChats: number;
  totalMessages: number;
  processedMessages: number;
  errors: string[];
  startedAt: number;
  completedAt?: number;
}

/**
 * Migration options
 */
export interface MigrationOptions {
  userId: string;
  batchSize?: number;
  preserveTimestamps?: boolean;
  skipExisting?: boolean;
  onProgress?: (progress: MigrationProgress) => void;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Chat service error codes
 */
export enum ChatErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  MIGRATION_ERROR = 'MIGRATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Chat service error
 */
export class ChatServiceError extends Error {
  constructor(
    public code: ChatErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ChatServiceError';
  }
}
