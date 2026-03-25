/**
 * Sync Status Indicator Component
 * Visual indicators for Firebase sync status across the application
 * Follows MetaBloom's established UI patterns and design system
 */

import React from 'react';
import { PiCloudCheck, PiCloudSlash, PiCloudWarning, PiSpinner, PiWifiSlash } from 'react-icons/pi';
import { useChatSync, useChatSyncStatus } from '@/hooks/useChatSync';
import { SyncStatus } from '@/lib/firebase/chat-types';

// Component props
interface SyncStatusIndicatorProps {
  chatId?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

interface GlobalSyncStatusProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

/**
 * Individual chat sync status indicator
 */
export function ChatSyncStatusIndicator({ 
  chatId, 
  size = 'sm', 
  showText = false, 
  className = '' 
}: SyncStatusIndicatorProps) {
  const { status, isPending, isFailed, isSync } = useChatSyncStatus(chatId!);
  
  if (!chatId) return null;
  
  const sizeClasses = {
    sm: 'w-3 h-3 text-xs',
    md: 'w-4 h-4 text-sm',
    lg: 'w-5 h-5 text-base'
  };
  
  const iconClass = `${sizeClasses[size]} ${className}`;
  
  const renderIcon = () => {
    if (isPending) {
      return <PiSpinner className={`${iconClass} text-blue-500 animate-spin`} />;
    }
    
    if (isFailed) {
      return <PiCloudWarning className={`${iconClass} text-red-500`} />;
    }
    
    if (isSync) {
      return <PiCloudCheck className={`${iconClass} text-green-500`} />;
    }
    
    return <PiCloudSlash className={`${iconClass} text-gray-400`} />;
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'synced':
        return 'Synced';
      case 'pending':
        return 'Syncing...';
      case 'failed':
        return 'Sync failed';
      case 'conflict':
        return 'Conflict';
      default:
        return 'Not synced';
    }
  };
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {renderIcon()}
      {showText && (
        <span className={`text-${size === 'sm' ? 'xs' : 'sm'} text-gray-600 dark:text-gray-400`}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
}

/**
 * Global sync status indicator
 */
export function GlobalSyncStatusIndicator({ 
  size = 'md', 
  showText = true, 
  className = '' 
}: GlobalSyncStatusProps) {
  const {
    isFirebaseSyncEnabled,
    globalSyncStatus,
    isPending,
    isFailed,
    isOnline,
    hasErrors,
    pendingOperations
  } = useChatSync();
  
  const sizeClasses = {
    sm: 'w-3 h-3 text-xs',
    md: 'w-4 h-4 text-sm',
    lg: 'w-5 h-5 text-base'
  };
  
  const iconClass = `${sizeClasses[size]}`;
  
  const renderIcon = () => {
    if (!isOnline) {
      return <PiWifiSlash className={`${iconClass} text-gray-500`} />;
    }
    
    if (!isFirebaseSyncEnabled) {
      return <PiCloudSlash className={`${iconClass} text-gray-400`} />;
    }
    
    if (isPending() || pendingOperations > 0) {
      return <PiSpinner className={`${iconClass} text-blue-500 animate-spin`} />;
    }
    
    if (isFailed() || hasErrors) {
      return <PiCloudWarning className={`${iconClass} text-red-500`} />;
    }
    
    return <PiCloudCheck className={`${iconClass} text-green-500`} />;
  };
  
  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }
    
    if (!isFirebaseSyncEnabled) {
      return 'Sync disabled';
    }
    
    if (isPending() || pendingOperations > 0) {
      return `Syncing${pendingOperations > 0 ? ` (${pendingOperations})` : '...'}`;
    }
    
    if (isFailed() || hasErrors) {
      return 'Sync error';
    }
    
    return 'Synced';
  };
  
  const getTooltip = () => {
    if (!isOnline) {
      return 'No internet connection. Changes will sync when online.';
    }
    
    if (!isFirebaseSyncEnabled) {
      return 'Firebase sync is disabled. Enable to sync across devices.';
    }
    
    if (isPending() || pendingOperations > 0) {
      return `Syncing ${pendingOperations} operation${pendingOperations !== 1 ? 's' : ''}...`;
    }
    
    if (isFailed() || hasErrors) {
      return 'Sync failed. Click to retry.';
    }
    
    const lastSynced = globalSyncStatus.lastSyncedAt;
    if (lastSynced > 0) {
      const timeAgo = Math.floor((Date.now() - lastSynced) / 1000);
      if (timeAgo < 60) {
        return 'Synced just now';
      } else if (timeAgo < 3600) {
        return `Synced ${Math.floor(timeAgo / 60)} minutes ago`;
      } else {
        return `Synced ${Math.floor(timeAgo / 3600)} hours ago`;
      }
    }
    
    return 'All changes synced';
  };
  
  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      title={getTooltip()}
    >
      {renderIcon()}
      {showText && (
        <span className={`text-${size === 'sm' ? 'xs' : 'sm'} text-gray-600 dark:text-gray-400`}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
}

/**
 * Sync status badge for chat list items
 */
export function ChatSyncBadge({ chatId, className = '' }: { chatId: string; className?: string }) {
  const { status } = useChatSyncStatus(chatId);
  
  if (status === 'synced') return null; // Don't show badge for synced chats
  
  const badgeColors = {
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    conflict: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  };
  
  const badgeText = {
    pending: 'Syncing',
    failed: 'Failed',
    conflict: 'Conflict'
  };
  
  return (
    <span className={`
      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
      ${badgeColors[status as keyof typeof badgeColors] || 'bg-gray-100 text-gray-800'}
      ${className}
    `}>
      {badgeText[status as keyof typeof badgeText] || status}
    </span>
  );
}

/**
 * Sync retry button
 */
export function SyncRetryButton({ 
  chatId, 
  className = '',
  children = 'Retry Sync'
}: { 
  chatId?: string; 
  className?: string;
  children?: React.ReactNode;
}) {
  const { retrySync } = useChatSync();
  const [isRetrying, setIsRetrying] = React.useState(false);
  
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retrySync(chatId);
    } catch (error) {
      console.error('Retry sync failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };
  
  return (
    <button
      onClick={handleRetry}
      disabled={isRetrying}
      className={`
        inline-flex items-center gap-2 px-3 py-1 text-sm
        bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300
        text-white rounded-md transition-colors
        ${className}
      `}
    >
      {isRetrying && <PiSpinner className="w-3 h-3 animate-spin" />}
      {children}
    </button>
  );
}
