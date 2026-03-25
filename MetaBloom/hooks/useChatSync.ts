/**
 * React Hook for Chat Firebase Sync Integration
 * Provides easy access to sync status and operations for components
 * Follows MetaBloom's established patterns for hooks and state management
 */

import { useCallback, useEffect, useState } from 'react';
import { useChatHandler, GlobalSyncStatus } from '@/stores/chatList';
import { useAuth } from '@/stores/auth';
import { SyncStatus, MigrationProgress } from '@/lib/firebase/chat-types';

// Hook return type
export interface UseChatSyncReturn {
  // Sync status
  isFirebaseSyncEnabled: boolean;
  globalSyncStatus: GlobalSyncStatus;
  getChatSyncStatus: (chatId: string) => SyncStatus;
  
  // Sync operations
  enableSync: () => Promise<void>;
  disableSync: () => void;
  syncChat: (chatId: string) => Promise<void>;
  retrySync: (chatId?: string) => Promise<void>;
  clearQueue: () => void;
  
  // Migration
  migrateHistory: () => Promise<MigrationProgress>;
  
  // Status helpers
  isPending: (chatId?: string) => boolean;
  isFailed: (chatId?: string) => boolean;
  isOnline: boolean;
  hasErrors: boolean;
  
  // Performance metrics
  pendingOperations: number;
  lastSyncedAt: number;
}

/**
 * Hook for managing chat Firebase synchronization
 */
export function useChatSync(): UseChatSyncReturn {
  const { user, isAuthenticated } = useAuth();
  const {
    firebaseSyncEnabled,
    globalSyncStatus,
    chatSyncStates,
    enableFirebaseSync,
    disableFirebaseSync,
    syncChatToFirebase,
    migrateChatHistory,
    getSyncStatus,
    retryFailedSync,
    clearSyncQueue
  } = useChatHandler();
  
  // Local state for UI feedback
  const [isEnabling, setIsEnabling] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  
  // Enable Firebase sync
  const enableSync = useCallback(async () => {
    if (!isAuthenticated || !user?.uid) {
      throw new Error('User must be authenticated to enable sync');
    }
    
    setIsEnabling(true);
    try {
      await enableFirebaseSync(user.uid);
    } finally {
      setIsEnabling(false);
    }
  }, [isAuthenticated, user?.uid, enableFirebaseSync]);
  
  // Disable Firebase sync
  const disableSync = useCallback(() => {
    disableFirebaseSync();
  }, [disableFirebaseSync]);
  
  // Sync specific chat
  const syncChat = useCallback(async (chatId: string) => {
    if (!firebaseSyncEnabled) {
      throw new Error('Firebase sync not enabled');
    }
    
    await syncChatToFirebase(chatId);
  }, [firebaseSyncEnabled, syncChatToFirebase]);
  
  // Retry failed sync
  const retrySync = useCallback(async (chatId?: string) => {
    await retryFailedSync(chatId);
  }, [retryFailedSync]);
  
  // Clear sync queue
  const clearQueue = useCallback(() => {
    clearSyncQueue();
  }, [clearSyncQueue]);
  
  // Migrate chat history
  const migrateHistory = useCallback(async (): Promise<MigrationProgress> => {
    if (!isAuthenticated || !user?.uid) {
      throw new Error('User must be authenticated to migrate history');
    }
    
    const progress = await migrateChatHistory(user.uid);
    setMigrationProgress(progress);
    return progress;
  }, [isAuthenticated, user?.uid, migrateChatHistory]);
  
  // Get chat sync status
  const getChatSyncStatus = useCallback((chatId: string): SyncStatus => {
    return getSyncStatus(chatId) as SyncStatus;
  }, [getSyncStatus]);
  
  // Status helpers
  const isPending = useCallback((chatId?: string): boolean => {
    if (chatId) {
      return getChatSyncStatus(chatId) === 'pending';
    }
    return globalSyncStatus.isProcessing || globalSyncStatus.pendingOperations > 0;
  }, [getChatSyncStatus, globalSyncStatus]);
  
  const isFailed = useCallback((chatId?: string): boolean => {
    if (chatId) {
      return getChatSyncStatus(chatId) === 'failed';
    }
    return !!globalSyncStatus.error;
  }, [getChatSyncStatus, globalSyncStatus]);
  
  const hasErrors = globalSyncStatus.error !== undefined || 
    Object.values(chatSyncStates).some(state => state.error);
  
  // Auto-enable sync when user authenticates (if not already enabled)
  useEffect(() => {
    if (isAuthenticated && user?.uid && !firebaseSyncEnabled && !isEnabling) {
      // Auto-enable sync for authenticated users
      // This can be made configurable based on user preferences
      console.log('🔄 Auto-enabling Firebase sync for authenticated user');
      enableSync().catch(error => {
        console.error('Failed to auto-enable sync:', error);
      });
    }
  }, [isAuthenticated, user?.uid, firebaseSyncEnabled, isEnabling, enableSync]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup is handled by the store's disableFirebaseSync method
    };
  }, []);
  
  return {
    // Sync status
    isFirebaseSyncEnabled: firebaseSyncEnabled,
    globalSyncStatus,
    getChatSyncStatus,
    
    // Sync operations
    enableSync,
    disableSync,
    syncChat,
    retrySync,
    clearQueue,
    
    // Migration
    migrateHistory,
    
    // Status helpers
    isPending,
    isFailed,
    isOnline: globalSyncStatus.isOnline,
    hasErrors,
    
    // Performance metrics
    pendingOperations: globalSyncStatus.pendingOperations,
    lastSyncedAt: globalSyncStatus.lastSyncedAt
  };
}

/**
 * Hook for getting sync status of a specific chat
 */
export function useChatSyncStatus(chatId: string) {
  const { getChatSyncStatus, isPending, isFailed } = useChatSync();
  
  return {
    status: getChatSyncStatus(chatId),
    isPending: isPending(chatId),
    isFailed: isFailed(chatId),
    isSync: getChatSyncStatus(chatId) === 'synced'
  };
}

/**
 * Hook for migration progress tracking
 */
export function useMigrationProgress() {
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [isInProgress, setIsInProgress] = useState(false);
  const { migrateHistory } = useChatSync();
  
  const startMigration = useCallback(async () => {
    setIsInProgress(true);
    try {
      const result = await migrateHistory();
      setProgress(result);
      return result;
    } finally {
      setIsInProgress(false);
    }
  }, [migrateHistory]);
  
  const clearProgress = useCallback(() => {
    setProgress(null);
  }, []);
  
  return {
    progress,
    isInProgress,
    startMigration,
    clearProgress
  };
}
