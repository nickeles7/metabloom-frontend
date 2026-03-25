// Firebase configuration
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Action code settings for email link authentication
const actionCodeSettings = {
  // URL you want to redirect back to. The domain (www.example.com) for this
  // URL must be in the authorized domains list in the Firebase Console.
  url: process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_URL || 'http://localhost:3000/email-signin',
  // This must be true.
  handleCodeInApp: true,
};

// Action code settings for email verification (custom branded method)
const emailVerificationSettings = {
  url: process.env.NEXT_PUBLIC_FIREBASE_EMAIL_VERIFICATION_URL || 'http://localhost:3000/auth/action',
  handleCodeInApp: false, // This ensures it goes to our custom page instead of Firebase's default
};

// Alternative email verification settings using email link (more reliable)
const emailLinkVerificationSettings = {
  url: process.env.NEXT_PUBLIC_FIREBASE_EMAIL_VERIFICATION_URL || 'http://localhost:3000/auth/verify',
  handleCodeInApp: true,
};

// Helper function to validate Firebase configuration
const validateFirebaseConfig = () => {
  const verificationUrl = process.env.NEXT_PUBLIC_FIREBASE_EMAIL_VERIFICATION_URL || 'http://localhost:3000/auth/action';

  console.log('🔧 Firebase Email Verification Configuration:');
  console.log('- Verification URL:', verificationUrl);
  console.log('- Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  console.log('- Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

  if (typeof window !== 'undefined') {
    console.log('- Current Origin:', window.location.origin);
    console.log('- Current URL:', window.location.href);
  }

  return {
    verificationUrl,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  };
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Configure Google provider to always show account picker
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Analytics conditionally (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  // Check if analytics is supported before initializing
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(error => {
    console.error('Analytics error:', error);
  });
}

export { auth, db, googleProvider, actionCodeSettings, emailVerificationSettings, emailLinkVerificationSettings, analytics, validateFirebaseConfig };
