import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserPreferences {
  // Phase 2: Reasoning transparency preferences
  showReasoningTransparency: boolean;
  reasoningDetailLevel: 'minimal' | 'standard' | 'detailed';
  
  // Future preferences can be added here
  preferredCardFormat?: 'compact' | 'detailed';
  autoExpandDeckCodes?: boolean;
  defaultSearchLimit?: number;
}

interface UserPreferencesState {
  preferences: UserPreferences;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  resetPreferences: () => void;
  toggleReasoningTransparency: () => void;
}

const defaultPreferences: UserPreferences = {
  showReasoningTransparency: false, // Default to off for clean UX
  reasoningDetailLevel: 'standard',
  preferredCardFormat: 'detailed',
  autoExpandDeckCodes: true,
  defaultSearchLimit: 20,
};

export const useUserPreferences = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      
      setPreference: (key, value) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        }));
      },
      
      resetPreferences: () => {
        set({ preferences: defaultPreferences });
      },
      
      toggleReasoningTransparency: () => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            showReasoningTransparency: !state.preferences.showReasoningTransparency,
          },
        }));
      },
    }),
    {
      name: "user-preferences-storage",
      version: 1,
    }
  )
);
