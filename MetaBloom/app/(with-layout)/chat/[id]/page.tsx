"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import MyReply from "@/components/chatComponents/MyReply";
import ChatBox from "@/components/ChatBox";
import { usePathname } from "next/navigation";
import AiReply from "@/components/chatComponents/AiReply";
import { Chat, useChatHandler } from "@/stores/chatList";
import DeckSavePrompt from "@/components/modals/DeckSavePrompt";
import { useDeckSavePrompt } from "@/stores/deckSavePrompt";
import { useStreaming } from "@/contexts/StreamingContext";


function CustomChat() {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { chatList, updateChatList } = useChatHandler();
  const { isOpen, deckCodes, hidePrompt } = useDeckSavePrompt();
  const path = usePathname();
  const [currentChat, setCurrentChat] = useState<Chat>();
  const lastMessageCountRef = useRef(0);
  const lastContentHashRef = useRef("");

  // Throttled scroll function to prevent excessive scrolling
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      });
    }
  }, []);

  // Extract chat ID from URL
  const chatId = path.split("/chat/")[1];

  // Load chat history from localStorage when component mounts
  useEffect(() => {
    updateChatList();
  }, [updateChatList]);

  // Find and set current chat when chatList or chatId changes
  useEffect(() => {
    if (chatList && chatId) {
      const foundChat = chatList.find((chat) => chat.id === chatId);
      if (foundChat) {
        // Check if we need to update the current chat
        // Only update if it's a different chat or if there are new messages
        const messageCountChanged = !currentChat || currentChat.messages.length !== foundChat.messages.length;
        const streamingStatusChanged = currentChat?.messages.some((msg, idx) => 
          foundChat.messages[idx] && msg.isStreaming !== foundChat.messages[idx].isStreaming
        );

        if (messageCountChanged || streamingStatusChanged || !currentChat) {
          setCurrentChat(foundChat);
          
          // Trigger scroll when messages change
          if (messageCountChanged) {
            scrollToBottom();
          }
        }
      } else {
        // Chat not found, create empty chat structure
        setCurrentChat({
          id: chatId,
          title: "New Chat",
          messages: []
        });
      }
    }
  }, [chatList, chatId, currentChat?.messages?.length]);

  // Enhanced scroll monitoring - tracks message count and content changes
  useEffect(() => {
    if (!currentChat) return;

    const messageCount = currentChat.messages.length;
    const contentHash = currentChat.messages.map(m => {
      const textContent = typeof m.text === 'string' ? m.text : JSON.stringify(m.text);
      return `${m.id}-${textContent?.slice(0, 50)}`;
    }).join('|');

    // Check if message count changed (new message added)
    const messageCountChanged = messageCount !== lastMessageCountRef.current;

    // Check if content changed (streaming updates)
    const contentChanged = contentHash !== lastContentHashRef.current;

    if (messageCountChanged || contentChanged) {
      scrollToBottom();
      lastMessageCountRef.current = messageCount;
      lastContentHashRef.current = contentHash;
    }
  }, [currentChat, scrollToBottom]);

  // Real-time streaming content monitoring
  const { streamingContent } = useStreaming();
  useEffect(() => {
    if (Object.keys(streamingContent).length > 0) {
      scrollToBottom();
    }
  }, [streamingContent, scrollToBottom]);

  // Initial scroll to bottom when chat loads
  useEffect(() => {
    if (currentChat && currentChat.messages.length > 0) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [currentChat?.id, scrollToBottom]);

  // Loading state
  if (!currentChat) {
    return (
      <div className="chat-container">
        <div className="chat-messages-area">
          <div className="chat-left-spacer"></div>
          <div className="chat-content-wrapper">
            <div className="chat-loading">
              Loading chat...
            </div>
          </div>
          <div className="chat-right-spacer"></div>
        </div>
        <div className="chat-input-area">
          <div className="chat-input-content">
            <div className="chat-left-spacer"></div>
            <div className="chat-input-wrapper">
              <ChatBox />
            </div>
            <div className="chat-right-spacer"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="chat-container">
        {/* Messages Area */}
        <div className="chat-messages-area">
          <div className="chat-scroll-wrapper" ref={chatContainerRef}>
            <div className="chat-scroll-content">
              <div className="chat-left-spacer"></div>

              <div className="chat-content-wrapper">
                <div className="chat-messages-container">
                  <div className="chat-messages-list">
                    {currentChat.messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-6">
                        <div className="text-gray-500 dark:text-gray-400 mb-2">
                          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="text-base font-medium mb-1">Start a conversation</p>
                          <p className="text-xs">Ask me anything about Hearthstone deck building, strategies, or card interactions.</p>
                        </div>
                      </div>
                    ) : (
                      currentChat.messages.map((item, idx) => (
                        <div className="chat-message" key={item.id || idx}>
                          {item.isUser && typeof item.text === "string" && (
                            <MyReply replyText={item.text} replyTime="3 min ago" />
                          )}

                          {!item.isUser && typeof item.text === "string" && (
                            <AiReply
                              replyText={item.text}
                              replyTime="just now"
                              isStreaming={item.isStreaming}
                              messageId={item.id}
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="chat-right-spacer"></div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div className="chat-input-content">
            <div className="chat-left-spacer"></div>
            <div className="chat-input-wrapper">
              <ChatBox />
            </div>
            <div className="chat-right-spacer"></div>
          </div>
        </div>
      </div>

      {/* Deck Save Prompt Modal */}
      {isOpen && (
        <DeckSavePrompt
          deckCodes={deckCodes}
          onClose={hidePrompt}
        />
      )}
    </>
  );
}

export default CustomChat;
