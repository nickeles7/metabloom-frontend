"use client";

import React, { useState, useEffect } from 'react';
import { PiWarning, PiX } from 'react-icons/pi';

function FirestoreStatus() {
  const [firestoreStatus, setFirestoreStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Check if we're getting Firestore errors in console
    const originalError = console.error;
    let hasFirestoreError = false;

    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Firestore') && message.includes('NOT_FOUND')) {
        hasFirestoreError = true;
        setFirestoreStatus('error');
        setShowStatus(true);
      }
      originalError.apply(console, args);
    };

    // Check after a delay
    setTimeout(() => {
      if (!hasFirestoreError) {
        setFirestoreStatus('connected');
      }
      console.error = originalError;
    }, 3000);

    return () => {
      console.error = originalError;
    };
  }, []);

  if (!showStatus || firestoreStatus === 'connected') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <PiWarning className="text-yellow-600 text-xl flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Database Setup Required
            </h3>
            <p className="text-xs text-yellow-700 mt-1">
              Firestore database needs to be configured. The app will work with limited functionality.
            </p>
            <p className="text-xs text-yellow-600 mt-2">
              See <code className="bg-yellow-100 px-1 rounded">SETUP_GUIDE.md</code> for instructions.
            </p>
          </div>
          <button
            onClick={() => setShowStatus(false)}
            className="text-yellow-600 hover:text-yellow-800"
          >
            <PiX className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default FirestoreStatus;
