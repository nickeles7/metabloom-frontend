import { create } from "zustand";
import { detectDeckCode } from "@/lib/deckcode/decoder";

interface DeckSavePromptState {
  isOpen: boolean;
  deckCodes: string[];
  chatId: string | null;
  messageId: string | null;
  showPrompt: (deckCodes: string[], chatId: string, messageId: string) => void;
  hidePrompt: () => void;
  checkAndShowPrompt: (text: string, chatId: string, messageId: string) => boolean;
}

export const useDeckSavePrompt = create<DeckSavePromptState>((set, get) => ({
  isOpen: false,
  deckCodes: [],
  chatId: null,
  messageId: null,

  showPrompt: (deckCodes, chatId, messageId) => {
    set({
      isOpen: true,
      deckCodes,
      chatId,
      messageId,
    });
  },

  hidePrompt: () => {
    set({
      isOpen: false,
      deckCodes: [],
      chatId: null,
      messageId: null,
    });
  },

  checkAndShowPrompt: (text, chatId, messageId) => {
    // Extract deck codes from the text using the new system
    const foundDeckCodes: string[] = [];
    
    // Split text by common delimiters and check each part
    const parts = text.split(/[\s\n\r,;]+/);
    
    for (const part of parts) {
      const trimmed = part.trim();
      
      // Use the new deck code detection system
      const detectedCode = detectDeckCode(trimmed);
      if (detectedCode) {
        foundDeckCodes.push(detectedCode);
      }
    }
    
    if (foundDeckCodes.length > 0) {
      // Remove duplicates
      const uniqueDeckCodes = [...new Set(foundDeckCodes)];
      
      // Show the prompt with the found deck codes
      get().showPrompt(uniqueDeckCodes, chatId, messageId);
      return true;
    }
    
    return false;
  },
}));
