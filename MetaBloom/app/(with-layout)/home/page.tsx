"use client";
import React from "react";
import grassLogo from "@/public/images/Metabloom grass logo.png";
import Image from "next/image";
import { chatOptions } from "@/constants/data";
import ChatBox from "@/components/ChatBox";
import { useChatHandler } from "@/stores/chatList";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import DeckSavePrompt from "@/components/modals/DeckSavePrompt";
import { useDeckSavePrompt } from "@/stores/deckSavePrompt";
import { useAuth } from "@/stores/auth";

// Popular prompt suggestions for logged-out users
const popularPrompts = [
  "Build the highest win-rate Shaman deck for climbing to Legend (Wild).",
  "Can you refine this deck to make it stronger?",
  "Create a fun early-game deck.",
  "Can you build a Wild deck with really strong card synergies?"
];

export default function HomePage() {
  const router = useRouter();
  const { handleSubmit, setUserQuery } = useChatHandler();
  const { isOpen, deckCodes, hidePrompt } = useDeckSavePrompt();
  const { isAuthenticated } = useAuth();
  // Flag to control visibility of prompt bubbles - set to false to hide them
  const showPromptBubbles = false;

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
      {!isAuthenticated ? (
        // Logged-out view: Centered layout with logo and popular prompts
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
      ) : (
        // Logged-in view: Same beautiful design as logged-out
        <div className="chat-container">
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
      )}

      {/* Prompt bubbles - hidden but code preserved for future use */}
      {showPromptBubbles && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 flex flex-wrap justify-center items-center px-4 gap-2 lg:gap-3 max-w-4xl">
          {chatOptions.map(({ id, name, icon, color, label }) => (
            <button
              key={id}
              className="flex justify-center items-center gap-1 lg:gap-2 py-1 sm:py-2 px-2 sm:px-3 lg:px-4 3xl:py-3 3xl:px-6 rounded-full border"
              style={{
                backgroundColor: `rgba(${color},.05)`,
                borderColor: `rgba(${color},.30)`,
              }}
              onClick={() => handleClick(label)}
            >
              {React.createElement(icon, {
                className: "text-sm sm:text-base lg:text-xl",
                style: {
                  color: `rgba(${color},1)`,
                },
              })}
              <span className="text-[10px] sm:text-xs lg:text-sm font-medium">
                {name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Deck Save Prompt */}
      {isOpen && (
        <DeckSavePrompt
          deckCodes={deckCodes}
          onClose={hidePrompt}
          onSave={(deckCode, success) => {
            if (success) {
              console.log(`Deck saved successfully: ${deckCode}`);
            }
          }}
        />
      )}
    </>
  );
}
