import { useChatHandler } from "@/stores/chatList";
import { usePathname, useRouter } from "next/navigation";
import React, { FormEvent, useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  PiArrowUp,
  PiLightbulb,
  PiMagnifyingGlass,
  PiMicrophone,
  PiSquare,
} from "react-icons/pi";
import { useAuth } from "@/stores/auth";
import { useMainModal } from "@/stores/modal";
import { useTokenUsage } from "@/stores/tokenUsage";
import { useStreaming } from "@/contexts/StreamingContext";
import { useDeckSavePrompt } from "@/stores/deckSavePrompt";

function ChatBox() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const streamedResponseRef = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any | null>(null);

  const router = useRouter();
  const path = usePathname();
  const {
    userQuery,
    setUserQuery,
    addStreamingMessage,
    updateStreamingMessageThrottled,
    finalizeStreamingMessage,
    addErrorMessage,
    chatList
  } = useChatHandler();
  const { isAuthenticated, user } = useAuth();
  const { modalOpen } = useMainModal();
  const { incrementTokens, checkLimitExceeded, updateConversationMetrics, forceSync } = useTokenUsage();
  const { setStreamingContent, clearStreamingContent } = useStreaming();
  const { checkAndShowPrompt } = useDeckSavePrompt();

  // Flag to control visibility of search and brainstorm bubbles - set to false to hide them
  const showSearchBrainstormBubbles = false;

  const chatIdUrl = path.split("/chat/")[1];

  // Function to stop streaming
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();

      // If we have a partial response, finalize it
      if (streamedResponseRef.current && streamedResponseRef.current.trim().length > 0) {
        // Get the current chat ID
        const currentChatId = chatIdUrl || "";

        // Find the most recent AI message ID
        const chat = chatList.find(chat => chat.id === currentChatId);
        if (chat) {
          const aiMessages = chat.messages.filter(msg => !msg.isUser && msg.isStreaming);
          if (aiMessages.length > 0) {
            const lastAiMessage = aiMessages[aiMessages.length - 1];
            if (lastAiMessage.id) {
              // Finalize the message with what we have so far
              finalizeStreamingMessage(currentChatId, lastAiMessage.id, streamedResponseRef.current + "\n\n[Generation stopped by user]");
            }
          }
        }
      }
    }

    setIsStreaming(false);
    if (currentStreamingMessageId) {
      clearStreamingContent(currentStreamingMessageId);
    }
    setCurrentStreamingMessageId(null);
    abortControllerRef.current = null;
  };

  // Voice recording functionality
  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserQuery(transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  // Track if we're in the middle of navigation
  const isNavigatingRef = useRef(false);

  // Function to auto-resize the textarea
  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to the scrollHeight
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  // Auto-resize textarea when input changes
  useEffect(() => {
    autoResizeTextarea();
  }, [userQuery]);

  // Cleanup voice recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);



  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!userQuery.trim()) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      modalOpen("Authentication", { mode: "signin" });
      return;
    }

    // Check token limit before proceeding (sync with latest data)
    const limitExceeded = await checkLimitExceeded(user?.uid);
    if (limitExceeded) {
      modalOpen("Token Limit Exceeded");
      return;
    }

    // Cancel any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const messageText = userQuery.trim();
    const currentChatId = chatIdUrl || uuidv4();

    // Add user message to state FIRST
    const userMessage = {
      id: uuidv4(),
      text: messageText,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    // Add user message to store immediately
    addStreamingMessage(currentChatId, userMessage);

    // Clear the input and set streaming state
    setUserQuery("");
    setIsStreaming(true);
    streamedResponseRef.current = "";

    // If we're on new-chat or home page, navigate to the chat page
    if (path === "/new-chat" || path === "/home") {
      isNavigatingRef.current = true;
      router.push(`/chat/${currentChatId}`);
    }

    try {
      abortControllerRef.current = new AbortController();

      // Get chat history for context
      const existingChat = chatList.find(chat => chat.id === currentChatId);

      // If this is a brand new chat with no history, add a system note to help the AI
      // understand this is a new conversation
      let chatHistory: Array<{
        isUser: boolean;
        text: string;
        timestamp: string;
      }> = [];

      if (existingChat && existingChat.messages.length > 0) {
        // Get last 10 messages for context in existing chats
        chatHistory = existingChat.messages.map(msg => ({
          isUser: msg.isUser,
          text: typeof msg.text === 'string' ? msg.text : '',
          timestamp: msg.timestamp
        })).slice(-10);
      }

      // Call your API with streaming
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          chatHistory: chatHistory,
          chatId: currentChatId
        }),
        signal: abortControllerRef.current.signal
      });

      // Only add the AI message placeholder after we've confirmed the API call is working
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Create AI message placeholder
      const aiMessageId = uuidv4();
      const aiMessage = {
        id: aiMessageId,
        text: "",
        isUser: false,
        timestamp: new Date().toISOString(),
        isStreaming: true
      };

      // Add streaming message to store
      addStreamingMessage(currentChatId, aiMessage);
      setCurrentStreamingMessageId(aiMessageId);

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);

              if (data === '[DONE]') {
                // Stream is complete
                break;
              }

              try {
                const parsedData = JSON.parse(data);
                const { content, tokensUsed, isLoading, loadingType } = parsedData;

                // Handle loading state (3-dot animation during two-stage processing)
                if (isLoading !== undefined) {
                  console.log('🔍 Loading state detected:', { isLoading, loadingType, aiMessageId });
                  if (isLoading && loadingType === 'thinking') {
                    // Show loading bubbles - set special loading content
                    console.log('💭 Setting loading bubbles for message:', aiMessageId);
                    setStreamingContent(aiMessageId, '___LOADING___');
                    updateStreamingMessageThrottled(currentChatId, aiMessageId, '___LOADING___');
                  } else if (!isLoading) {
                    // Stop loading bubbles - clear loading content
                    console.log('✅ Stopping loading bubbles for message:', aiMessageId);
                    setStreamingContent(aiMessageId, '');
                    updateStreamingMessageThrottled(currentChatId, aiMessageId, '');
                    // Reset streamed response for actual content
                    streamedResponseRef.current = '';
                  }
                }

                // Update the streamed response by appending new content
                if (content) {
                  streamedResponseRef.current += content;
                  // Update streaming context immediately for real-time display
                  setStreamingContent(aiMessageId, streamedResponseRef.current);
                  // Use batched update to reduce frequency of state changes during streaming
                  updateStreamingMessageThrottled(currentChatId, aiMessageId, streamedResponseRef.current);
                }

                // If we received token usage information, update the token counter
                if (tokensUsed) {
                  await incrementTokens(tokensUsed, user?.uid);
                }
              } catch (parseError) {
                console.error('Error parsing streaming data:', parseError);
              }
            }
          }
        }
      }

      // Get the final response from ref and finalize the message
      const finalResponse = streamedResponseRef.current;
      if (finalResponse && finalResponse.trim().length > 0) {
        finalizeStreamingMessage(currentChatId, aiMessageId, finalResponse);

        // Check for deck codes in the final response and show save prompt if found
        if (isAuthenticated) {
          checkAndShowPrompt(finalResponse, currentChatId, aiMessageId);
        }
      } else {
        // If somehow we don't have a response, add a fallback message
        finalizeStreamingMessage(currentChatId, aiMessageId, "I'm sorry, I couldn't generate a proper response. Please try again.");
      }

      // Trigger final scroll to ensure message is visible
      setTimeout(() => {
        const scrollWrapper = document.querySelector('.chat-scroll-wrapper') as HTMLElement;
        if (scrollWrapper) {
          scrollWrapper.scrollTop = scrollWrapper.scrollHeight;
        }
      }, 100);

      // Clear streaming content from context
      clearStreamingContent(aiMessageId);

      // Update token usage (estimate based on text length)
      const estimatedTokens = Math.ceil((messageText.length + finalResponse.length) / 4);
      await incrementTokens(estimatedTokens, user?.uid);

      // Update conversation metrics
      updateConversationMetrics(1, estimatedTokens);

    } catch (error: any) {
      console.error("Chat error:", error);
      
      if (error.name !== 'AbortError') {
        // Add error message to chat
        const errorMessage = {
          id: uuidv4(),
          text: "Sorry, I encountered an error. Please try again.",
          isUser: false,
          timestamp: new Date().toISOString(),
        };
        
        addErrorMessage(currentChatId, errorMessage);
      }
    } finally {
      setIsStreaming(false);
      if (currentStreamingMessageId) {
        clearStreamingContent(currentStreamingMessageId);
      }
      setCurrentStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative w-full">
          <textarea
            ref={textareaRef}
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder={isAuthenticated ? "Ask me anything about Hearthstone..." : "Ask me anything about Hearthstone..."}
            className="w-full min-h-[60px] max-h-[200px] p-4 pr-16 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            disabled={isStreaming}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (userQuery.trim().length > 0 && !isStreaming) {
                  handleSubmit(e);
                }
              }
            }}
          />
          
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={stopStreaming}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                title="Stop generating"
              >
                <PiSquare size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isStreaming || !userQuery.trim()}
                className={`p-2 rounded-lg transition-colors ${
                  userQuery.trim()
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300'
                }`}
                title={isAuthenticated ? "Send message" : "Sign in to send message"}
              >
                <PiArrowUp size={16} />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Search and brainstorm bubbles - currently hidden */}
      {showSearchBrainstormBubbles && (
        <div className="flex gap-2 mt-3">
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <PiMagnifyingGlass size={14} />
            Search
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <PiLightbulb size={14} />
            Brainstorm
          </button>
        </div>
      )}
    </div>
  );
}

export default ChatBox;
