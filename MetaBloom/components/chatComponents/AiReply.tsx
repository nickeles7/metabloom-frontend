import React, { useState } from "react";
import Image from "next/image";
import logo from "@/public/images/MetaBloom logo.png"; // Using the MetaBloom logo for MetaForge
import {
  PiArrowsCounterClockwise,
  PiCopy,
  PiShareFat,
  PiThumbsDown,
  PiThumbsUp,
  PiCheck,
} from "react-icons/pi";
import "@/styles/typing-indicator.css";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import DeckCode from "./DeckCode";
import { useStreaming } from "@/contexts/StreamingContext";
import { isValidDeckCode } from "@/lib/deckcode/decoder";
import SimpleCardMarkdown from "@/components/hearthstone/SimpleCardMarkdown";

type AiReplyProps = {
  replyText: string;
  replyTime?: string;
  isStreaming?: boolean;
  messageId?: string;
};

function AiReply({ replyText, replyTime = "just now", isStreaming = false, messageId }: AiReplyProps) {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const { streamingContent, isMessageStreaming } = useStreaming();

  // MISSING COMPONENT D: Frontend Error Detection and Recovery
  const detectAndFilterTechnicalErrors = (text: string): string => {
    if (!text) return text;

    // Technical error patterns that should never reach users
    const technicalErrorPatterns = [
      /❌\s*\*\*\w+\s*Error:\*\*[^\n]*/g,     // Function error format (capture full line)
      /Function execution failed:[^\n]*/g,    // Generic function error (capture full line)
      /Unknown function:[^\n]*/g,             // Router error (capture full line)
      /AST compilation failed:[^\n]*/g,       // Query compilation error (capture full line)
      /Database connection[^\n]*/g,           // Database errors (capture full line)
      /Lambda API[^\n]*/g,                    // API errors (capture full line)
      /Circuit breaker[^\n]*/g,               // Network errors (capture full line)
      /JSON parsing[^\n]*/g,                  // Parsing errors (capture full line)
      /Function argument parsing failed:[^\n]*/g  // Argument errors (capture full line)
    ];

    let filteredText = text;
    let hasFilteredContent = false;

    // Check for and filter technical error patterns
    for (const pattern of technicalErrorPatterns) {
      const matches = filteredText.match(pattern);
      if (matches) {
        hasFilteredContent = true;
        filteredText = filteredText.replace(pattern, '');
        console.log(`🛡️ Frontend filtered technical error: ${matches[0].substring(0, 50)}...`);
      }
    }

    // If we filtered out technical errors, provide a user-friendly fallback
    if (hasFilteredContent) {
      const remainingText = filteredText.trim();

      if (remainingText.length === 0) {
        // All content was technical errors - provide helpful fallback
        return "I'm having some technical difficulties right now. Let me try to help you in a different way. Could you rephrase your request?";
      } else {
        // Some content remains - clean it up and remove extra whitespace
        return remainingText.replace(/\s+/g, ' ').trim();
      }
    }

    return filteredText;
  };

  // Get the real-time streaming content if available
  const rawText = messageId && isMessageStreaming(messageId)
    ? streamingContent[messageId]
    : replyText;

  // Check if we're in loading state (two-stage processing)
  const isLoadingState = rawText === '___LOADING___';

  // Apply technical error filtering first
  const errorFilteredText = detectAndFilterTechnicalErrors(rawText);

  // Clean up excessive whitespace while preserving intentional formatting
  const displayText = errorFilteredText
    ? errorFilteredText
        // Replace 3+ consecutive newlines with just 2 newlines (one blank line)
        .replace(/\n{3,}/g, '\n\n')
        // Replace excessive spaces (4+ spaces) with single space
        .replace(/ {4,}/g, ' ')
        // Trim excessive whitespace at start and end
        .trim()
    : errorFilteredText;

  // Debug loading state (after displayText is defined)
  if (messageId && (isLoadingState || isStreaming)) {
    console.log('🔍 AiReply render state:', {
      messageId,
      isLoadingState,
      isStreaming,
      rawText: rawText?.substring(0, 50) + '...',
      hasDisplayText: !!displayText
    });
  }

  // Don't render anything if there's no text and we're not streaming
  if (!displayText && !isStreaming) {
    return null;
  }

  // Function to copy text to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Function to copy code to clipboard
  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div className="ai-message-wrapper">
      <div className="flex justify-start items-start gap-3 sm:gap-4 w-full">
        <Image src={logo} alt="HearthForge Logo" width={32} height={32} className="max-sm:size-5 object-cover flex-shrink-0" />
        <div className="ai-message-content">
          <p className="text-xs text-n100 mb-3">HearthForge, {replyTime}</p>
          <div className="text-sm w-full markdown-content text-n700 dark:text-n30 leading-relaxed">
          {(isStreaming && !displayText) || isLoadingState ? (
            // Show typing indicator when streaming starts and no text yet, OR during two-stage processing
            <div className="flex items-center">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          ) : (
            // Display the actual AI response with markdown formatting and card hover support
            <SimpleCardMarkdown
              content={displayText}
            />
          )}
          </div>
          <div className="flex justify-start items-center gap-2 mt-2">
            <button
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400"
              title="Copy response"
              onClick={copyToClipboard}
            >
              {copied ? <PiCheck /> : <PiCopy />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiReply;
