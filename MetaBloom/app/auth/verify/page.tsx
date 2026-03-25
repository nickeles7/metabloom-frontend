"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import logo from '@/public/images/MetaBloom logo.png';
import GradientBackground from '@/components/ui/GradientBackground';
import Footer from '@/components/Footer';

export default function EmailVerify() {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const { forceAuthStateRefresh } = useAuth();

  useEffect(() => {
    const handleEmailLinkVerification = async () => {
      try {
        const url = window.location.href;
        console.log('🔗 Checking if this is an email link:', url);

        // Check if this is a sign-in with email link
        if (isSignInWithEmailLink(auth, url)) {
          console.log('✅ This is a valid email link');
          
          // Get the email from localStorage
          let email = localStorage.getItem('pendingVerificationEmail');
          
          if (!email) {
            // If no email in localStorage, prompt user
            email = window.prompt('Please provide your email for confirmation');
          }

          if (email) {
            console.log('🔄 Signing in with email link...');
            
            // Sign in with the email link
            const result = await signInWithEmailLink(auth, email, url);
            console.log('✅ Email link sign-in successful');

            // Clean up stored credentials
            localStorage.removeItem('pendingVerificationEmail');
            localStorage.removeItem('pendingVerificationPassword');

            // Force auth state refresh
            await forceAuthStateRefresh();

            setIsSuccess(true);
            setSuccessMessage('Email verified and signed in successfully!');

            // Redirect after a short delay
            setTimeout(() => {
              router.push('/');
            }, 2000);
          } else {
            setIsError(true);
            setErrorMessage('Email address is required for verification.');
          }
        } else {
          console.log('❌ This is not a valid email link');
          setIsError(true);
          setErrorMessage('Invalid verification link. Please try again.');
        }
      } catch (error: any) {
        console.error('❌ Email link verification error:', error);
        setIsError(true);
        
        if (error.code === 'auth/invalid-action-code') {
          setErrorMessage('This verification link is invalid or has already been used.');
        } else if (error.code === 'auth/expired-action-code') {
          setErrorMessage('This verification link has expired. Please request a new one.');
        } else {
          setErrorMessage(`Failed to verify email: ${error.message || 'Unknown error'}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    handleEmailLinkVerification();
  }, [router, forceAuthStateRefresh]);

  return (
    <div className="flex justify-center text-n500 dark:text-n30 h-dvh relative">
      <GradientBackground />
      <div className="py-6 flex-1 flex flex-col justify-between items-center max-w-[600px] px-4">
        <div className="flex justify-start items-center gap-1.5 self-start">
          <Image src={logo} alt="MetaBloom Logo" width={32} height={32} />
          <span className="text-2xl font-semibold text-n700 dark:text-n30">
            MetaBloom
          </span>
        </div>

        <div className="w-full pt-4 flex flex-col items-center">
          <div className="w-full max-w-md text-center">
            {isLoading && (
              <div>
                <div className="text-blue-600 dark:text-blue-400 text-4xl mb-4">⏳</div>
                <h1 className="text-2xl font-semibold mb-4">Verifying Your Email</h1>
                <p className="text-sm text-n500 dark:text-n400">
                  Please wait while we verify your email address...
                </p>
              </div>
            )}

            {isSuccess && (
              <div>
                <div className="text-green-600 dark:text-green-400 text-4xl mb-4">✅</div>
                <h1 className="text-2xl font-semibold text-green-800 dark:text-green-200 mb-4">
                  Email Verified Successfully!
                </h1>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
                  <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                    {successMessage}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Redirecting you to MetaBloom in a moment...
                  </p>
                </div>
                <button
                  onClick={() => router.push('/')}
                  className="text-sm font-medium text-white bg-primaryColor text-center py-3 px-6 rounded-full block w-full"
                >
                  Continue to MetaBloom
                </button>
              </div>
            )}

            {isError && (
              <div>
                <div className="text-red-600 dark:text-red-400 text-4xl mb-4">❌</div>
                <h1 className="text-2xl font-semibold text-red-800 dark:text-red-200 mb-4">
                  Verification Failed
                </h1>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    {errorMessage}
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/verify-email')}
                    className="text-sm font-medium text-white bg-primaryColor text-center py-3 px-6 rounded-full block w-full"
                  >
                    Request New Verification Email
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="text-sm font-medium text-n600 dark:text-n400 border border-n300 dark:border-n600 text-center py-3 px-6 rounded-full block w-full hover:bg-n50 dark:hover:bg-n700 transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
