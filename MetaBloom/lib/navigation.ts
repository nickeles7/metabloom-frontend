/**
 * Navigation utilities for handling anchor links and smooth scrolling
 * with proper offset for fixed navbar
 */

// Height of the fixed navbar (adjust if navbar height changes)
const NAVBAR_HEIGHT = 80;

/**
 * Smoothly scroll to an element with proper offset for fixed navbar
 * @param elementId - The ID of the element to scroll to
 * @param offset - Additional offset (defaults to navbar height)
 */
export function scrollToElement(elementId: string, offset: number = NAVBAR_HEIGHT): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with ID "${elementId}" not found`);
    return;
  }

  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
}

/**
 * Handle anchor link clicks with proper offset
 * @param href - The href attribute (e.g., "#affiliate-program")
 * @param offset - Additional offset (defaults to navbar height)
 */
export function handleAnchorClick(href: string, offset: number = NAVBAR_HEIGHT): void {
  if (!href.startsWith('#')) {
    console.warn('Invalid anchor link:', href);
    return;
  }

  const elementId = href.substring(1);
  scrollToElement(elementId, offset);
}

/**
 * Set up automatic anchor link handling for the page
 * This will intercept clicks on anchor links and apply proper offset
 */
export function setupAnchorLinkHandling(): void {
  // Handle clicks on anchor links
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a[href^="#"]') as HTMLAnchorElement;
    
    if (link) {
      event.preventDefault();
      handleAnchorClick(link.getAttribute('href') || '');
    }
  });

  // Handle initial page load with hash
  if (window.location.hash) {
    // Wait for page to load completely
    setTimeout(() => {
      handleAnchorClick(window.location.hash);
    }, 100);
  }
}

/**
 * Hook for React components to handle anchor scrolling
 * Usage: useAnchorScrolling()
 */
export function useAnchorScrolling(): (() => void) | undefined {
  if (typeof window === 'undefined') return;

  // Set up on mount
  setupAnchorLinkHandling();

  // Handle hash changes (browser back/forward)
  const handleHashChange = () => {
    if (window.location.hash) {
      handleAnchorClick(window.location.hash);
    }
  };

  window.addEventListener('hashchange', handleHashChange);

  // Cleanup function (for React useEffect)
  return () => {
    window.removeEventListener('hashchange', handleHashChange);
  };
}

/**
 * Create an anchor link with proper offset handling
 * @param elementId - The ID of the target element
 * @param text - The link text
 * @param className - Optional CSS classes
 */
export function createAnchorLink(elementId: string, text: string, className?: string): string {
  return `<a href="#${elementId}" class="${className || ''}" onclick="event.preventDefault(); scrollToElement('${elementId}')">${text}</a>`;
}
