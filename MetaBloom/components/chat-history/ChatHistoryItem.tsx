/**
 * Chat History Item Component
 * Clean, minimal chat item with hover actions (rename/delete)
 * Inspired by Claude.ai's interface design
 */

'use client';

import React, { memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chat, useChatHandler } from '@/stores/chatList';
import { PiDotsThree, PiPencil, PiTrash } from 'react-icons/pi';

interface ChatHistoryItemProps {
  chat: Chat;
  isActive: boolean;
  onClick: (chatId: string) => void;
  style?: React.CSSProperties;
}

export const ChatHistoryItem = memo(function ChatHistoryItem({
  chat,
  isActive,
  onClick,
  style
}: ChatHistoryItemProps) {
  const router = useRouter();
  const { deleteChat, renameChat } = useChatHandler();
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);

  // Handle click navigation
  const handleClick = () => {
    if (isRenaming) return; // Don't navigate while renaming
    router.push(`/chat/${chat.id}`);
    onClick(chat.id);
  };

  // Handle delete with confirmation
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${chat.title}"?\n\nThis action cannot be undone.`)) {
      deleteChat(chat.id);
      // If we're deleting the active chat, redirect to home
      if (isActive) {
        router.push('/');
      }
    }
  };

  // Handle rename
  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setNewTitle(chat.title);
  };

  // Save rename
  const saveRename = () => {
    if (newTitle.trim() && newTitle.trim() !== chat.title) {
      renameChat(chat.id, newTitle.trim());
    }
    setIsRenaming(false);
  };

  // Cancel rename
  const cancelRename = () => {
    setIsRenaming(false);
    setNewTitle(chat.title);
  };

  // Handle rename input
  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  return (
    <div
      style={style}
      className={`
        grid grid-cols-[1fr_auto] items-center gap-2 py-1.5 px-3 rounded-lg group
        transition-colors cursor-pointer min-h-[32px]
        ${isActive
          ? 'bg-primaryColor/10 text-n700 dark:text-n100'
          : 'hover:bg-n100 dark:hover:bg-n700 text-n700 dark:text-n200'
        }
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`Open chat: ${chat.title}`}
    >
      {/* Chat title - responsive grid column */}
      <div className="truncate text-sm font-medium min-w-0">
        {isRenaming ? (
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={saveRename}
            className="w-full bg-transparent border-none outline-none text-sm font-medium text-n700 dark:text-n200"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="block truncate">
            {chat.title}
          </span>
        )}
      </div>

      {/* Action buttons - auto-sized grid column */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isHovered && !isRenaming ? (
          <>
            <button
              onClick={handleRename}
              className="p-1.5 rounded hover:bg-n200 dark:hover:bg-n600 transition-colors"
              title="Rename chat"
            >
              <PiPencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 pr-4 rounded hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Delete chat"
            >
              <PiTrash size={14} />
            </button>
          </>
        ) : !isRenaming ? (
          <div className="p-1">
            <PiDotsThree size={16} className="text-n400 dark:text-n500" />
          </div>
        ) : null}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.title === nextProps.chat.title &&
    prevProps.isActive === nextProps.isActive
  );
});

export default ChatHistoryItem;
