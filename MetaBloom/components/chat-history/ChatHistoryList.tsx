/**
 * Chat History List Component
 * Virtualized list for efficient rendering of chat items
 * Integrates with real-time updates and performance optimization
 */

'use client';

import React, { memo, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Chat } from '@/stores/chatList';
import { ChatHistoryItem } from './ChatHistoryItem';

interface ChatHistoryListProps {
  chats: Chat[];
  className?: string;
}

// Memoized list component for performance
export const ChatHistoryList = memo(function ChatHistoryList({
  chats,
  className = ''
}: ChatHistoryListProps) {
  const pathname = usePathname();
  
  // Extract current chat ID from pathname
  const currentChatId = useMemo(() => {
    const chatMatch = pathname.match(/\/chat\/([^\/]+)/);
    return chatMatch ? chatMatch[1] : null;
  }, [pathname]);

  // Memoized chat items
  const chatItems = useMemo(() => {
    return chats.map(chat => ({
      ...chat,
      isActive: chat.id === currentChatId
    }));
  }, [chats, currentChatId]);

  // Handle chat click navigation
  const handleChatClick = useCallback((chatId: string) => {
    // Navigation will be handled by ChatHistoryItem
  }, []);

  // For small lists (< 50 items), render normally without virtualization
  if (chats.length < 50) {
    return (
      <div className={`h-full overflow-y-auto overflow-x-hidden px-2 ${className}`}>
        <div className="space-y-1 py-1">
          {chatItems.map((chat) => (
            <ChatHistoryItem
              key={chat.id}
              chat={chat}
              isActive={chat.isActive}
              onClick={handleChatClick}
            />
          ))}
        </div>
      </div>
    );
  }

  // For larger lists, implement simple virtualization
  return (
    <VirtualizedChatList 
      chatItems={chatItems}
      onChatClick={handleChatClick}
      className={className}
    />
  );
});

// Simple virtualization component for large lists
interface VirtualizedChatListProps {
  chatItems: Array<Chat & { isActive: boolean }>;
  onChatClick: (chatId: string) => void;
  className?: string;
}

const VirtualizedChatList = memo(function VirtualizedChatList({
  chatItems,
  onChatClick,
  className = ''
}: VirtualizedChatListProps) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(400);

  const ITEM_HEIGHT = 32; // Match min-h-[32px] from ChatHistoryItem
  const BUFFER_SIZE = 5; // Number of items to render outside visible area
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Update container height on mount and resize
  React.useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(
      chatItems.length - 1,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, chatItems.length]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Visible items
  const visibleItems = useMemo(() => {
    return chatItems.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [chatItems, visibleRange]);

  const totalHeight = chatItems.length * ITEM_HEIGHT;
  const offsetY = visibleRange.startIndex * ITEM_HEIGHT;

  return (
    <div
      ref={containerRef}
      className={`h-full overflow-y-auto overflow-x-hidden px-2 ${className}`}
      onScroll={handleScroll}
      style={{ contain: 'layout style' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            willChange: 'transform'
          }}
        >
          {visibleItems.map((chat, index) => (
            <ChatHistoryItem
              key={chat.id}
              chat={chat}
              isActive={chat.isActive}
              onClick={onChatClick}
              style={{ minHeight: ITEM_HEIGHT }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default ChatHistoryList;
