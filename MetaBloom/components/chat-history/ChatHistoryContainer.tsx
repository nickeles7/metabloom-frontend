/**
 * Chat History Container Component
 * Main container for chat history in the sidebar
 * Integrates with enhanced Zustand store and Firebase sync
 */

'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/stores/auth';
import { useChatHandler } from '@/stores/chatList';
import { useChatSync } from '@/hooks/useChatSync';
import { ChatHistoryList } from './ChatHistoryList';
import { ChatHistoryEmptyState } from './ChatHistoryEmptyState';
import { PiSpinner, PiCloudWarning } from 'react-icons/pi';

interface ChatHistoryContainerProps {
  className?: string;
}

export function ChatHistoryContainer({ className = '' }: ChatHistoryContainerProps) {
  const { isAuthenticated, user } = useAuth();
  const {
    chatList,
    updateChatList,
    globalSyncStatus,
    initializeUserChatHistory,
    clearCurrentChatState
  } = useChatHandler();
  const {
    isFirebaseSyncEnabled,
    enableSync,
    isPending,
    hasErrors,
    retrySync
  } = useChatSync();

  const [isInitializing, setIsInitializing] = useState(true);
  const [autoSyncAttempted, setAutoSyncAttempted] = useState(false);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Memoized values for performance
  const sortedChatList = useMemo(() => {
    return [...chatList].sort((a, b) => {
      const aTime = a.lastSyncedAt || 0;
      const bTime = b.lastSyncedAt || 0;
      return bTime - aTime;
    });
  }, [chatList]);

  const hasPendingOperations = useMemo(() => {
    return isPending() && globalSyncStatus.pendingOperations > 0;
  }, [isPending, globalSyncStatus.pendingOperations]);

  // Memoized retry handler
  const handleRetrySync = useCallback(async () => {
    try {
      await retrySync();
    } catch (error) {
      console.error('Retry sync failed:', error);
    }
  }, [retrySync]);

  // Handle user changes and initialize chat history
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      // Check if user has changed
      if (lastUserId && lastUserId !== user.uid) {
        console.log(`👤 User changed from ${lastUserId} to ${user.uid} - reinitializing chat history`);
        // User has changed, initialize new user's chat history
        initializeUserChatHistory(user.uid);
      } else if (!lastUserId) {
        // First time login or page refresh
        console.log(`👤 Initializing chat history for user: ${user.uid}`);
        initializeUserChatHistory(user.uid);
      } else {
        // Same user, just update chat list
        updateChatList(user.uid);
      }

      setLastUserId(user.uid);
      setIsInitializing(false);

      // Auto-enable Firebase sync disabled by default to preserve existing functionality
      // Uncomment the lines below to enable auto-sync:
      // if (!isFirebaseSyncEnabled && !autoSyncAttempted) {
      //   setAutoSyncAttempted(true);
      //   enableSync().catch(error => {
      //     console.warn('Auto-enable sync failed:', error);
      //   });
      // }
    } else if (!isAuthenticated) {
      // User logged out, clear chat state
      if (lastUserId) {
        console.log(`👤 User logged out - clearing chat state`);
        clearCurrentChatState();
        setLastUserId(null);
      }
      setIsInitializing(false);
    }
  }, [isAuthenticated, user?.uid, lastUserId, updateChatList, initializeUserChatHistory, clearCurrentChatState, isFirebaseSyncEnabled, enableSync, autoSyncAttempted]);

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Loading state during initialization
  if (isInitializing) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
        <PiSpinner className="w-6 h-6 text-primaryColor animate-spin mb-2" />
        <span className="text-sm text-n500 dark:text-n400">Loading chat history...</span>
      </div>
    );
  }

  // Error state with retry option
  if (hasErrors && !isPending()) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 px-4 ${className}`}>
        <PiCloudWarning className="w-8 h-8 text-red-500 mb-3" />
        <span className="text-sm text-n600 dark:text-n300 text-center mb-3">
          Sync error occurred
        </span>
        <button
          onClick={handleRetrySync}
          className="px-3 py-1.5 text-xs bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 transition-colors"
        >
          Retry Sync
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* Chat list or empty state */}
      <div className="flex-1 overflow-hidden">
        {sortedChatList.length > 0 ? (
          <ChatHistoryList
            chats={sortedChatList}
            className="h-full"
          />
        ) : (
          <ChatHistoryEmptyState
            isFirebaseSyncEnabled={isFirebaseSyncEnabled}
            isPending={isPending()}
          />
        )}
      </div>
    </div>
  );
}

export default ChatHistoryContainer;
