/*
"use client";

import React from 'react';
import Image from 'next/image';

interface BannerProps {
  imagePath: string;
  altText?: string;
  height?: number;
  priority?: boolean;
  className?: string;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  objectPosition?: string;
}

const Banner: React.FC<BannerProps> = ({
  imagePath,
  altText = "Banner image",
  height = 200,
  priority = true,
  className = "",
  showOnMobile = true,
  showOnDesktop = true,
  objectPosition = "center",
}) => {
  // Create responsive display classes
  const displayClasses = [
    !showOnMobile ? 'md:block hidden' : '',
    !showOnDesktop ? 'md:hidden block' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={`w-full relative overflow-hidden ${displayClasses} ${className}`}
      style={{
        height: 'auto',
        aspectRatio: '2.4/1',
        maxHeight: `${height}px`,
        padding: 0,
        margin: 0,
        display: 'block'
      }}
    >
      <Image
        src={imagePath}
        alt={altText}
        fill
        priority={priority}
        sizes="100vw"
        style={{
          objectFit: 'cover',
          objectPosition: 'center',
          width: '100%',
          height: '100%'
        }}
        className="w-full"
      />
    </div>
  );
};

export default Banner;
*/