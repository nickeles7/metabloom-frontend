"use client";

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import CardTooltip from './CardTooltip';
import { detectCardNames } from '@/lib/hearthstone/cardNameDetection';
import { isCardDataReady } from '@/lib/hearthstone/cardData';
import { preloadCardsFromText } from '@/lib/hearthstone/imagePreloader';

interface CardAwareMarkdownProps {
  content: string;
  className?: string;
  components?: Record<string, React.ComponentType<any>>;
}

const CardAwareMarkdown: React.FC<CardAwareMarkdownProps> = ({ 
  content, 
  className = '',
  components = {}
}) => {
  // Process the markdown content to wrap card names
  const processedContent = useMemo(() => {
    if (!content || !isCardDataReady()) {
      return content;
    }

    // For now, we'll do a simple text replacement approach
    // This could be enhanced to be more markdown-aware in the future
    const cardMatches = detectCardNames(content);

    // Debug logging
    if (cardMatches.length > 0) {
      console.log('🃏 Detected cards in markdown:', cardMatches.map(m => m.cardName));
    } else {
      console.log('🃏 No cards detected in content:', content.substring(0, 100) + '...');
    }

    if (cardMatches.length === 0) {
      return content;
    }

    // Preload images for detected cards
    const cardIds = cardMatches.map(match => match.cardId);
    preloadCardsFromText(cardIds);

    // Sort matches by start index in reverse order to avoid index shifting
    const sortedMatches = cardMatches.sort((a, b) => b.startIndex - a.startIndex);

    let processedText = content;

    for (const match of sortedMatches) {
      const beforeText = processedText.substring(0, match.startIndex);
      const afterText = processedText.substring(match.endIndex);

      // Create a special marker that we'll replace in the React component
      const marker = `__CARD_${match.cardId}_${match.cardName.replace(/\s+/g, '_')}__`;

      processedText = beforeText + marker + afterText;
    }

    return processedText;
  }, [content]);

  // Custom text renderer that handles card markers
  const customTextRenderer = ({ children, ...props }: any) => {
    if (typeof children !== 'string') {
      return <span {...props}>{children}</span>;
    }

    const text = children;
    const cardMarkerRegex = /__CARD_([^_]+)_([^_]+(?:_[^_]+)*)__/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = cardMarkerRegex.exec(text)) !== null) {
      // Add text before the marker
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Extract card info from marker
      const cardId = match[1];
      const cardName = match[2].replace(/_/g, ' ');

      // Add the card tooltip
      parts.push(
        <CardTooltip
          key={`card-${cardId}-${match.index}`}
          cardId={cardId}
          cardName={cardName}
        >
          {cardName}
        </CardTooltip>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 1 ? <span {...props}>{parts}</span> : <span {...props}>{children}</span>;
  };

  // Merge custom components with provided components
  const mergedComponents = {
    // Default text handling
    text: customTextRenderer,
    
    // Handle inline text in various elements
    p: ({ children, ...props }: any) => {
      return <p {...props}>{React.Children.map(children, (child, index) => {
        if (typeof child === 'string') {
          return customTextRenderer({ children: child });
        }
        return child;
      })}</p>;
    },

    // Handle text in other common elements
    span: ({ children, ...props }: any) => {
      if (typeof children === 'string') {
        return customTextRenderer({ children, ...props });
      }
      return <span {...props}>{children}</span>;
    },

    strong: ({ children, ...props }: any) => {
      return <strong {...props}>{React.Children.map(children, (child, index) => {
        if (typeof child === 'string') {
          return customTextRenderer({ children: child });
        }
        return child;
      })}</strong>;
    },

    em: ({ children, ...props }: any) => {
      return <em {...props}>{React.Children.map(children, (child, index) => {
        if (typeof child === 'string') {
          return customTextRenderer({ children: child });
        }
        return child;
      })}</em>;
    },

    // Override any provided components
    ...components
  };

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={mergedComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default CardAwareMarkdown;
