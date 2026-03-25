"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  UserCredential,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { auth, googleProvider, actionCodeSettings, emailVerificationSettings, emailLinkVerificationSettings } from '../lib/firebase';
import { useAuth as useAuthStore } from '@/stores/auth';
import { ReferralTracker } from '@/lib/affiliate';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<UserCredential>;
  sendSignInLink: (email: string) => Promise<void>;
  confirmSignInWithEmailLink: (email: string, href: string) => Promise<UserCredential>;
  isSignInWithEmailLink: (href: string) => boolean;
  sendEmailVerification: (user?: User) => Promise<void>;
  sendEmailVerificationLink: (user?: User) => Promise<void>;
  reloadUser: () => Promise<void>;
  forceAuthStateRefresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUser } = useAuthStore();

  function signup(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function loginWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  function logout() {
    return signOut(auth);
  }

  function sendSignInLink(email: string) {
    // Save the email locally so you don't need to ask the user for it again
    // if they open the link on the same device
    localStorage.setItem('emailForSignIn', email);
    return sendSignInLinkToEmail(auth, email, actionCodeSettings);
  }

  function confirmSignInWithEmailLink(email: string, href: string) {
    return signInWithEmailLink(auth, email, href);
  }

  function checkIsSignInWithEmailLink(href: string) {
    return isSignInWithEmailLink(auth, href);
  }

  function sendEmailVerificationToUser(user?: User) {
    const userToVerify = user || currentUser;
    if (!userToVerify) {
      throw new Error('No user available for email verification');
    }
    // Use custom email verification settings to redirect to our action handler
    return sendEmailVerification(userToVerify, emailVerificationSettings);
  }

  function sendEmailVerificationLinkToUser(user?: User) {
    const userToVerify = user || currentUser;
    if (!userToVerify) {
      throw new Error('No user available for email verification');
    }
    // Use email link verification (more reliable method)
    return sendEmailVerification(userToVerify, emailLinkVerificationSettings);
  }

  async function reloadUser() {
    if (currentUser) {
      await reload(currentUser);
      console.log('🔄 User reloaded manually, verification status:', currentUser.emailVerified);

      // Force a complete state update to trigger auth state change detection
      const updatedUser = auth.currentUser;
      if (updatedUser) {
        setCurrentUser(updatedUser);
        setUser(updatedUser);
      }
    }
  }

  async function forceAuthStateRefresh() {
    const user = auth.currentUser;
    if (user) {
      try {
        await user.reload();

        const isOAuthProvider = user.providerData.some(provider =>
          provider.providerId === 'google.com' ||
          provider.providerId === 'facebook.com' ||
          provider.providerId === 'github.com'
        );

        if (isOAuthProvider || user.emailVerified) {
          setCurrentUser(user);
          setUser(user);

          if (user.emailVerified) {
            localStorage.removeItem('pendingVerificationEmail');
            localStorage.removeItem('pendingVerificationPassword');
          }
        }
      } catch (error) {
        console.error('Error forcing auth state refresh:', error);
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Reload user to get latest verification status
        try {
          await user.reload();
        } catch (error) {
          console.error('Error reloading user:', error);
        }

        const isOAuthProvider = user.providerData.some(provider =>
          provider.providerId === 'google.com' ||
          provider.providerId === 'facebook.com' ||
          provider.providerId === 'github.com'
        );

        // If it's an OAuth user OR email is verified, proceed with login
        if (isOAuthProvider || user.emailVerified) {
          setCurrentUser(user);
          setUser(user);

          // Clear any pending verification credentials since user is now verified
          if (user.emailVerified) {
            localStorage.removeItem('pendingVerificationEmail');
            localStorage.removeItem('pendingVerificationPassword');
          }

          try {
            // Check for stored referral code
            const referralCode = ReferralTracker.getReferralCode();

            const response = await fetch('/api/user/initialize', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: isOAuthProvider ? true : user.emailVerified,
                referralCode,
              }),
            });

            const result = await response.json();

            if (result.referralAttributed) {
              console.log('✅ Referral successfully attributed');
              ReferralTracker.clearReferralCode();
            }
          } catch (error) {
            console.error('Error initializing user profile:', error);
          }
        } else {
          // User exists but email is not verified
          console.log('📧 User email not verified');
          setCurrentUser(null);
          setUser(null);

          // Don't sign them out immediately - let them stay "signed in" to Firebase
          // but not authenticated in our app until they verify
          // This allows them to receive verification emails
        }
      } else {
        // No user signed in
        console.log('👤 No user signed in');
        setCurrentUser(null);
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [setUser]);

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    loginWithGoogle,
    sendSignInLink,
    confirmSignInWithEmailLink,
    isSignInWithEmailLink: checkIsSignInWithEmailLink,
    sendEmailVerification: sendEmailVerificationToUser,
    sendEmailVerificationLink: sendEmailVerificationLinkToUser,
    reloadUser,
    forceAuthStateRefresh
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
