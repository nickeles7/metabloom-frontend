"use client";

import React from 'react';
import GoogleButton from 'react-google-button';

interface GoogleSignInButtonProps {
  onClick: () => Promise<void>;
  label?: string;
  type?: 'light' | 'dark';
  className?: string;
  rounded?: boolean;
  shadow?: boolean;
  hoverEffect?: boolean;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onClick,
  label = 'Sign in with Google',
  type = 'light',
  className = '',
  rounded = true,
  shadow = true,
  hoverEffect = true,
}) => {
  // Build the class names based on props
  const containerClasses = [
    className,
    rounded ? 'rounded-full overflow-hidden' : '',
    shadow ? 'shadow-md' : '',
    hoverEffect ? 'hover:shadow-lg hover:-translate-y-0.5' : '',
    'transition-all duration-200'
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <GoogleButton
        type={type}
        onClick={onClick}
        label={label}
        style={{
          borderRadius: rounded ? '9999px' : undefined,
          overflow: 'hidden',
        }}
      />
    </div>
  );
};

export default GoogleSignInButton;
