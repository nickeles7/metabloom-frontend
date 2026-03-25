"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import CardAwareText from './CardAwareText';
import DeckCode from '../chatComponents/DeckCode';
import { isValidDeckCode } from '@/lib/deckcode/decoder';
import { PiCopy, PiCheck } from 'react-icons/pi';
import { isCardDataReady, getAllCardNames } from '@/lib/hearthstone/cardData';

interface SimpleCardMarkdownProps {
  content: string;
  className?: string;
}

const SimpleCardMarkdown: React.FC<SimpleCardMarkdownProps> = ({ content, className = '' }) => {
  const [codeCopied, setCodeCopied] = React.useState(false);

  // Function to copy code to clipboard
  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };
  // Custom text renderer that processes card names
  const customTextRenderer = ({ children, ...props }: any) => {
    if (typeof children === 'string') {
      return <CardAwareText text={children} as="span" {...props} />;
    }
    return <span {...props}>{children}</span>;
  };

  // Custom paragraph renderer - check for tooltips to avoid nesting divs in p tags
  const customParagraphRenderer = ({ children, ...props }: any) => {
    // Check if any child contains card tooltips (which render divs)
    const hasTooltips = React.Children.toArray(children).some((child) => {
      if (typeof child === 'string' && isCardDataReady()) {
        // Check if this string contains any card names using the dynamic card data
        const cardNames = getAllCardNames();
        if (cardNames.length === 0) return false;

        const pattern = cardNames
          .sort((a, b) => b.length - a.length)
          .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|');
        const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
        return regex.test(child);
      }
      return false;
    });

    // If contains tooltips, use div instead of p to avoid invalid HTML nesting
    const Element = hasTooltips ? 'div' : 'p';

    return (
      <Element {...props} className={hasTooltips ? 'my-2' : undefined}>
        {React.Children.map(children, (child, index) => {
          if (typeof child === 'string') {
            return <CardAwareText key={index} text={child} as="span" />;
          }
          return child;
        })}
      </Element>
    );
  };

  // Custom strong/em renderers
  const customStrongRenderer = ({ children, ...props }: any) => {
    return (
      <strong {...props}>
        {React.Children.map(children, (child, index) => {
          if (typeof child === 'string') {
            return <CardAwareText key={index} text={child} as="span" />;
          }
          return child;
        })}
      </strong>
    );
  };

  const customEmRenderer = ({ children, ...props }: any) => {
    return (
      <em {...props}>
        {React.Children.map(children, (child, index) => {
          if (typeof child === 'string') {
            return <CardAwareText key={index} text={child} as="span" />;
          }
          return child;
        })}
      </em>
    );
  };

  // Custom list item renderer
  const customListItemRenderer = ({ children, ...props }: any) => {
    return (
      <li {...props}>
        {React.Children.map(children, (child, index) => {
          if (typeof child === 'string') {
            return <CardAwareText key={index} text={child} as="span" />;
          }
          return child;
        })}
      </li>
    );
  };

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          // Text processing
          text: customTextRenderer,
          p: customParagraphRenderer,
          strong: customStrongRenderer,
          em: customEmRenderer,
          li: customListItemRenderer,

          // Code block handling (including deck codes)
          code({ className, children, ...props }: any) {
            const inline = !className?.includes('language-');
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');

            // Enhanced Hearthstone deck code detection
            const trimmedCode = codeContent.trim();

            // First check: Basic format validation
            const hasBasicFormat = !match &&
              trimmedCode.length > 20 &&
              trimmedCode.length < 200 &&
              /^[A-Za-z0-9+/=]+$/.test(trimmedCode);

            // Second check: Advanced validation using deck decoder
            let isDeckCode = false;
            if (hasBasicFormat) {
              try {
                isDeckCode = isValidDeckCode(trimmedCode);
                if (isDeckCode) {
                  console.log('✅ Valid deck code detected:', trimmedCode.substring(0, 20) + '...');
                }
              } catch (error) {
                console.log('❌ Deck code validation failed:', error);
                isDeckCode = false;
              }
            }

            if (isDeckCode) {
              return <DeckCode code={trimmedCode} />;
            }

            return !inline ? (
              <div className="relative w-full">
                <pre className={`${match ? `language-${match[1]}` : ''} rounded-md p-4 bg-gray-800 text-white overflow-hidden`}>
                  <code className={`${className} whitespace-pre-wrap break-all`} {...props}>
                    {children}
                  </code>
                </pre>
                <button
                  onClick={() => copyCodeToClipboard(codeContent)}
                  className="absolute top-2 right-2 p-1 rounded-md bg-gray-700 text-white hover:bg-gray-600"
                  title="Copy code"
                >
                  {codeCopied ? <PiCheck /> : <PiCopy />}
                </button>
              </div>
            ) : (
              <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded-md" {...props}>
                {children}
              </code>
            );
          },

          // Table components
          table({ ...props }) {
            return (
              <div className="overflow-x-auto w-full">
                <table className="border-collapse border border-gray-300 w-full" {...props} />
              </div>
            );
          },
          th({ ...props }) {
            return <th className="border border-gray-300 px-4 py-2 bg-gray-100 dark:bg-gray-700" {...props} />;
          },
          td({ ...props }) {
            return <td className="border border-gray-300 px-4 py-2" {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default SimpleCardMarkdown;
