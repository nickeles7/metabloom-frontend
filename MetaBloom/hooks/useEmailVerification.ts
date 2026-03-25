"use client";

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface EmailVerificationState {
  showPrompt: boolean;
  message: string;
}

export function useEmailVerification() {
  const [verificationState, setVerificationState] = useState<EmailVerificationState>({
    showPrompt: false,
    message: ''
  });
  const { currentUser } = useAuth();

  const checkEmailVerificationError = useCallback((error: any) => {
    if (error?.code === 'EMAIL_NOT_VERIFIED' || 
        error?.message?.includes('Email verification required')) {
      setVerificationState({
        showPrompt: true,
        message: error.message || 'Please verify your email address to continue using MetaBloom.'
      });
      return true;
    }
    return false;
  }, []);

  const hidePrompt = useCallback(() => {
    setVerificationState({
      showPrompt: false,
      message: ''
    });
  }, []);

  const isEmailVerified = currentUser?.emailVerified || false;

  return {
    showVerificationPrompt: verificationState.showPrompt,
    verificationMessage: verificationState.message,
    isEmailVerified,
    checkEmailVerificationError,
    hideVerificationPrompt: hidePrompt
  };
}
