"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface EmailVerificationPromptProps {
  message?: string;
  onClose?: () => void;
}

export default function EmailVerificationPrompt({ 
  message = "Please verify your email address to continue using MetaBloom.", 
  onClose 
}: EmailVerificationPromptProps) {
  const router = useRouter();
  const { currentUser } = useAuth();

  const handleVerifyEmail = () => {
    if (onClose) onClose();
    router.push('/verify-email');
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-n800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="text-yellow-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-n700 dark:text-n30 mb-2">
            Email Verification Required
          </h3>
          <p className="text-sm text-n500 dark:text-n400 mb-6">
            {message}
          </p>
          
          {currentUser && (
            <p className="text-xs text-n400 dark:text-n500 mb-6">
              Verification email will be sent to: <strong>{currentUser.email}</strong>
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 text-sm font-medium text-n600 dark:text-n400 border border-n300 dark:border-n600 text-center py-3 px-4 rounded-full hover:bg-n50 dark:hover:bg-n700 transition-colors"
            >
              Later
            </button>
            <button
              onClick={handleVerifyEmail}
              className="flex-1 text-sm font-medium text-white bg-primaryColor text-center py-3 px-4 rounded-full hover:bg-primaryColor/90 transition-colors"
            >
              Verify Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
