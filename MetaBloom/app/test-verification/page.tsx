"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateFirebaseConfig } from '@/lib/firebase';

export default function TestVerification() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup, sendEmailVerification, sendEmailVerificationLink } = useAuth();

  const handleTestSignup = async () => {
    if (!email || !password) {
      setMessage('Please enter email and password');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      console.log('🔄 Testing signup and verification...');
      
      // Validate Firebase config
      const config = validateFirebaseConfig();
      console.log('Firebase config:', config);

      // Sign up user
      const userCredential = await signup(email, password);
      console.log('✅ Signup successful:', userCredential.user.email);

      // Store credentials for auto-login
      localStorage.setItem('pendingVerificationEmail', email);
      localStorage.setItem('pendingVerificationPassword', password);

      // Send traditional email verification
      await sendEmailVerification(userCredential.user);
      console.log('✅ Traditional verification email sent');

      setMessage(`
        ✅ Account created and verification email sent!
        
        Check your email for the verification link.
        
        Firebase Config:
        - Verification URL: ${config.verificationUrl}
        - Auth Domain: ${config.authDomain}
        - Project ID: ${config.projectId}
        
        The verification link should redirect to:
        ${config.verificationUrl}?mode=verifyEmail&oobCode=...
      `);

    } catch (error: any) {
      console.error('❌ Test signup error:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmailLink = async () => {
    if (!email || !password) {
      setMessage('Please enter email and password');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      console.log('🔄 Testing email link verification...');
      
      // Sign up user
      const userCredential = await signup(email, password);
      console.log('✅ Signup successful:', userCredential.user.email);

      // Store credentials for auto-login
      localStorage.setItem('pendingVerificationEmail', email);
      localStorage.setItem('pendingVerificationPassword', password);

      // Send email link verification (alternative method)
      await sendEmailVerificationLink(userCredential.user);
      console.log('✅ Email link verification sent');

      setMessage(`
        ✅ Account created and email link sent!
        
        Check your email for the verification link.
        This uses the email link method which should be more reliable.
        
        The verification link should redirect to:
        http://localhost:3000/auth/verify
      `);

    } catch (error: any) {
      console.error('❌ Test email link error:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebugURL = () => {
    const currentURL = window.location.href;
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    console.log('🔍 Current URL Debug Info:');
    console.log('- Full URL:', currentURL);
    console.log('- Search params:', Object.fromEntries(searchParams.entries()));
    console.log('- Hash:', hash);
    console.log('- Origin:', window.location.origin);
    console.log('- Pathname:', window.location.pathname);
    
    setMessage(`
      🔍 URL Debug Info:
      - Full URL: ${currentURL}
      - Search params: ${JSON.stringify(Object.fromEntries(searchParams.entries()), null, 2)}
      - Hash: ${hash}
      - Origin: ${window.location.origin}
      - Pathname: ${window.location.pathname}
    `);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Test Email Verification</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="test@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="password123"
            />
          </div>
          
          <div className="space-y-2">
            <button
              onClick={handleTestSignup}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test Traditional Verification'}
            </button>
            
            <button
              onClick={handleTestEmailLink}
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test Email Link Verification'}
            </button>
            
            <button
              onClick={handleDebugURL}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              Debug Current URL
            </button>
          </div>
        </div>
        
        {message && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md">
            <pre className="text-sm whitespace-pre-wrap">{message}</pre>
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-600">
          <p><strong>Instructions:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Enter a test email and password</li>
            <li>Click "Test Traditional Verification" or "Test Email Link Verification"</li>
            <li>Check your email for the verification link</li>
            <li>Click the verification link</li>
            <li>Check the browser console for debug information</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
