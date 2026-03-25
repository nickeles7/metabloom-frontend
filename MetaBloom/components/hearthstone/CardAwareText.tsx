"use client";

import React, { useMemo } from 'react';
import CardTooltip from './CardTooltip';
import { detectCardNames, CardMatch } from '@/lib/hearthstone/cardNameDetection';
import { isCardDataReady } from '@/lib/hearthstone/cardData';
import { preloadCardsFromText } from '@/lib/hearthstone/imagePreloader';

interface CardAwareTextProps {
  text: string;
  className?: string;
  as?: 'span' | 'div' | 'p';
}

interface TextSegment {
  type: 'text' | 'card';
  content: string;
  cardId?: string;
  cardName?: string;
}

const CardAwareText: React.FC<CardAwareTextProps> = ({ 
  text, 
  className = '',
  as: Component = 'span'
}) => {
  // Process text to identify card names and create segments
  const textSegments = useMemo(() => {
    if (!text || !isCardDataReady()) {
      return [{ type: 'text' as const, content: text || '' }];
    }

    const cardMatches = detectCardNames(text);

    if (cardMatches.length === 0) {
      return [{ type: 'text' as const, content: text }];
    }

    // Preload images for detected cards
    const cardIds = cardMatches.map(match => match.cardId);
    preloadCardsFromText(cardIds);

    const segments: TextSegment[] = [];
    let lastIndex = 0;

    // Sort matches by start index
    const sortedMatches = cardMatches.sort((a, b) => a.startIndex - b.startIndex);

    for (const match of sortedMatches) {
      // Add text before the card name
      if (match.startIndex > lastIndex) {
        const textBefore = text.substring(lastIndex, match.startIndex);
        if (textBefore) {
          segments.push({
            type: 'text',
            content: textBefore
          });
        }
      }

      // Add the card name segment
      segments.push({
        type: 'card',
        content: match.cardName,
        cardId: match.cardId,
        cardName: match.cardName
      });

      lastIndex = match.endIndex;
    }

    // Add remaining text after the last card name
    if (lastIndex < text.length) {
      const textAfter = text.substring(lastIndex);
      if (textAfter) {
        segments.push({
          type: 'text',
          content: textAfter
        });
      }
    }

    return segments;
  }, [text]);

  // Render the segments
  const renderSegments = () => {
    return textSegments.map((segment, index) => {
      if (segment.type === 'card' && segment.cardId) {
        return (
          <CardTooltip
            key={`card-${index}-${segment.cardId}`}
            cardId={segment.cardId}
            cardName={segment.cardName || segment.content}
          >
            {segment.content}
          </CardTooltip>
        );
      }

      return (
        <React.Fragment key={`text-${index}`}>
          {segment.content}
        </React.Fragment>
      );
    });
  };

  return (
    <Component className={className}>
      {renderSegments()}
    </Component>
  );
};

export default CardAwareText;
