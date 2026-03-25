import { create } from "zustand";
import { Unsubscribe } from 'firebase/firestore';
import {
  listenToChatList,
  listenToMessages,
  createChat,
  createMessage,
  updateChat,
  updateMessage
} from '@/lib/firebase/chat-service';
import {
  chatSyncManager,
  queueChatCreation,
  queueMessageCreation,
  getSyncStatus,
  forceSyncProcess,
  clearSyncQueue
} from '@/lib/firebase/chat-sync';
import {
  ChatMigrationManager,
  migrateChatsToFirebase
} from '@/lib/firebase/chat-migration';
import {
  SyncStatus,
  SyncStatusResponse,
  MigrationProgress,
  FirebaseChatDocument,
  FirebaseChatMessage
} from '@/lib/firebase/chat-types';

// RequestAnimationFrame batching for smooth streaming updates
const createStreamingBatcher = (func: Function) => {
  let rafId: number | null = null;
  let latestArgs: any[] | null = null;

  return (...args: any[]) => {
    latestArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (latestArgs) {
          func(...latestArgs);
        }
        rafId = null;
        latestArgs = null;
      });
    }
  };
};

type ChatMessagesType = {
  id?: string;
  text:
    | string
    | {
        summary: string;
        isCommandSuggestion?: boolean;
        commands?: { command: string; label: string }[];
        code?: string;
        language?: string;
        image?: string;
      };
  isUser: boolean;
  timestamp: string;
  isStreaming?: boolean;
};

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessagesType[];
  // Firebase sync metadata
  syncStatus?: SyncStatus;
  lastSyncedAt?: number;
  deviceOrigin?: string;
}

// Enhanced sync state for individual chats
export interface ChatSyncState {
  [chatId: string]: {
    status: SyncStatus;
    lastSyncedAt: number;
    pendingOperations: number;
    error?: string;
  };
}

// Global sync status for the entire chat system
export interface GlobalSyncStatus {
  isEnabled: boolean;
  isOnline: boolean;
  isProcessing: boolean;
  pendingOperations: number;
  lastSyncedAt: number;
  userId?: string;
  error?: string;
}

type ChatHandlerType = {
  // Existing properties
  userQuery: string;
  chatList: Chat[];
  isAnimation: boolean;

  // Firebase sync state
  firebaseSyncEnabled: boolean;
  globalSyncStatus: GlobalSyncStatus;
  chatSyncStates: ChatSyncState;

  // Real-time listeners
  chatListListener: Unsubscribe | null;
  messageListeners: { [chatId: string]: Unsubscribe };

  // Existing methods (preserved exactly)
  handleSubmit: (text: string, chatId: string) => void;
  updateChatList: (userId?: string) => void;
  emptyQuery: () => void;
  setUserQuery: (text: string) => void;
  addStreamingMessage: (chatId: string, message: ChatMessagesType) => void;
  updateStreamingMessage: (chatId: string, messageId: string, text: string) => void;
  updateStreamingMessageThrottled: (chatId: string, messageId: string, text: string) => void;
  finalizeStreamingMessage: (chatId: string, messageId: string, finalText: string) => void;
  addErrorMessage: (chatId: string, errorMessage: ChatMessagesType) => void;

  // New Firebase sync methods
  enableFirebaseSync: (userId: string) => Promise<void>;
  disableFirebaseSync: () => void;
  syncChatToFirebase: (chatId: string) => Promise<void>;
  migrateChatHistory: (userId: string) => Promise<MigrationProgress>;

  // Sync state management
  getSyncStatus: (chatId?: string) => SyncStatus | GlobalSyncStatus;
  retryFailedSync: (chatId?: string) => Promise<void>;
  clearSyncQueue: () => void;

  // Real-time listener management
  setupChatListListener: (userId: string) => void;
  setupMessageListener: (chatId: string, userId: string) => void;
  cleanupListeners: () => void;

  // Enhanced localStorage operations with Firebase sync
  saveToLocalStorage: (chatList: Chat[], userId?: string) => void;
  loadFromLocalStorage: (userId?: string) => Chat[];
  clearUserChatHistory: (userId?: string) => void;
  initializeUserChatHistory: (userId: string) => void;
  clearCurrentChatState: () => void;
  clearAllChatCache: () => void;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => void;

  // Conflict resolution
  handleSyncConflict: (localChat: Chat, firebaseChat: FirebaseChatDocument) => Chat;
  mergeFirebaseChats: (localChats: Chat[], firebaseChats: Chat[]) => Chat[];

  // Performance optimizations
  batchFirebaseOperations: (operations: Array<() => Promise<any>>) => Promise<void>;
};

