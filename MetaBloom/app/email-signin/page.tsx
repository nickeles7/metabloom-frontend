"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import logo from '@/public/images/MetaBloom logo.png';
import GradientBackground from '@/components/ui/GradientBackground';
import Footer from '@/components/Footer';
import FormInput from '@/components/ui/FormInput';
import Link from 'next/link';

export default function EmailSignIn() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingLink, setIsProcessingLink] = useState(false);
  const router = useRouter();
  const { isSignInWithEmailLink, confirmSignInWithEmailLink, sendSignInLink } = useAuth();

  useEffect(() => {
    // Check if the URL contains an email sign-in link
    if (typeof window !== 'undefined') {
      const href = window.location.href;

      if (isSignInWithEmailLink(href)) {
        setIsProcessingLink(true);

        // Get the email from localStorage if available
        let emailFromStorage = localStorage.getItem('emailForSignIn');

        if (!emailFromStorage) {
          // If no email in storage, ask the user for their email
          emailFromStorage = window.prompt('Please provide your email for confirmation');
        }

        if (emailFromStorage) {
          setIsLoading(true);

          // Sign in with the email link
          confirmSignInWithEmailLink(emailFromStorage, href)
            .then(() => {
              // Clear the email from storage
              localStorage.removeItem('emailForSignIn');
              // Redirect to the home page
              router.push('/');
            })
            .catch((error) => {
              setIsError(true);
              setErrorMessage(error.message || 'Failed to sign in with email link');
              console.error('Email link sign-in error:', error);
            })
            .finally(() => {
              setIsLoading(false);
              setIsProcessingLink(false);
            });
        } else {
          setIsError(true);
          setErrorMessage('No email provided for sign-in');
          setIsProcessingLink(false);
        }
      }
    }
  }, [isSignInWithEmailLink, confirmSignInWithEmailLink, router]);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setIsError(true);
      setErrorMessage('Please enter your email address');
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setIsSuccess(false);

      await sendSignInLink(email);

      // Save email to localStorage for the sign-in process
      localStorage.setItem('emailForSignIn', email);

      setIsSuccess(true);
      setEmail('');

      // Log helpful message for local development
      console.log('📧 Email link sent! For local development:');
      console.log('1. Check your email for the sign-in link');
      console.log('2. Make sure "localhost" is added to authorized domains in Firebase Console');
      console.log('3. Copy and paste the link into your browser');
    } catch (error: any) {
      setIsError(true);
      setErrorMessage(error.message || 'Failed to send sign-in link');
      console.error('Send sign-in link error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-2xl font-semibold mb-4">Passwordless Sign In</h1>

          {isProcessingLink ? (
            <div className="text-center">
              <p>Processing your sign-in link...</p>
              {isLoading && <p className="mt-2">Please wait...</p>}
            </div>
          ) : (
            <>
              <p className="text-center mb-8">
                Enter your email address below and we'll send you a link to sign in without a password.
              </p>

              <form onSubmit={handleSendLink} className="w-full max-w-md">
                <FormInput
                  title="Email Address"
                  placeholder="your@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <button
                  type="submit"
                  className="text-sm font-medium text-white bg-primaryColor text-center py-3 px-6 rounded-full block w-full mt-6"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending Link..." : "Send Sign-In Link"}
                </button>

                {isError && (
                  <p className="text-errorColor text-sm mt-4 text-center">
                    {errorMessage}
                  </p>
                )}

                {isSuccess && (
                  <div className="text-successColor text-sm mt-4 text-center">
                    <p>Sign-in link sent! Check your email inbox.</p>
                    <p className="mt-2 text-xs">
                      <strong>Note for local development:</strong> Make sure "localhost" is added to
                      authorized domains in your Firebase Console.
                    </p>
                  </div>
                )}
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm">
                  Want to use a password instead?{" "}
                  <Link href="/sign-in" className="text-primaryColor font-semibold">
                    Sign in with password
                  </Link>
                </p>
                <p className="text-sm mt-2">
                  Don't have an account?{" "}
                  <Link href="/sign-up" className="text-errorColor font-semibold">
                    Sign Up
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}
