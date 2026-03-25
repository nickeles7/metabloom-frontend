"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { StripeProvider } from "@/contexts/StripeContext";
import { useEffect } from "react";
import { initializeLogging } from "@/lib/logging";
import { createClientLogger } from "@/lib/logging/client";
import { initializeCardData } from "@/lib/hearthstone/cardData";

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize logging system and card data on app startup
  useEffect(() => {
    initializeLogging();

    // Initialize Hearthstone card data in the background
    initializeCardData().catch(error => {
      console.error('Failed to initialize Hearthstone card data:', error);
    });
  }, []);

  return (
    <AuthProvider>
      <StripeProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </StripeProvider>
    </AuthProvider>
  );
}
