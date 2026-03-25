"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getCardById, HearthstoneCard } from '@/lib/hearthstone/cardData';

interface CardTooltipProps {
  cardId: string;
  cardName: string;
  children: React.ReactNode;
  className?: string;
}

interface TooltipPosition {
  x: number;
  y: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

const CardTooltip: React.FC<CardTooltipProps> = ({ 
  cardId, 
  cardName, 
  children, 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [cardData, setCardData] = useState<HearthstoneCard | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const triggerRef = useRef<HTMLSpanElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Card image URL
  const imageUrl = `https://art.hearthstonejson.com/v1/render/latest/enUS/512x/${cardId}.png`;

  // Load card data when component mounts
  useEffect(() => {
    const card = getCardById(cardId);
    setCardData(card);
  }, [cardId]);



  // Handle mouse enter
  const handleMouseEnter = (event: React.MouseEvent) => {
    // Clear any existing hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Calculate initial position using clientX/clientY for fixed positioning
    const tooltipWidth = 320;
    const tooltipHeight = 400;
    const offset = { x: 15, y: 10 };

    let x = event.clientX + offset.x;
    let y = event.clientY + offset.y;

    // Prevent tooltip from going off screen
    if (x + tooltipWidth > window.innerWidth) {
      x = event.clientX - tooltipWidth - offset.x;
    }
    if (y + tooltipHeight > window.innerHeight) {
      y = event.clientY - tooltipHeight - offset.y;
    }
    if (x < 0) x = offset.x;
    if (y < 0) y = offset.y;

    setMousePosition({ x, y });

    // Set a small delay before showing tooltip to prevent flickering
    hoverTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Reset image states
      setImageLoaded(false);
      setImageError(false);
    }, 100);
  };

  // Handle mouse move to update tooltip position
  const handleMouseMove = (event: React.MouseEvent) => {
    if (isVisible) {
      // Calculate position using clientX/clientY for fixed positioning
      const tooltipWidth = 320; // w-80 = 320px
      const tooltipHeight = 400; // approximate height
      const offset = { x: 15, y: 10 };

      let x = event.clientX + offset.x;
      let y = event.clientY + offset.y;

      // Prevent tooltip from going off screen
      if (x + tooltipWidth > window.innerWidth) {
        x = event.clientX - tooltipWidth - offset.x;
      }

      if (y + tooltipHeight > window.innerHeight) {
        y = event.clientY - tooltipHeight - offset.y;
      }

      if (x < 0) {
        x = offset.x;
      }

      if (y < 0) {
        y = offset.y;
      }

      setMousePosition({ x, y });
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    // Clear show timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Set a small delay before hiding to allow moving to tooltip
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  // Handle tooltip mouse enter (keep visible)
  const handleTooltipMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  // Handle tooltip mouse leave
  const handleTooltipMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };



  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <span
      ref={triggerRef}
      className={`card-hover-trigger relative cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-dotted underline-offset-2 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-card-id={cardId}
      data-card-name={cardName}
    >
      {children}

      {/* Tooltip rendered as portal to document body */}
      {isVisible && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
          }}
        >
          <div className="card-tooltip bg-gray-900 dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-600 p-4 w-80 max-w-sm pointer-events-auto animate-in fade-in-0 zoom-in-95 duration-200 opacity-100">
            {/* Card Image */}
            <div className="relative mb-3">
              {!imageError ? (
                <>
                  <img
                    src={imageUrl}
                    alt={cardName}
                    className={`w-full h-auto rounded-md transition-opacity duration-200 max-h-80 object-contain ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    loading="eager"
                  />
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-gray-700 rounded-md flex items-center justify-center min-h-[200px]">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-48 bg-gray-700 rounded-md flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">Image not available</span>
                </div>
              )}
            </div>

            {/* Card Info */}
            {cardData && (
              <div className="text-white text-sm space-y-1">
                <div className="font-bold text-base">{cardData.name}</div>
                {cardData.cost !== undefined && (
                  <div className="text-blue-300">Cost: {cardData.cost}</div>
                )}
                {cardData.attack !== undefined && cardData.health !== undefined && (
                  <div className="text-green-300">{cardData.attack}/{cardData.health}</div>
                )}
                {cardData.type && (
                  <div className="text-yellow-300">{cardData.type}</div>
                )}
                {cardData.rarity && (
                  <div className="text-purple-300">{cardData.rarity}</div>
                )}
                {cardData.set && (
                  <div className="text-gray-300 text-xs">{cardData.set}</div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </span>
  );
};

export default CardTooltip;
