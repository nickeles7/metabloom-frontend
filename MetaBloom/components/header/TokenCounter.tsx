"use client";
import React, { useEffect } from "react";
import { PiStar, PiArrowClockwise } from "react-icons/pi";
import { useTokenUsage } from "@/stores/tokenUsage";
import { useAuth } from "@/stores/auth";

function TokenCounter() {
  const { tokensUsed, tokenLimit, syncWithFirebase, lastSyncedUserId, resetTokens, limitExceeded } = useTokenUsage();
  const { user, isAuthenticated } = useAuth();

  // Sync with Firebase when user logs in or changes
  useEffect(() => {
    if (isAuthenticated && user?.uid && user.uid !== lastSyncedUserId) {
      syncWithFirebase(user.uid);
    }
  }, [isAuthenticated, user?.uid, lastSyncedUserId, syncWithFirebase]);

  const handleReset = () => {
    resetTokens();
  };

  return (
    <div className="flex items-center gap-2">
      {/* Token counter hidden - empty space maintained */}
    </div>
  );
}

export default TokenCounter;
