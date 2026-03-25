/**
 * Firebase Chat Service
 * Core service functions for chat history storage in Firestore
 * Follows MetaBloom's established patterns and error handling
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  FirebaseChatDocument,
  FirebaseChatMessage,
  CreateChatParams,
  CreateMessageParams,
  ChatQueryParams,
  MessageQueryParams,
  ServiceResult,
  ChatListResponse,
  MessageListResponse,
  ChatListenerCallback,
  MessageListenerCallback,
  ListenerErrorCallback,
  ListenerOptions,
  SyncStatus,
  ChatErrorCode,
  ChatServiceError,
  ComplexTextObject
} from './chat-types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate device origin identifier
 */
function getDeviceOrigin(): string {
  if (typeof window === 'undefined') return 'server';
  
  const userAgent = navigator.userAgent;
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'mobile';
  if (/Tablet/.test(userAgent)) return 'tablet';
  return 'desktop';
}

/**
 * Generate message order number for efficient sorting
 */
function generateMessageOrder(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

/**
 * Extract text preview from complex text object
 */
function extractTextPreview(text: string | ComplexTextObject, maxLength: number = 100): string {
  if (typeof text === 'string') {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  
  const preview = text.summary || text.code || 'Complex message';
  return preview.length > maxLength ? preview.substring(0, maxLength) + '...' : preview;
}

/**
 * Handle Firestore errors with consistent error mapping
 */
function handleFirestoreError(error: any, operation: string): ChatServiceError {
  console.error(`Chat service error in ${operation}:`, error);
  
  if (error.code === 'permission-denied') {
    return new ChatServiceError(ChatErrorCode.UNAUTHORIZED, 'Access denied', { operation, originalError: error });
  }
  
  if (error.code === 'not-found') {
    return new ChatServiceError(ChatErrorCode.NOT_FOUND, 'Document not found', { operation, originalError: error });
  }
  
  if (error.code === 'resource-exhausted') {
    return new ChatServiceError(ChatErrorCode.QUOTA_EXCEEDED, 'Quota exceeded', { operation, originalError: error });
  }
  
  if (error.code === 'unavailable' || error.message?.includes('offline')) {
    return new ChatServiceError(ChatErrorCode.NETWORK_ERROR, 'Network unavailable', { operation, originalError: error });
  }
  
  return new ChatServiceError(ChatErrorCode.UNKNOWN_ERROR, error.message || 'Unknown error', { operation, originalError: error });
}

// ============================================================================
// CHAT CRUD OPERATIONS
// ============================================================================

/**
 * Create a new chat document
 */
export async function createChat(params: CreateChatParams): Promise<ServiceResult<FirebaseChatDocument>> {
  try {
    const { userId, title, initialMessage, deviceOrigin = getDeviceOrigin() } = params;
    
    if (!userId || !title) {
      throw new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID and title are required');
    }
    
    const now = Timestamp.now();
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create chat document
    const chatDoc: FirebaseChatDocument = {
      id: chatId,
      title: title.trim(),
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      messageCount: initialMessage ? 1 : 0,
      isArchived: false,
      syncStatus: 'synced' as SyncStatus,
      deviceOrigin,
      lastMessage: initialMessage ? {
        text: extractTextPreview(initialMessage.text),
        isUser: initialMessage.isUser,
        timestamp: now
      } : {
        text: '',
        isUser: false,
        timestamp: now
      },
      metadata: {
        totalTokensUsed: 0,
        hasCodeBlocks: false,
        hasDeckCodes: false,
        tags: []
      },
      userId
    };
    
    const chatRef = doc(db, 'users', userId, 'chats', chatId);
    await setDoc(chatRef, chatDoc);
    
    // Add initial message if provided
    if (initialMessage) {
      const messageResult = await createMessage({
        userId,
        chatId,
        text: initialMessage.text,
        isUser: initialMessage.isUser,
        isStreaming: initialMessage.isStreaming || false,
        deviceOrigin
      });
      
      if (!messageResult.success) {
        console.warn('Failed to create initial message:', messageResult.error);
      }
    }
    
    console.log(`✅ Created chat ${chatId} for user ${userId}`);
    return { success: true, data: chatDoc };
    
  } catch (error) {
    const chatError = error instanceof ChatServiceError ? error : handleFirestoreError(error, 'createChat');
    return { success: false, error: chatError.message, code: chatError.code };
  }
}

/**
 * Get a specific chat document
 */
export async function getChat(userId: string, chatId: string): Promise<ServiceResult<FirebaseChatDocument>> {
  try {
    if (!userId || !chatId) {
      throw new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID and chat ID are required');
    }
    
    const chatRef = doc(db, 'users', userId, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new ChatServiceError(ChatErrorCode.NOT_FOUND, 'Chat not found');
    }
    
    const chatData = chatDoc.data() as FirebaseChatDocument;
    return { success: true, data: chatData };
    
  } catch (error) {
    const chatError = error instanceof ChatServiceError ? error : handleFirestoreError(error, 'getChat');
    return { success: false, error: chatError.message, code: chatError.code };
  }
}

/**
 * Get chat list with pagination
 */
export async function getChatList(params: ChatQueryParams): Promise<ServiceResult<ChatListResponse>> {
  try {
    const {
      userId,
      limit: queryLimit = 20,
      startAfter: startAfterDoc,
      includeArchived = false,
      orderBy: orderField = 'lastMessageAt',
      orderDirection = 'desc'
    } = params;
    
    if (!userId) {
      throw new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID is required');
    }
    
    const chatsRef = collection(db, 'users', userId, 'chats');
    // Simplified query to avoid composite index requirement
    let chatQuery = query(
      chatsRef,
      orderBy(orderField, orderDirection),
      limit(queryLimit)
    );
    
    if (startAfterDoc) {
      chatQuery = query(chatQuery, startAfter(startAfterDoc));
    }
    
    const querySnapshot = await getDocs(chatQuery);
    const chats: FirebaseChatDocument[] = [];

    querySnapshot.forEach((doc) => {
      const chatData = doc.data() as FirebaseChatDocument;
      // Filter archived chats based on includeArchived parameter
      if (chatData.isArchived === includeArchived) {
        chats.push(chatData);
      }
    });
    
    const hasMore = querySnapshot.docs.length === queryLimit;
    const lastDocument = querySnapshot.docs.length > 0 
      ? querySnapshot.docs[querySnapshot.docs.length - 1].data()[orderField] as Timestamp
      : undefined;
    
    console.log(`📋 Retrieved ${chats.length} chats for user ${userId}`);
    return {
      success: true,
      data: {
        chats,
        hasMore,
        lastDocument,
        totalCount: chats.length
      }
    };

  } catch (error) {
    const chatError = error instanceof ChatServiceError ? error : handleFirestoreError(error, 'getChatList');
    return { success: false, error: chatError.message, code: chatError.code };
  }
}

/**
 * Update chat document
 */
export async function updateChat(
  userId: string,
  chatId: string,
  updates: Partial<FirebaseChatDocument>
): Promise<ServiceResult<void>> {
  try {
    if (!userId || !chatId) {
      throw new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID and chat ID are required');
    }

    const chatRef = doc(db, 'users', userId, 'chats', chatId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
      userId // Ensure user ID is preserved
    };

    await updateDoc(chatRef, updateData);

    console.log(`✅ Updated chat ${chatId} for user ${userId}`);
    return { success: true };

  } catch (error) {
    const chatError = error instanceof ChatServiceError ? error : handleFirestoreError(error, 'updateChat');
    return { success: false, error: chatError.message, code: chatError.code };
  }
}

/**
 * Delete chat document and all its messages
 */
export async function deleteChat(userId: string, chatId: string): Promise<ServiceResult<void>> {
  try {
    if (!userId || !chatId) {
      throw new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID and chat ID are required');
    }

    // Use batch to delete chat and all messages atomically
    const batch = writeBatch(db);

    // Delete all messages first
    const messagesRef = collection(db, 'users', userId, 'chats', chatId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);

    messagesSnapshot.forEach((messageDoc) => {
      batch.delete(messageDoc.ref);
    });

    // Delete the chat document
    const chatRef = doc(db, 'users', userId, 'chats', chatId);
    batch.delete(chatRef);

    await batch.commit();

    console.log(`🗑️ Deleted chat ${chatId} and ${messagesSnapshot.size} messages for user ${userId}`);
    return { success: true };

  } catch (error) {
    const chatError = error instanceof ChatServiceError ? error : handleFirestoreError(error, 'deleteChat');
    return { success: false, error: chatError.message, code: chatError.code };
  }
}

// ============================================================================
// MESSAGE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new message in a chat
 */
export async function createMessage(params: CreateMessageParams): Promise<ServiceResult<FirebaseChatMessage>> {
  try {
    const { userId, chatId, text, isUser, isStreaming = false, deviceOrigin = getDeviceOrigin() } = params;

    if (!userId || !chatId || !text) {
      throw new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID, chat ID, and text are required');
    }

    const now = Timestamp.now();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const order = generateMessageOrder();

    // Create message document
    const messageDoc: FirebaseChatMessage = {
      id: messageId,
      text,
      isUser,
      timestamp: now,
      isStreaming,
      syncStatus: 'synced' as SyncStatus,
      deviceOrigin,
      order,
      createdAt: now,
      updatedAt: now
    };

    // Use batch to create message and update chat
    const batch = writeBatch(db);

    // Add message
    const messageRef = doc(db, 'users', userId, 'chats', chatId, 'messages', messageId);
    batch.set(messageRef, messageDoc);

    // Update chat with new message info
    const chatRef = doc(db, 'users', userId, 'chats', chatId);
    const chatUpdates = {
      lastMessageAt: now,
      updatedAt: now,
      messageCount: 1, // Will be incremented by Firestore
      lastMessage: {
        text: extractTextPreview(text),
        isUser,
        timestamp: now
      }
    };

    batch.update(chatRef, chatUpdates);

    await batch.commit();

    console.log(`💬 Created message ${messageId} in chat ${chatId} for user ${userId}`);
    return { success: true, data: messageDoc };

  } catch (error) {
    const chatError = error instanceof ChatServiceError ? error : handleFirestoreError(error, 'createMessage');
    return { success: false, error: chatError.message, code: chatError.code };
  }
}

/**
 * Get messages for a chat with pagination
 */
export async function getMessages(params: MessageQueryParams): Promise<ServiceResult<MessageListResponse>> {
  try {
    const {
      userId,
      chatId,
      limit: queryLimit = 50,
      startAfter: startAfterOrder,
      orderDirection = 'asc'
    } = params;

    if (!userId || !chatId) {
      throw new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID and chat ID are required');
    }

    const messagesRef = collection(db, 'users', userId, 'chats', chatId, 'messages');
    let messageQuery = query(
      messagesRef,
      orderBy('order', orderDirection),
      limit(queryLimit)
    );

    if (startAfterOrder) {
      // For order-based pagination, we need to use where clause instead of startAfter
      messageQuery = query(
        messagesRef,
        where('order', '>', startAfterOrder),
        orderBy('order', orderDirection),
        limit(queryLimit)
      );
    }

    const querySnapshot = await getDocs(messageQuery);
    const messages: FirebaseChatMessage[] = [];

    querySnapshot.forEach((doc) => {
      messages.push(doc.data() as FirebaseChatMessage);
    });

    const hasMore = querySnapshot.docs.length === queryLimit;
    const lastOrder = querySnapshot.docs.length > 0
      ? querySnapshot.docs[querySnapshot.docs.length - 1].data().order as number
      : undefined;

    console.log(`💬 Retrieved ${messages.length} messages for chat ${chatId}`);
    return {
      success: true,
      data: {
        messages,
        hasMore,
        lastOrder,
        totalCount: messages.length
      }
    };

  } catch (error) {
    const chatError = error instanceof ChatServiceError ? error : handleFirestoreError(error, 'getMessages');
    return { success: false, error: chatError.message, code: chatError.code };
  }
}

/**
 * Update a message
 */
export async function updateMessage(
  userId: string,
  chatId: string,
  messageId: string,
  updates: Partial<FirebaseChatMessage>
): Promise<ServiceResult<void>> {
  try {
    if (!userId || !chatId || !messageId) {
      throw new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID, chat ID, and message ID are required');
    }

    const messageRef = doc(db, 'users', userId, 'chats', chatId, 'messages', messageId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    await updateDoc(messageRef, updateData);

    console.log(`✅ Updated message ${messageId} in chat ${chatId}`);
    return { success: true };

  } catch (error) {
    const chatError = error instanceof ChatServiceError ? error : handleFirestoreError(error, 'updateMessage');
    return { success: false, error: chatError.message, code: chatError.code };
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(
  userId: string,
  chatId: string,
  messageId: string
): Promise<ServiceResult<void>> {
  try {
    if (!userId || !chatId || !messageId) {
      throw new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID, chat ID, and message ID are required');
    }

    const messageRef = doc(db, 'users', userId, 'chats', chatId, 'messages', messageId);
    await deleteDoc(messageRef);

    // TODO: Update chat messageCount and lastMessage if this was the last message

    console.log(`🗑️ Deleted message ${messageId} from chat ${chatId}`);
    return { success: true };

  } catch (error) {
    const chatError = error instanceof ChatServiceError ? error : handleFirestoreError(error, 'deleteMessage');
    return { success: false, error: chatError.message, code: chatError.code };
  }
}

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

/**
 * Set up real-time listener for chat list
 */
export function listenToChatList(
  userId: string,
  callback: ChatListenerCallback,
  errorCallback: ListenerErrorCallback,
  options: ListenerOptions = {}
): Unsubscribe {
  if (!userId) {
    errorCallback(new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID is required'));
    return () => {};
  }

  const chatsRef = collection(db, 'users', userId, 'chats');
  // Simplified query to avoid composite index requirement
  const chatQuery = query(
    chatsRef,
    orderBy('lastMessageAt', 'desc'),
    limit(50) // Reasonable limit for real-time updates
  );

  console.log(`🔄 Setting up chat list listener for user ${userId}`);

  return onSnapshot(
    chatQuery,
    {
      includeMetadataChanges: options.includeMetadataChanges || false
    },
    (snapshot) => {
      try {
        const chats: FirebaseChatDocument[] = [];
        snapshot.forEach((doc) => {
          const chatData = doc.data() as FirebaseChatDocument;
          // Filter out archived chats since we can't use where clause with orderBy
          if (!chatData.isArchived) {
            chats.push(chatData);
          }
        });

        console.log(`📡 Chat list updated: ${chats.length} chats`);
        callback(chats);
      } catch (error) {
        console.error('Error processing chat list snapshot:', error);
        errorCallback(error instanceof Error ? error : new Error('Unknown snapshot error'));
      }
    },
    (error) => {
      console.error('Chat list listener error:', error);
      errorCallback(handleFirestoreError(error, 'listenToChatList'));
    }
  );
}

/**
 * Set up real-time listener for messages in a chat
 */
export function listenToMessages(
  userId: string,
  chatId: string,
  callback: MessageListenerCallback,
  errorCallback: ListenerErrorCallback,
  options: ListenerOptions = {}
): Unsubscribe {
  if (!userId || !chatId) {
    errorCallback(new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID and chat ID are required'));
    return () => {};
  }

  const messagesRef = collection(db, 'users', userId, 'chats', chatId, 'messages');
  const messageQuery = query(
    messagesRef,
    orderBy('order', 'asc'),
    limit(100) // Reasonable limit for real-time updates
  );

  console.log(`🔄 Setting up message listener for chat ${chatId}`);

  return onSnapshot(
    messageQuery,
    {
      includeMetadataChanges: options.includeMetadataChanges || false
    },
    (snapshot) => {
      try {
        const messages: FirebaseChatMessage[] = [];
        snapshot.forEach((doc) => {
          messages.push(doc.data() as FirebaseChatMessage);
        });

        console.log(`📡 Messages updated: ${messages.length} messages in chat ${chatId}`);
        callback(messages);
      } catch (error) {
        console.error('Error processing messages snapshot:', error);
        errorCallback(error instanceof Error ? error : new Error('Unknown snapshot error'));
      }
    },
    (error) => {
      console.error('Messages listener error:', error);
      errorCallback(handleFirestoreError(error, 'listenToMessages'));
    }
  );
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Create multiple messages in a batch
 */
export async function createMessagesBatch(
  userId: string,
  chatId: string,
  messages: Omit<CreateMessageParams, 'userId' | 'chatId'>[]
): Promise<ServiceResult<FirebaseChatMessage[]>> {
  try {
    if (!userId || !chatId || !messages.length) {
      throw new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'User ID, chat ID, and messages are required');
    }

    if (messages.length > 500) {
      throw new ChatServiceError(ChatErrorCode.INVALID_INPUT, 'Batch size cannot exceed 500 messages');
    }

    const batch = writeBatch(db);
    const createdMessages: FirebaseChatMessage[] = [];
    const now = Timestamp.now();
    let baseOrder = generateMessageOrder();

    // Create all message documents
    messages.forEach((messageParams, index) => {
      const messageId = `msg_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
      const messageDoc: FirebaseChatMessage = {
        id: messageId,
        text: messageParams.text,
        isUser: messageParams.isUser,
        timestamp: now,
        isStreaming: messageParams.isStreaming || false,
        syncStatus: 'synced' as SyncStatus,
        deviceOrigin: messageParams.deviceOrigin || getDeviceOrigin(),
        order: baseOrder + index,
        createdAt: now,
        updatedAt: now
      };

      const messageRef = doc(db, 'users', userId, 'chats', chatId, 'messages', messageId);
      batch.set(messageRef, messageDoc);
      createdMessages.push(messageDoc);
    });

    // Update chat with last message info
    const lastMessage = messages[messages.length - 1];
    const chatRef = doc(db, 'users', userId, 'chats', chatId);
    const chatUpdates = {
      lastMessageAt: now,
      updatedAt: now,
      messageCount: messages.length, // Will be incremented
      lastMessage: {
        text: extractTextPreview(lastMessage.text),
        isUser: lastMessage.isUser,
        timestamp: now
      }
    };

    batch.update(chatRef, chatUpdates);

    await batch.commit();

    console.log(`📦 Created ${messages.length} messages in batch for chat ${chatId}`);
    return { success: true, data: createdMessages };

  } catch (error) {
    const chatError = error instanceof ChatServiceError ? error : handleFirestoreError(error, 'createMessagesBatch');
    return { success: false, error: chatError.message, code: chatError.code };
  }
}
