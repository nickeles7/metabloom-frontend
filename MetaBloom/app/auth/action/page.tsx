"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { applyActionCode, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import logo from '@/public/images/MetaBloom logo.png';
import GradientBackground from '@/components/ui/GradientBackground';
import Footer from '@/components/Footer';

export default function AuthAction() {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { forceAuthStateRefresh } = useAuth();

  useEffect(() => {
    const handleEmailVerification = async () => {
      // First check if user is already verified
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setIsSuccess(true);
          setSuccessMessage('Email already verified! Redirecting...');
          setTimeout(() => router.push('/'), 2000);
          return;
        }
      }

      // Get the action code and mode from URL parameters
      let mode = searchParams.get('mode');
      let actionCode = searchParams.get('oobCode');

      // Fallback to direct URL parsing if searchParams doesn't work
      if (!mode || !actionCode) {
        const urlParams = new URLSearchParams(window.location.search);
        mode = mode || urlParams.get('mode');
        actionCode = actionCode || urlParams.get('oobCode');
      }

      console.log('Processing email verification:', {
        mode,
        actionCode: actionCode ? 'present' : 'missing',
        fullUrl: window.location.href,
        searchString: window.location.search,
        searchParamsEntries: Object.fromEntries(searchParams.entries())
      });

      if (!mode || !actionCode) {
        console.error('Missing parameters:', { mode, actionCode });
        setIsError(true);
        setErrorMessage('Invalid verification link. Please try requesting a new verification email.');
        setIsLoading(false);
        return;
      }



      if (mode !== 'verifyEmail') {
        setIsError(true);
        setErrorMessage('This link is not for email verification.');
        setIsLoading(false);
        return;
      }

      try {
        // Apply the email verification code
        await applyActionCode(auth, actionCode);
        console.log('Email verification successful');

        // Get stored credentials for auto-login
        const storedEmail = localStorage.getItem('pendingVerificationEmail');
        const storedPassword = localStorage.getItem('pendingVerificationPassword');

        if (storedEmail && storedPassword) {
          try {
            // Auto sign-in the user
            const userCredential = await signInWithEmailAndPassword(auth, storedEmail, storedPassword);

            // Reload user to get updated verification status
            await userCredential.user.reload();

            // Clean up stored credentials
            localStorage.removeItem('pendingVerificationEmail');
            localStorage.removeItem('pendingVerificationPassword');

            setIsSuccess(true);
            setSuccessMessage('Email verified and signed in successfully! Redirecting...');

            // Redirect to home
            setTimeout(() => router.push('/'), 2000);
          } catch (signInError: any) {
            console.error('Auto sign-in failed:', signInError);

            // Clear stored credentials
            localStorage.removeItem('pendingVerificationEmail');
            localStorage.removeItem('pendingVerificationPassword');

            setIsSuccess(true);
            setSuccessMessage('Email verified successfully! Please sign in manually.');
            setTimeout(() => router.push('/'), 3000);
          }
        } else {
          // No stored credentials, just show success
          setIsSuccess(true);
          setSuccessMessage('Email verified successfully! Please sign in to continue.');
          setTimeout(() => router.push('/'), 3000);
        }
      } catch (error: any) {
        console.error('Email verification error:', error);
        setIsError(true);

        if (error.code === 'auth/invalid-action-code') {
          setErrorMessage('This verification link is invalid or has already been used.');
        } else if (error.code === 'auth/expired-action-code') {
          setErrorMessage('This verification link has expired. Please request a new one.');
        } else {
          setErrorMessage('Failed to verify email. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    handleEmailVerification();
  }, [searchParams, router]);

  return (
    <div className="flex justify-center text-n500 dark:text-n30 h-dvh relative">
      <GradientBackground />
      <div className="py-8 flex-1 flex flex-col justify-between items-center max-w-[700px] px-4">
        <div className="flex justify-start items-center gap-2 self-start">
          <div className="relative">
            <Image src={logo} alt="MetaBloom Logo" width={40} height={40} className="drop-shadow-lg" />
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-20 blur"></div>
          </div>
          <div>
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MetaBloom
            </span>
            <p className="text-xs text-n500 dark:text-n400 -mt-1">
              Forge the new Meta.
            </p>
          </div>
        </div>

        <div className="w-full pt-8 flex flex-col items-center">
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-10 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-xl"></div>

          <div className="w-full max-w-lg text-center relative z-10">
            {isLoading && (
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-3 border-white border-t-transparent rounded-full"></div>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Verifying Your Email
                  </h1>
                  <p className="text-lg text-n600 dark:text-n300 mb-4">
                    We're confirming your email address...
                  </p>
                  <p className="text-sm text-n500 dark:text-n400">
                    This will only take a moment. You'll be automatically signed in once verification is complete.
                  </p>
                </div>
              </div>
            )}

            {isSuccess && (
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Welcome to MetaBloom!
                  </h1>
                  <p className="text-lg text-n600 dark:text-n300 mb-4">
                    Your email has been verified successfully
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                        {successMessage || "You're all set! Your account is now active and you're being signed in automatically."}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Redirecting you to MetaBloom in a moment...
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/')}
                    className="text-sm font-medium text-white bg-gradient-to-r from-primaryColor to-purple-600 hover:from-primaryColor/90 hover:to-purple-600/90 text-center py-4 px-6 rounded-full block w-full transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Continue to MetaBloom →
                  </button>
                  <p className="text-xs text-white dark:text-white">
                    Ready to build amazing Hearthstone decks with AI assistance!
                  </p>
                </div>
              </div>
            )}

            {isError && (
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    Verification Issue
                  </h1>
                  <p className="text-lg text-n600 dark:text-n300 mb-4">
                    We couldn't verify your email with this link
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                        {errorMessage}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        Don't worry - this happens sometimes. You can request a new verification email below.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/verify-email')}
                    className="text-sm font-medium text-white bg-gradient-to-r from-primaryColor to-purple-600 hover:from-primaryColor/90 hover:to-purple-600/90 text-center py-4 px-6 rounded-full block w-full transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Get New Verification Email
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="text-sm font-medium text-white dark:text-white border border-n300 dark:border-n600 text-center py-3 px-6 rounded-full block w-full hover:bg-n50 dark:hover:bg-n700 transition-colors"
                  >
                    Back to MetaBloom
                  </button>
                  <p className="text-xs text-white dark:text-white text-center">
                    Need help? Contact our support team for assistance.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full text-center space-y-4">
          <div className="flex justify-center items-center space-x-6 text-sm text-white dark:text-white">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Secure Verification</span>
            </span>
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Privacy Protected</span>
            </span>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
