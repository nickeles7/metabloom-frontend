import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "firebase/auth";

type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      setUser: (user: User | null) => set({
        isAuthenticated: !!user,
        user
      }),
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: "auth-storage", // name of the item in the storage
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        // Don't store the full user object in localStorage for security reasons
        // The Firebase auth state listener will restore the user object on page load
      }),
    }
  )
);
