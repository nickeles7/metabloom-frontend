"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import Image from 'next/image';
import logo from '@/public/images/MetaBloom logo.png';
import GradientBackground from '@/components/ui/GradientBackground';
import Footer from '@/components/Footer';
import FormInput from '@/components/ui/FormInput';

export default function VerifyEmail() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const router = useRouter();
  const { currentUser, sendEmailVerification, reloadUser, logout, login } = useAuth();

  useEffect(() => {
    // Check if there's a stored email from the signup process
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    if (storedEmail) {
      setUserEmail(storedEmail);
    }

    // If user is logged in and already verified, redirect to home
    if (currentUser?.emailVerified) {
      router.push('/');
      return;
    }

    // If no user is logged in and no stored email, redirect to home
    if (!currentUser && !storedEmail) {
      router.push('/');
      return;
    }
  }, [currentUser, router]);

  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setIsSuccess(false);

      // Check if there's a Firebase user (even if not authenticated in our app)
      const firebaseUser = auth.currentUser;

      if (firebaseUser) {
        // User is signed in to Firebase, send verification directly
        await sendEmailVerification(firebaseUser);
        setIsSuccess(true);
        setErrorMessage('');
      } else if (currentUser) {
        // User is authenticated in our app, send verification
        await sendEmailVerification(currentUser);
        setIsSuccess(true);
        setErrorMessage('');
      } else {
        // No user signed in, need credentials
        if (!userEmail) {
          setShowLoginForm(true);
          setIsError(true);
          setErrorMessage('Please enter your email address to resend verification.');
          setIsLoading(false);
          return;
        }

        if (!userPassword) {
          setShowLoginForm(true);
          setIsError(true);
          setErrorMessage('Please enter your password to resend verification.');
          setIsLoading(false);
          return;
        }

        try {
          const userCredential = await login(userEmail, userPassword);

          // Check if user is already verified
          if (userCredential.user.emailVerified) {
            setIsError(true);
            setErrorMessage('Your email is already verified! You can now sign in normally.');
            setIsLoading(false);
            return;
          }

          await sendEmailVerification(userCredential.user);

          // Store credentials for auto-login after verification
          localStorage.setItem('pendingVerificationEmail', userEmail);
          localStorage.setItem('pendingVerificationPassword', userPassword);

          setIsSuccess(true);
          setErrorMessage('');
        } catch (loginError: any) {
          console.error('Login error during resend:', loginError);
          setIsError(true);

          if (loginError.code === 'auth/wrong-password') {
            setErrorMessage('Incorrect password. Please check your password and try again.');
          } else if (loginError.code === 'auth/user-not-found') {
            setErrorMessage('No account found with this email. Please check your email address.');
          } else if (loginError.code === 'auth/invalid-email') {
            setErrorMessage('Invalid email address format.');
          } else if (loginError.code === 'auth/too-many-requests') {
            setErrorMessage('Too many failed attempts. Please try again later.');
          } else {
            setErrorMessage(loginError.message || 'Failed to resend verification email. Please try again.');
          }

          setShowLoginForm(true);
        }
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      setIsError(true);
      setErrorMessage(error.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      setIsCheckingVerification(true);
      setIsError(false);

      // Check Firebase user first (might be signed in but not authenticated in our app)
      const firebaseUser = auth.currentUser;

      if (firebaseUser) {
        // Reload the Firebase user to get latest verification status
        await firebaseUser.reload();

        if (firebaseUser.emailVerified) {
          // Email is verified! Clear stored credentials
          localStorage.removeItem('pendingVerificationEmail');
          localStorage.removeItem('pendingVerificationPassword');

          // Redirect to home
          router.push('/');
        } else {
          setIsError(true);
          setErrorMessage('Email not yet verified. Please check your inbox and click the verification link.');
        }
      } else if (currentUser) {
        // User is authenticated in our app, reload and check
        await reloadUser();

        if (currentUser.emailVerified) {
          localStorage.removeItem('pendingVerificationEmail');
          localStorage.removeItem('pendingVerificationPassword');
          router.push('/');
        } else {
          setIsError(true);
          setErrorMessage('Email not yet verified. Please check your inbox and click the verification link.');
        }
      } else {
        // No user signed in, need credentials
        if (!userEmail || !userPassword) {
          setShowLoginForm(true);
          setIsError(true);
          setErrorMessage('Please enter your email and password to check verification status.');
          setIsCheckingVerification(false);
          return;
        }

        try {
          const userCredential = await login(userEmail, userPassword);

          if (userCredential.user.emailVerified) {
            // Email is verified! Clear stored credentials and stay logged in
            localStorage.removeItem('pendingVerificationEmail');
            localStorage.removeItem('pendingVerificationPassword');
            router.push('/');
          } else {
            setIsError(true);
            setErrorMessage('Email not yet verified. Please check your inbox and click the verification link.');
          }
        } catch (loginError: any) {
          console.error('Login error during check:', loginError);
          setIsError(true);

          if (loginError.code === 'auth/wrong-password') {
            setErrorMessage('Incorrect password. Please check your password and try again.');
          } else if (loginError.code === 'auth/user-not-found') {
            setErrorMessage('No account found with this email. Please check your email address.');
          } else {
            setErrorMessage(loginError.message || 'Failed to check verification status. Please try again.');
          }

          setShowLoginForm(true);
        }
      }
    } catch (error: any) {
      console.error('Check verification error:', error);
      setIsError(true);
      setErrorMessage('Failed to check verification status. Please try again.');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (!currentUser) {
    return null; // Will redirect in useEffect
  }

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
          <h1 className="text-2xl font-semibold mb-4">Verify Your Email</h1>
          
          <div className="w-full max-w-md">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6 text-center">
              <div className="text-blue-600 dark:text-blue-400 text-4xl mb-4">📧</div>
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Check Your Email
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                We've sent a verification link to <strong>{currentUser?.email || userEmail}</strong>.
                Simply click the link in your email and you'll be automatically signed in!
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                Don't forget to check your spam folder if you don't see the email.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                The verification link will open in a new tab and automatically log you in to MetaBloom.
              </p>
            </div>

            {showLoginForm && !currentUser && (
              <div className="mb-6 p-4 border border-n300 dark:border-n600 rounded-lg">
                <h4 className="text-sm font-semibold mb-3">Enter your credentials to continue:</h4>
                <div className="space-y-3">
                  <FormInput
                    title="Email address"
                    placeholder="your@email.com"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                  <FormInput
                    title="Password"
                    placeholder="Enter your password"
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleCheckVerification}
                disabled={isCheckingVerification || (showLoginForm && (!userEmail || !userPassword))}
                className="text-sm font-medium text-white bg-primaryColor text-center py-3 px-6 rounded-full block w-full disabled:opacity-50"
              >
                {isCheckingVerification ? "Checking..." : "I've Verified My Email"}
              </button>

              <button
                onClick={handleResendVerification}
                disabled={isLoading || (showLoginForm && (!userEmail || !userPassword))}
                className="text-sm font-medium text-primaryColor border border-primaryColor text-center py-3 px-6 rounded-full block w-full hover:bg-primaryColor hover:text-white transition-colors disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Resend Verification Email"}
              </button>

              {isSuccess && (
                <div className="text-green-600 dark:text-green-400 text-sm text-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  Verification email sent! Check your inbox.
                </div>
              )}

              {isError && (
                <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm mb-4">
                Wrong email address?{" "}
                <button
                  onClick={handleSignOut}
                  className="text-primaryColor font-semibold hover:underline"
                >
                  Sign out and try again
                </button>
              </p>
              
              <p className="text-xs text-n400 dark:text-n500">
                Having trouble? Contact our support team for assistance.
              </p>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
