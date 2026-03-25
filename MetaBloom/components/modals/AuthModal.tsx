"use client";
import React, { FormEvent, useState } from "react";
import FormInput from "@/components/ui/FormInput";
import Link from "next/link";
import { useMainModal } from "@/stores/modal";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";

interface AuthModalProps {
  mode: "signin" | "signup";
}

function AuthModal({ mode }: AuthModalProps) {
  const isSignIn = mode === "signin";
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { modalClose, modalOpen } = useMainModal();

  const { login, signup, loginWithGoogle, sendEmailVerification, logout } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsError(false);
    setIsLoading(true);

    try {
      if (isSignIn) {
        // Sign in logic using Firebase
        const userCredential = await login(userEmail, userPassword);

        // Reload the user to get the latest verification status
        await userCredential.user.reload();
        console.log('🔄 User reloaded after login, verification status:', userCredential.user.emailVerified);

        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          setIsError(true);
          setErrorMessage("Please verify your email address before signing in. Check your inbox for a verification link.");
          setIsLoading(false);
          return;
        }

        // Give the auth state a moment to update, then close modal
        setTimeout(() => {
          modalClose();
        }, 100);
      } else {
        // Sign up logic using Firebase
        if (userEmail && userPassword.length >= 6) {
          const userCredential = await signup(userEmail, userPassword);

          // Send email verification
          await sendEmailVerification(userCredential.user);

          // Store email and password for auto-login after verification
          localStorage.setItem('pendingVerificationEmail', userEmail);
          localStorage.setItem('pendingVerificationPassword', userPassword);

          setIsVerificationSent(true);

          // Don't close modal, show verification message instead
          // Note: User stays "signed in" to Firebase but our AuthContext won't
          // treat them as authenticated until email is verified
        } else {
          setIsError(true);
          setErrorMessage("Please enter a valid email and password (minimum 6 characters).");
        }
      }
    } catch (error: any) {
      console.error("Authentication error:", error);

      // Set appropriate error message based on Firebase error code
      setIsError(true);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setErrorMessage("Invalid email or password. Please try again.");
      } else if (error.code === 'auth/email-already-in-use') {
        setErrorMessage("This email is already registered. Please sign in instead.");
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage("Password should be at least 6 characters.");
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage("Please enter a valid email address.");
      } else if (error.code === 'auth/network-request-failed') {
        setErrorMessage("Network error. Please check your internet connection.");
      } else {
        setErrorMessage("An error occurred. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      // Since user should still be signed in to Firebase (just not authenticated in our app),
      // we can try to get the current Firebase user
      const firebaseUser = auth.currentUser;

      if (firebaseUser) {
        await sendEmailVerification(firebaseUser);
      } else {
        // If no Firebase user, try to sign them in temporarily
        const userCredential = await login(userEmail, userPassword);
        await sendEmailVerification(userCredential.user);
      }

      setErrorMessage("");
      // Show success message briefly
      setTimeout(() => {
        setIsError(false);
      }, 3000);
    } catch (error: any) {
      console.error("Resend verification error:", error);
      setIsError(true);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setErrorMessage("Unable to resend verification. Please try signing up again.");
      } else {
        setErrorMessage("Failed to resend verification email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="w-full pt-4">
        <p className="text-2xl font-semibold">
          {isSignIn ? "Welcome Back!" : "Create an Account"}
        </p>
        {/* <p className="text-sm pt-4">
          {isSignIn
            ? "Sign in to your account and join us"
            : "Create an account to start chatting with MetaBloom"}
        </p> */}

        {isVerificationSent ? (
          <div className="pt-6 text-center">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
              <div className="text-green-600 dark:text-green-400 text-4xl mb-4">📧</div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                Verification Email Sent!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                We've sent a verification link to <strong>{userEmail}</strong>.
                Simply click the link in your email and you'll be automatically signed in!
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mb-4">
                Don't forget to check your spam folder if you don't see the email.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isLoading}
                className="text-sm font-medium text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 underline disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Resend verification email"}
              </button>
            </div>
            <button
              type="button"
              onClick={modalClose}
              className="text-sm font-medium text-white bg-primaryColor text-center py-3 px-6 rounded-full block w-full"
            >
              Close
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="pt-6 grid grid-cols-2 gap-4 sm:gap-6"
          >
            <div className="col-span-2">
              <FormInput
                title="Email address"
                placeholder="username@example.com"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="placeholder:italic"
              />
            </div>
            <div className="col-span-2">
              <FormInput
                title="Password"
                placeholder="*******"
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
              />
              {isSignIn && (
                <Link
                  href={"/"}
                  className="text-end block pt-4 text-primaryColor text-sm"
                >
                  Forget password?
                </Link>
              )}
            </div>

          {isSignIn && (
            <p className="col-span-2 text-sm pt-2">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => modalOpen("Authentication", { mode: "signup" })}
                className="text-primaryColor font-semibold"
              >
                Sign Up
              </button>
            </p>
          )}
          {!isSignIn && (
            <p className="col-span-2 text-sm pt-2">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => modalOpen("Authentication", { mode: "signin" })}
                className="text-primaryColor font-semibold"
              >
                Sign In
              </button>
            </p>
          )}

            <div className="col-span-2">
              <button
                type="submit"
                disabled={isLoading}
                className="text-sm font-medium text-white bg-primaryColor text-center py-3 px-6 rounded-full block w-full disabled:opacity-50"
              >
                {isLoading ? "Loading..." : (isSignIn ? "Sign In" : "Create Account")}
              </button>
              {isError && (
                <p className="text-errorColor text-sm pt-2">
                  {errorMessage || (isSignIn
                    ? "Please enter correct information"
                    : "Please enter a valid email and password (min 6 characters)")}
                </p>
              )}
            </div>
          </form>
        )}

        <div className="pt-8">
          <div className="flex justify-center items-center">
            <div className="bg-n30 flex-1 h-px"></div>
            <p className="text-xs px-2">Or Continue With</p>
            <div className="bg-n30 flex-1 h-px"></div>
          </div>
          <div className="pt-4 text-center">
            <div className="flex justify-center">
              <GoogleSignInButton
                rounded={true}
                shadow={true}
                hoverEffect={true}
                label={isSignIn ? "Sign in with Google" : "Sign up with Google"}
                onClick={async () => {
                  try {
                    setIsError(false);
                    setErrorMessage("");
                    await loginWithGoogle();
                    modalClose();
                  } catch (error: any) {
                    console.error("Google login error:", error);
                    setIsError(true);
                    if (error.code === 'auth/popup-closed-by-user') {
                      setErrorMessage("Sign-in popup was closed. Please try again.");
                    } else if (error.code === 'auth/popup-blocked') {
                      setErrorMessage("Sign-in popup was blocked. Please allow popups for this site.");
                    } else if (error.code === 'auth/cancelled-popup-request') {
                      // This is normal when multiple popups are attempted, no need to show error
                      setIsError(false);
                    } else if (error.code === 'auth/network-request-failed') {
                      setErrorMessage("Network error. Please check your internet connection.");
                    } else {
                      setErrorMessage("An error occurred with Google sign-in. Please try again.");
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
