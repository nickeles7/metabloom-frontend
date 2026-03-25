"use client";
import React, { useEffect } from "react";
import grassLogo from "@/public/images/Metabloom grass logo.png";
import Image from "next/image";
import { chatOptions } from "@/constants/data";
import ChatBox from "@/components/ChatBox";
import { useChatHandler } from "@/stores/chatList";
import { v4 as uuidv4 } from "uuid";
import { useRouter, useSearchParams } from "next/navigation";
import DeckSavePrompt from "@/components/modals/DeckSavePrompt";
import { useDeckSavePrompt } from "@/stores/deckSavePrompt";
import { useTokenUsage } from "@/stores/tokenUsage";
import { useAuth } from "@/stores/auth";

// Popular prompt suggestions
const popularPrompts = [
  "Build the highest win-rate Shaman deck for climbing to Legend (Wild).",
  "Can you refine this deck to make it stronger?",
  "Create a fun early-game deck.",
  "Can you build a Wild deck with really strong card synergies?"
];


function NewChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleSubmit, updateChatList, setUserQuery } = useChatHandler();
  const { isOpen, deckCodes, hidePrompt } = useDeckSavePrompt();
  const { forceSync } = useTokenUsage();
  const { user, isAuthenticated } = useAuth();

  // Flag to control visibility of prompt bubbles - set to false to hide them
  const showPromptBubbles = false;

  // Load chat history from localStorage when component mounts
  useEffect(() => {
    updateChatList();
  }, [updateChatList]);

  // Handle token purchase success
  useEffect(() => {
    const tokenPurchase = searchParams.get('token_purchase');

    if (tokenPurchase === 'success' && isAuthenticated && user?.uid) {
      console.log('🎉 Token purchase successful! Syncing token data...');

      // Force sync token data after successful purchase
      setTimeout(async () => {
        await forceSync(user.uid);
        console.log('✅ Token data synced after successful purchase');

        // Clear the URL parameter to prevent repeated syncing
        const url = new URL(window.location.href);
        url.searchParams.delete('token_purchase');
        window.history.replaceState({}, '', url.toString());
      }, 1000); // Small delay to ensure webhook has processed
    } else if (tokenPurchase === 'cancelled') {
      console.log('❌ Token purchase was cancelled');

      // Clear the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('token_purchase');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, isAuthenticated, user?.uid, forceSync]);

  const handleClick = (label: string) => {
    const chatId = uuidv4();
    let currentChatId = "";
    currentChatId = chatId;
    router.push(`/chat/${currentChatId}`);

    handleSubmit(label, currentChatId);
  };

  const handlePromptClick = (prompt: string) => {
    // Auto-fill the input field with the selected prompt
    setUserQuery(prompt);
  };

  return (
    <>
      <div className="chat-container">
        {/* Messages Area */}
        <div className="chat-messages-area">
          <div className="chat-scroll-wrapper">
            <div className="chat-scroll-content">
              <div className="chat-left-spacer"></div>

              <div className="chat-content-wrapper">
                <div className="chat-messages-container">
                  <div className="chat-messages-list">
                    <div className="flex flex-col justify-center items-center text-center py-6">
                      {/* Logo and Title */}
                      <div className="flex flex-col justify-center items-center text-center mb-4">
                        {/* MetaBloom Grass Logo */}
                        <div className="mb-2">
                          <Image
                            src={grassLogo}
                            alt="MetaBloom Logo"
                            width={100}
                            height={100}
                            className="mx-auto"
                          />
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-n700 dark:text-n30 mb-2">
                          What kind of deck do you want to build?
                        </h1>
                        <p className="text-xs text-n700 dark:text-n200 max-w-md">
                          Shape the meta. Master your strategy.
                        </p>
                      </div>

                      {/* Popular Prompts */}
                      <div className="w-full max-w-2xl mb-4">
                        <h3 className="text-xs font-medium text-n600 dark:text-n200 mb-2 text-center">
                          
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                          {popularPrompts.map((prompt, index) => (
                            <button
                              key={index}
                              onClick={() => handlePromptClick(prompt)}
                              className="px-3 py-2 bg-primaryColor/10 hover:bg-primaryColor/20 border border-primaryColor/30 hover:border-primaryColor/50 rounded-lg text-xs font-medium text-gray-700 dark:text-white transition-all duration-200 hover:scale-105 text-left"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
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

export default NewChat;
