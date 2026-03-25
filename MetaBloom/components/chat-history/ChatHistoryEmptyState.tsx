/**
 * Chat History Empty State Component
 * Displays appropriate empty states for different scenarios
 * Follows MetaBloom's design patterns and provides helpful user guidance
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { PiPlus, PiCloudCheck, PiSpinner } from 'react-icons/pi';

interface ChatHistoryEmptyStateProps {
  isFirebaseSyncEnabled: boolean;
  isPending: boolean;
  className?: string;
}

export function ChatHistoryEmptyState({ 
  isFirebaseSyncEnabled, 
  isPending,
  className = '' 
}: ChatHistoryEmptyStateProps) {
  
  // Loading state while syncing
  if (isPending) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
        <PiSpinner className="w-8 h-8 text-primaryColor animate-spin mb-4" />
        <h3 className="text-sm font-medium text-n700 dark:text-n30 mb-2">
          Syncing chat history...
        </h3>
        <p className="text-xs text-n500 dark:text-n400 text-center">
          Loading your conversations from the cloud
        </p>
      </div>
    );
  }

  // Main empty state
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
      {/* Title and description */}
      <h3 className="text-sm font-medium text-n700 dark:text-n30 mb-2 text-center">
        No chat history yet
      </h3>
      <p className="text-xs text-n700 dark:text-n200 text-center max-w-[200px]">
        Start a conversation to see your chat history here
      </p>


    </div>
  );
}

/**
 * Loading skeleton for chat history items
 */
export function ChatHistoryLoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="py-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="px-6 py-3 animate-pulse">
          <div className="flex items-start gap-3">
            {/* Icon skeleton */}
            <div className="w-8 h-8 bg-n200 dark:bg-n600 rounded-lg flex-shrink-0" />
            
            {/* Content skeleton */}
            <div className="flex-1 min-w-0">
              {/* Title skeleton */}
              <div className="h-4 bg-n200 dark:bg-n600 rounded mb-2 w-3/4" />
              
              {/* Preview text skeleton */}
              <div className="h-3 bg-n100 dark:bg-n700 rounded mb-1 w-full" />
              <div className="h-3 bg-n100 dark:bg-n700 rounded mb-2 w-2/3" />
              
              {/* Timestamp skeleton */}
              <div className="h-3 bg-n100 dark:bg-n700 rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Error state for chat history
 */
export function ChatHistoryErrorState({ 
  error, 
  onRetry,
  className = '' 
}: { 
  error: string; 
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
      {/* Error icon */}
      <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
        <PiCloudCheck className="w-8 h-8 text-red-500" />
      </div>

      {/* Error message */}
      <h3 className="text-sm font-medium text-n700 dark:text-n30 mb-2 text-center">
        Failed to load chat history
      </h3>
      <p className="text-xs text-n500 dark:text-n400 text-center mb-6 max-w-[200px]">
        {error || 'Something went wrong while loading your conversations'}
      </p>

      {/* Retry button */}
      <button
        onClick={onRetry}
        className="
          inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
          bg-red-500 text-white rounded-lg
          hover:bg-red-600 transition-colors
          focus:outline-none focus:ring-2 focus:ring-red-500/50
        "
      >
        Try Again
      </button>
    </div>
  );
}

/**
 * Sync migration prompt
 */
export function SyncMigrationPrompt({ 
  onMigrate, 
  onSkip,
  className = '' 
}: { 
  onMigrate: () => void; 
  onSkip: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
      {/* Cloud icon */}
      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
        <PiCloudCheck className="w-8 h-8 text-blue-500" />
      </div>

      {/* Title and description */}
      <h3 className="text-sm font-medium text-n700 dark:text-n30 mb-2 text-center">
        Sync your chat history
      </h3>
      <p className="text-xs text-n500 dark:text-n400 text-center mb-6 max-w-[220px]">
        Enable cloud sync to access your conversations across all devices
      </p>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onMigrate}
          className="
            inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
            bg-primaryColor text-white rounded-lg
            hover:bg-primaryColor/90 transition-colors
            focus:outline-none focus:ring-2 focus:ring-primaryColor/50
          "
        >
          <PiCloudCheck className="w-4 h-4" />
          Enable Sync
        </button>
        
        <button
          onClick={onSkip}
          className="
            px-4 py-2 text-sm font-medium
            text-n600 dark:text-n300 border border-n300 dark:border-n600 rounded-lg
            hover:bg-n50 dark:hover:bg-n800 transition-colors
            focus:outline-none focus:ring-2 focus:ring-n300/50
          "
        >
          Skip
        </button>
      </div>
    </div>
  );
}

export default ChatHistoryEmptyState;