export const useChatHandler = create<ChatHandlerType>((set, get) => ({
  // Existing state
  userQuery: "",
  chatList: [], // Initialize with empty array instead of demo data
  isAnimation: false,

  // Firebase sync state (disabled by default to preserve existing functionality)
  firebaseSyncEnabled: false,
  globalSyncStatus: {
    isEnabled: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isProcessing: false,
    pendingOperations: 0,
    lastSyncedAt: 0,
    userId: undefined,
    error: undefined
  },
  chatSyncStates: {},

  // Real-time listeners
  chatListListener: null,
  messageListeners: {},

  // Existing methods (preserved)
  setUserQuery: (text) => {
    set({ userQuery: text });
  },
  emptyQuery: () => {
    set({ userQuery: "" });
  },
  // Enhanced localStorage operations with Firebase sync
  saveToLocalStorage: (chatList: Chat[], userId?: string) => {
    try {
      if (!userId) {
        console.warn("⚠️ No userId provided for saveToLocalStorage - skipping save");
        return;
      }
      const key = `chat-list-${userId}`;
      localStorage.setItem(key, JSON.stringify(chatList));
      console.log(`💾 Saved chat history for user: ${userId}`);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  },

  loadFromLocalStorage: (userId?: string): Chat[] => {
    try {
      if (!userId) {
        console.warn("⚠️ No userId provided for loadFromLocalStorage - returning empty array");
        return [];
      }
      const key = `chat-list-${userId}`;
      const storedData = localStorage.getItem(key);
      const result = storedData ? JSON.parse(storedData) : [];
      console.log(`📂 Loaded ${result.length} chats for user: ${userId}`);
      return result;
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      return [];
    }
  },

  clearUserChatHistory: (userId?: string) => {
    try {
      if (!userId) {
        console.warn("⚠️ No userId provided for clearUserChatHistory");
        return;
      }
      const key = `chat-list-${userId}`;
      localStorage.removeItem(key);
      console.log(`🧹 Cleared chat history for user: ${userId}`);
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  },

  initializeUserChatHistory: (userId: string) => {
    const state = get();

    // Clear current chat state
    set({
      chatList: [],
      userQuery: "",
      isAnimation: false
    });

    // Update global sync status with new user
    set((currentState) => ({
      globalSyncStatus: {
        ...currentState.globalSyncStatus,
        userId
      }
    }));

    // Load user-specific chat history
    state.updateChatList(userId);

    console.log(`👤 Initialized chat history for user: ${userId}`);
  },

  clearCurrentChatState: () => {
    set({
      chatList: [],
      userQuery: "",
      isAnimation: false,
      globalSyncStatus: {
        isEnabled: false,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isProcessing: false,
        pendingOperations: 0,
        lastSyncedAt: 0,
        userId: undefined,
        error: undefined
      }
    });

    console.log(`🧹 Cleared current chat state`);
  },



  clearAllChatCache: () => {
    try {
      const keysToRemove: string[] = [];

      // Find all chat-related keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('chat-list') || key === 'chat-list')) {
          keysToRemove.push(key);
        }
      }

      // Remove them
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log(`🧹 Cleared ${keysToRemove.length} chat cache keys:`, keysToRemove);

      // Clear current state
      set({
        chatList: [],
        userQuery: "",
        isAnimation: false
      });

      return keysToRemove;
    } catch (error) {
      console.error("Error clearing chat cache:", error);
      return [];
    }
  },

  deleteChat: (chatId: string) => {
    const state = get();

    set((currentState) => {
      const updatedChatList = currentState.chatList.filter(chat => chat.id !== chatId);

      // Save to localStorage if authenticated
      const isAuthenticated = localStorage.getItem("auth-storage") !== null;
      if (isAuthenticated) {
        const userId = state.globalSyncStatus.userId;
        currentState.saveToLocalStorage(updatedChatList, userId);
      }

      console.log(`🗑️ Deleted chat: ${chatId}`);

      return {
        chatList: updatedChatList
      };
    });
  },

  renameChat: (chatId: string, newTitle: string) => {
    const state = get();

    set((currentState) => {
      const updatedChatList = currentState.chatList.map(chat =>
        chat.id === chatId
          ? { ...chat, title: newTitle.trim() }
          : chat
      );

      // Save to localStorage if authenticated
      const isAuthenticated = localStorage.getItem("auth-storage") !== null;
      if (isAuthenticated) {
        const userId = state.globalSyncStatus.userId;
        currentState.saveToLocalStorage(updatedChatList, userId);
      }

      console.log(`✏️ Renamed chat ${chatId} to: ${newTitle}`);

      return {
        chatList: updatedChatList
      };
    });
  },

  updateChatList: (userId?: string) => {
    const state = get();

    // Load from localStorage first (cache-first strategy)
    const localChats = state.loadFromLocalStorage(userId);
    if (localChats.length > 0) {
      set({ chatList: localChats });
    }

    // If Firebase sync is enabled, sync in background
    if (state.firebaseSyncEnabled && state.globalSyncStatus.userId) {
      state.setupChatListListener(state.globalSyncStatus.userId);
    }
  },
  handleSubmit: async (text, chatId) => {
    const state = get();
    set({ userQuery: text });

    const timestamp = new Date().toISOString();
    const userMessage = { text, isUser: true, timestamp };

    // Check if user is authenticated by checking if there's data in localStorage
    const isAuthenticated = localStorage.getItem("auth-storage") !== null;

    // Optimistic update: Update local state immediately
    set((currentState) => {
      const chatExists = currentState.chatList.some((chat) => chat.id === chatId);
      let updatedChatList = [...currentState.chatList];

      if (!chatExists) {
        const newChat: Chat = {
          id: chatId,
          title: text,
          messages: [userMessage],
          syncStatus: state.firebaseSyncEnabled ? 'pending' : 'synced',
          lastSyncedAt: Date.now(),
          deviceOrigin: 'local'
        };
        updatedChatList = [newChat, ...updatedChatList];
      } else {
        updatedChatList = updatedChatList.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, userMessage],
              syncStatus: state.firebaseSyncEnabled ? 'pending' : 'synced',
              lastSyncedAt: Date.now()
            };
          }
          return chat;
        });
      }

      // Save to localStorage if authenticated
      if (isAuthenticated) {
        const userId = state.globalSyncStatus.userId;
        currentState.saveToLocalStorage(updatedChatList, userId);
      }

      return {
        chatList: updatedChatList,
        userQuery: ""
      };
    });

    // Firebase sync in background (only if explicitly enabled)
    // This is disabled by default to preserve existing chat functionality
    if (false && state.firebaseSyncEnabled && state.globalSyncStatus.userId && isAuthenticated) {
      try {
        const chatExists = state.chatList.some((chat) => chat.id === chatId);

        if (!chatExists) {
          // Queue chat creation
          queueChatCreation({
            id: chatId,
            title: text,
            userId: state.globalSyncStatus.userId,
            deviceOrigin: 'local'
          });
        }

        // Queue message creation
        queueMessageCreation({
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          chatId,
          text,
          isUser: true,
          userId: state.globalSyncStatus.userId,
          deviceOrigin: 'local'
        });

        // Process sync queue
        forceSyncProcess();

      } catch (error) {
        console.error("Firebase sync error:", error);
        // Update sync status to failed
        set((currentState) => ({
          chatSyncStates: {
            ...currentState.chatSyncStates,
            [chatId]: {
              status: 'failed',
              lastSyncedAt: Date.now(),
              pendingOperations: 0,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        }));
      }
    }
  },

  // Add a streaming message placeholder
  addStreamingMessage: (chatId, message) => {
    const state = get();

    set((currentState) => {
      // Check if chat exists
      const existingChatIndex = currentState.chatList.findIndex(chat => chat.id === chatId);
      let updatedChatList = [...currentState.chatList];

      if (existingChatIndex === -1) {
        // Create a new chat if it doesn't exist
        const newChat: Chat = {
          id: chatId,
          title: typeof message.text === 'string' ? message.text : 'New Chat',
          messages: [message],
          syncStatus: state.firebaseSyncEnabled ? 'pending' : 'synced',
          lastSyncedAt: Date.now(),
          deviceOrigin: 'local'
        };

        updatedChatList = [newChat, ...updatedChatList];
      } else {
        // Update existing chat
        updatedChatList[existingChatIndex] = {
          ...updatedChatList[existingChatIndex],
          messages: [...updatedChatList[existingChatIndex].messages, message],
          syncStatus: state.firebaseSyncEnabled ? 'pending' : 'synced',
          lastSyncedAt: Date.now()
        };
      }

      // Save to localStorage if authenticated
      const isAuthenticated = localStorage.getItem("auth-storage") !== null;
      if (isAuthenticated) {
        const userId = state.globalSyncStatus.userId;
        currentState.saveToLocalStorage(updatedChatList, userId);
      }

      return { chatList: updatedChatList };
    });

    // Firebase sync in background (disabled by default)
    if (false && state.firebaseSyncEnabled && state.globalSyncStatus.userId) {
      queueMessageCreation({
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chatId,
        text: message.text,
        isUser: message.isUser,
        isStreaming: message.isStreaming || false,
        userId: state.globalSyncStatus.userId,
        deviceOrigin: 'local'
      });
    }
  },

  // Placeholder for throttled update - will be replaced after store creation
  updateStreamingMessageThrottled: () => {},

  // Real-time Firebase listener management
  setupChatListListener: (userId: string) => {
    const state = get();

    // Clean up existing listener
    if (state.chatListListener) {
      state.chatListListener();
    }

    // Set up new listener
    const unsubscribe = listenToChatList(
      userId,
      (chats) => {
        // Handle real-time chat list updates
        const firebaseChats: Chat[] = chats.map(chat => ({
          id: chat.id,
          title: chat.title,
          messages: [], // Messages loaded separately
          syncStatus: 'synced',
          lastSyncedAt: Date.now(),
          deviceOrigin: chat.deviceOrigin
        }));

        set((currentState) => {
          // Merge with local chats, Firebase is authoritative
          const mergedChats = state.mergeFirebaseChats(currentState.chatList, firebaseChats);
          currentState.saveToLocalStorage(mergedChats, userId);

          return {
            chatList: mergedChats,
            globalSyncStatus: {
              ...currentState.globalSyncStatus,
              lastSyncedAt: Date.now(),
              error: undefined
            }
          };
        });
      },
      (error) => {
        console.error("Chat list listener error:", error);
        set((currentState) => ({
          globalSyncStatus: {
            ...currentState.globalSyncStatus,
            error: error.message
          }
        }));
      }
    );

    set({ chatListListener: unsubscribe });
  },

  setupMessageListener: (chatId: string, userId: string) => {
    const state = get();

    // Clean up existing listener for this chat
    if (state.messageListeners[chatId]) {
      state.messageListeners[chatId]();
    }

    // Set up new listener
    const unsubscribe = listenToMessages(
      userId,
      chatId,
      (messages) => {
        // Handle real-time message updates
        set((currentState) => {
          const updatedChatList = currentState.chatList.map(chat => {
            if (chat.id === chatId) {
              const firebaseMessages = messages.map(msg => ({
                id: msg.id,
                text: msg.text,
                isUser: msg.isUser,
                timestamp: msg.timestamp.toDate().toISOString(),
                isStreaming: msg.isStreaming
              }));

              return {
                ...chat,
                messages: firebaseMessages,
                syncStatus: 'synced' as SyncStatus,
                lastSyncedAt: Date.now()
              };
            }
            return chat;
          });

          const userId = state.globalSyncStatus.userId;
          currentState.saveToLocalStorage(updatedChatList, userId);

          return {
            chatList: updatedChatList,
            chatSyncStates: {
              ...currentState.chatSyncStates,
              [chatId]: {
                status: 'synced',
                lastSyncedAt: Date.now(),
                pendingOperations: 0
              }
            }
          };
        });
      },
      (error) => {
        console.error(`Message listener error for chat ${chatId}:`, error);
        set((currentState) => ({
          chatSyncStates: {
            ...currentState.chatSyncStates,
            [chatId]: {
              status: 'failed',
              lastSyncedAt: Date.now(),
              pendingOperations: 0,
              error: error.message
            }
          }
        }));
      }
    );

    set((currentState) => ({
      messageListeners: {
        ...currentState.messageListeners,
        [chatId]: unsubscribe
      }
    }));
  },

  cleanupListeners: () => {
    const state = get();

    // Clean up chat list listener
    if (state.chatListListener) {
      state.chatListListener();
    }

    // Clean up all message listeners
    Object.values(state.messageListeners).forEach(unsubscribe => {
      if (unsubscribe) unsubscribe();
    });

    set({
      chatListListener: null,
      messageListeners: {}
    });
  },

  // Firebase sync management methods
  enableFirebaseSync: async (userId: string) => {
    try {
      set((state) => ({
        firebaseSyncEnabled: true,
        globalSyncStatus: {
          ...state.globalSyncStatus,
          isEnabled: true,
          userId,
          isProcessing: true
        }
      }));

      // Set up real-time listeners
      const state = get();
      state.setupChatListListener(userId);

      // Process any pending sync operations
      await forceSyncProcess();

      set((currentState) => ({
        globalSyncStatus: {
          ...currentState.globalSyncStatus,
          isProcessing: false,
          lastSyncedAt: Date.now()
        }
      }));

      console.log("✅ Firebase sync enabled for user:", userId);
    } catch (error) {
      console.error("Failed to enable Firebase sync:", error);
      set((state) => ({
        globalSyncStatus: {
          ...state.globalSyncStatus,
          isProcessing: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  },

  disableFirebaseSync: () => {
    const state = get();

    // Clean up listeners
    state.cleanupListeners();

    // Clear sync queue
    clearSyncQueue();

    set({
      firebaseSyncEnabled: false,
      globalSyncStatus: {
        isEnabled: false,
        isOnline: navigator.onLine,
        isProcessing: false,
        pendingOperations: 0,
        lastSyncedAt: 0,
        userId: undefined,
        error: undefined
      },
      chatSyncStates: {}
    });

    console.log("🔄 Firebase sync disabled");
  },

  syncChatToFirebase: async (chatId: string) => {
    const state = get();
    if (!state.firebaseSyncEnabled || !state.globalSyncStatus.userId) {
      throw new Error("Firebase sync not enabled");
    }

    const chat = state.chatList.find(c => c.id === chatId);
    if (!chat) {
      throw new Error(`Chat ${chatId} not found`);
    }

    try {
      // Queue chat and all messages for sync
      queueChatCreation({
        id: chat.id,
        title: chat.title,
        userId: state.globalSyncStatus.userId,
        deviceOrigin: 'local'
      });

      chat.messages.forEach(message => {
        queueMessageCreation({
          id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          chatId: chat.id,
          text: message.text,
          isUser: message.isUser,
          isStreaming: message.isStreaming || false,
          userId: state.globalSyncStatus.userId!,
          deviceOrigin: 'local'
        });
      });

      await forceSyncProcess();

      set((currentState) => ({
        chatSyncStates: {
          ...currentState.chatSyncStates,
          [chatId]: {
            status: 'synced',
            lastSyncedAt: Date.now(),
            pendingOperations: 0
          }
        }
      }));

    } catch (error) {
      set((currentState) => ({
        chatSyncStates: {
          ...currentState.chatSyncStates,
          [chatId]: {
            status: 'failed',
            lastSyncedAt: Date.now(),
            pendingOperations: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }));
      throw error;
    }
  },

  migrateChatHistory: async (userId: string): Promise<MigrationProgress> => {
    try {
      const progress = await migrateChatsToFirebase({
        userId,
        skipExisting: true,
        batchSize: 10,
        onProgress: (progress) => {
          console.log(`Migration progress: ${progress.processedChats}/${progress.totalChats} chats`);
        }
      });

      // Refresh chat list after migration
      const state = get();
      if (state.firebaseSyncEnabled) {
        state.setupChatListListener(userId);
      }

      return progress;
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  },

  // Conflict resolution
  handleSyncConflict: (localChat: Chat, firebaseChat: FirebaseChatDocument): Chat => {
    // Firebase is authoritative for conflicts
    // Merge strategy: Firebase data wins, but preserve local pending changes
    return {
      id: firebaseChat.id,
      title: firebaseChat.title,
      messages: localChat.messages, // Keep local messages, will be synced separately
      syncStatus: 'synced',
      lastSyncedAt: Date.now(),
      deviceOrigin: firebaseChat.deviceOrigin
    };
  },

  // Helper method to merge Firebase chats with local chats
  mergeFirebaseChats: (localChats: Chat[], firebaseChats: Chat[]): Chat[] => {
    const merged = [...firebaseChats];

    // Add local chats that don't exist in Firebase
    localChats.forEach(localChat => {
      if (!firebaseChats.find(fc => fc.id === localChat.id)) {
        merged.push({
          ...localChat,
          syncStatus: 'pending'
        });
      }
    });

    return merged.sort((a, b) => (b.lastSyncedAt || 0) - (a.lastSyncedAt || 0));
  },

  // Update a streaming message as new chunks arrive
  updateStreamingMessage: (chatId, messageId, text) => {
    set((state) => {
      const existingChatIndex = state.chatList.findIndex(chat => chat.id === chatId);

      if (existingChatIndex === -1) {
        return state;
      }

      const chat = state.chatList[existingChatIndex];
      const messageIndex = chat.messages.findIndex(msg => msg.id === messageId);

      if (messageIndex === -1) {
        return state;
      }

      // Create updated message
      const updatedMessage = {
        ...chat.messages[messageIndex],
        text: text,
      };

      // Create updated messages array
      const updatedMessages = [...chat.messages];
      updatedMessages[messageIndex] = updatedMessage;

      // Create updated chat
      const updatedChat = {
        ...chat,
        messages: updatedMessages
      };

      // Also update the temporary navigation state if it exists
      try {
        const navKey = `nav-chat-${chatId}`;
        const navChatJson = sessionStorage.getItem(navKey);
        if (navChatJson) {
          const navChat = JSON.parse(navChatJson);
          const navMessageIndex = navChat.messages.findIndex((msg: any) => msg.id === messageId);

          if (navMessageIndex !== -1) {
            navChat.messages[navMessageIndex] = updatedMessage;
            sessionStorage.setItem(navKey, JSON.stringify(navChat));
          }
        }
      } catch (error) {
        console.error("Error updating navigation chat state:", error);
      }

      // Create updated chat list
      const updatedChatList = [...state.chatList];
      updatedChatList[existingChatIndex] = updatedChat;

      return { chatList: updatedChatList };
    });
  },

  // Finalize a streaming message when complete
  finalizeStreamingMessage: (chatId, messageId, finalText) => {
    set((state) => {
      const existingChatIndex = state.chatList.findIndex(chat => chat.id === chatId);

      if (existingChatIndex === -1) {
        return state;
      }

      const chat = state.chatList[existingChatIndex];
      const messageIndex = chat.messages.findIndex(msg => msg.id === messageId);

      if (messageIndex === -1) {
        return state;
      }

      // Create finalized message
      const finalizedMessage = {
        ...chat.messages[messageIndex],
        text: finalText,
        isStreaming: false
      };

      // Create updated messages array
      const updatedMessages = [...chat.messages];
      updatedMessages[messageIndex] = finalizedMessage;

      // Create updated chat
      const updatedChat = {
        ...chat,
        messages: updatedMessages
      };

      // Also update the temporary navigation state if it exists
      try {
        const navKey = `nav-chat-${chatId}`;
        const navChatJson = sessionStorage.getItem(navKey);
        if (navChatJson) {
          const navChat = JSON.parse(navChatJson);
          const navMessageIndex = navChat.messages.findIndex((msg: any) => msg.id === messageId);

          if (navMessageIndex !== -1) {
            navChat.messages[navMessageIndex] = finalizedMessage;
            sessionStorage.setItem(navKey, JSON.stringify(navChat));
          }
        }
      } catch (error) {
        console.error("Error updating navigation chat state:", error);
      }

      // Create updated chat list
      const updatedChatList = [...state.chatList];
      updatedChatList[existingChatIndex] = updatedChat;

      // Save to localStorage if authenticated
      const isAuthenticated = localStorage.getItem("auth-storage") !== null;
      if (isAuthenticated) {
        const userId = state.globalSyncStatus.userId;
        state.saveToLocalStorage(updatedChatList, userId);
      }

      return {
        chatList: updatedChatList,
        isAnimation: false,
        userQuery: ""
      };
    });
  },

  // Add an error message
  addErrorMessage: (chatId, errorMessage) => {
    const state = get();

    set((currentState) => {
      const existingChatIndex = currentState.chatList.findIndex(chat => chat.id === chatId);

      if (existingChatIndex === -1) {
        // Create a new chat if it doesn't exist
        const newChat: Chat = {
          id: chatId,
          title: "Error",
          messages: [errorMessage],
          syncStatus: state.firebaseSyncEnabled ? 'pending' : 'synced',
          lastSyncedAt: Date.now(),
          deviceOrigin: 'local'
        };

        const updatedChatList = [newChat, ...currentState.chatList];

        // Save to localStorage if authenticated
        const isAuthenticated = localStorage.getItem("auth-storage") !== null;
        if (isAuthenticated) {
          const userId = state.globalSyncStatus.userId;
          currentState.saveToLocalStorage(updatedChatList, userId);
        }

        return {
          chatList: updatedChatList,
          isAnimation: false
        };
      }

      // Update existing chat
      const updatedChatList = [...currentState.chatList];
      updatedChatList[existingChatIndex] = {
        ...updatedChatList[existingChatIndex],
        messages: [...updatedChatList[existingChatIndex].messages, errorMessage],
        syncStatus: state.firebaseSyncEnabled ? 'pending' : 'synced',
        lastSyncedAt: Date.now()
      };

      // Save to localStorage if authenticated
      const isAuthenticated = localStorage.getItem("auth-storage") !== null;
      if (isAuthenticated) {
        const userId = state.globalSyncStatus.userId;
        currentState.saveToLocalStorage(updatedChatList, userId);
      }

      return {
        chatList: updatedChatList,
        isAnimation: false
      };
    });

    // Firebase sync in background (disabled by default)
    if (false && state.firebaseSyncEnabled && state.globalSyncStatus.userId) {
      queueMessageCreation({
        id: errorMessage.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chatId,
        text: errorMessage.text,
        isUser: errorMessage.isUser,
        isStreaming: errorMessage.isStreaming || false,
        userId: state.globalSyncStatus.userId,
        deviceOrigin: 'local'
      });
    }
  },

  // Sync state management methods
  getSyncStatus: (chatId?: string) => {
    const state = get();

    if (chatId) {
      return state.chatSyncStates[chatId]?.status || 'synced';
    }

    return state.globalSyncStatus;
  },

  retryFailedSync: async (chatId?: string) => {
    const state = get();

    if (chatId) {
      // Retry sync for specific chat
      await state.syncChatToFirebase(chatId);
    } else {
      // Retry all failed syncs
      await forceSyncProcess();
    }
  },

  clearSyncQueue: () => {
    clearSyncQueue();

    set((state) => ({
      chatSyncStates: Object.keys(state.chatSyncStates).reduce((acc, chatId) => {
        acc[chatId] = {
          ...state.chatSyncStates[chatId],
          pendingOperations: 0
        };
        return acc;
      }, {} as ChatSyncState),
      globalSyncStatus: {
        ...state.globalSyncStatus,
        pendingOperations: 0
      }
    }));
  },

  // Performance optimization: batch Firebase operations
  batchFirebaseOperations: async (operations: Array<() => Promise<any>>) => {
    const BATCH_SIZE = 5;
    const batches = [];

    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      batches.push(operations.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      await Promise.all(batch.map(op => op()));
      // Small delay between batches to prevent overwhelming Firebase
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },

}));

// Enhanced RAF-batched version with Firebase sync support
const store = useChatHandler.getState();

// Create batched update that includes Firebase sync
const batchedUpdate = createStreamingBatcher((chatId: string, messageId: string, text: string) => {
  const currentState = useChatHandler.getState();

  // Update local state immediately
  currentState.updateStreamingMessage(chatId, messageId, text);

  // Queue Firebase sync if enabled (disabled by default)
  if (false && currentState.firebaseSyncEnabled && currentState.globalSyncStatus.userId) {
    queueMessageCreation({
      id: messageId,
      chatId,
      text,
      isUser: false, // Streaming messages are typically AI responses
      isStreaming: true,
      userId: currentState.globalSyncStatus.userId,
      deviceOrigin: 'local'
    });
  }
});

// Create batched Firebase sync processor
const batchedFirebaseSync = createStreamingBatcher(async () => {
  const currentState = useChatHandler.getState();
  if (currentState.firebaseSyncEnabled && currentState.globalSyncStatus.pendingOperations > 0) {
    try {
      await forceSyncProcess();
    } catch (error) {
      console.error("Batched Firebase sync error:", error);
    }
  }
});

// Add the batched methods to the store
useChatHandler.setState((state) => ({
  ...state,
  updateStreamingMessageThrottled: batchedUpdate,
  // Add batched Firebase sync method
  batchedFirebaseSync
}));

// Set up online/offline listeners for sync management (disabled by default)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const state = useChatHandler.getState();
    if (state.firebaseSyncEnabled) {
      useChatHandler.setState((currentState) => ({
        globalSyncStatus: {
          ...currentState.globalSyncStatus,
          isOnline: true
        }
      }));

      // Process pending sync operations when coming back online
      forceSyncProcess();
    }
  });

  window.addEventListener('offline', () => {
    const state = useChatHandler.getState();
    if (state.firebaseSyncEnabled) {
      useChatHandler.setState((currentState) => ({
        globalSyncStatus: {
          ...currentState.globalSyncStatus,
          isOnline: false
        }
      }));
    }
  });
}

// Enhanced store with Firebase integration is exported above
