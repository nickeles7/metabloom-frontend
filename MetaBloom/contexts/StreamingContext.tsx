"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface StreamingContextType {
  streamingContent: Record<string, string>; // messageId -> content
  setStreamingContent: (messageId: string, content: string) => void;
  clearStreamingContent: (messageId: string) => void;
  isMessageStreaming: (messageId: string) => boolean;
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined);

export function StreamingProvider({ children }: { children: ReactNode }) {
  const [streamingContent, setStreamingContentState] = useState<Record<string, string>>({});

  const setStreamingContent = (messageId: string, content: string) => {
    setStreamingContentState(prev => ({
      ...prev,
      [messageId]: content
    }));
  };

  const clearStreamingContent = (messageId: string) => {
    setStreamingContentState(prev => {
      const newState = { ...prev };
      delete newState[messageId];
      return newState;
    });
  };

  const isMessageStreaming = (messageId: string) => {
    return messageId in streamingContent;
  };

  return (
    <StreamingContext.Provider value={{
      streamingContent,
      setStreamingContent,
      clearStreamingContent,
      isMessageStreaming
    }}>
      {children}
    </StreamingContext.Provider>
  );
}

export function useStreaming() {
  const context = useContext(StreamingContext);
  if (context === undefined) {
    throw new Error('useStreaming must be used within a StreamingProvider');
  }
  return context;
}
