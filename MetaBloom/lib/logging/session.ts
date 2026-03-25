/**
 * Session Management for Logging System
 * Handles session ID generation, tracking, and correlation across requests
 */

// Dynamic import for UUID to handle both server and client environments
let uuidv4: () => string;

if (typeof window === 'undefined') {
  // Server-side
  uuidv4 = require('uuid').v4;
} else {
  // Client-side fallback
  uuidv4 = () => {
    return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

/**
 * Session information structure
 */
export interface SessionInfo {
  sessionId: string;
  userId?: string;
  userEmail?: string;
  startTime: number;
  lastActivity: number;
  userAgent?: string;
  referrer?: string;
  isAuthenticated: boolean;
}

/**
 * Request tracking information
 */
export interface RequestInfo {
  requestId: string;
  sessionId: string;
  method: string;
  path: string;
  startTime: number;
  userAgent?: string;
}

/**
 * Session Manager class
 */
export class SessionManager {
  private static sessions = new Map<string, SessionInfo>();
  private static currentSessionId: string | null = null;
  private static currentUserId: string | null = null;
  private static currentRequestId: string | null = null;

  /**
   * Generate a new session ID
   */
  static generateSessionId(): string {
    return `session_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }

  /**
   * Generate a new request ID
   */
  static generateRequestId(): string {
    return `req_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
  }

  /**
   * Start a new session
   */
  static startSession(options: {
    userId?: string;
    userEmail?: string;
    userAgent?: string;
    referrer?: string;
    isAuthenticated?: boolean;
  } = {}): string {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const sessionInfo: SessionInfo = {
      sessionId,
      userId: options.userId,
      userEmail: options.userEmail,
      startTime: now,
      lastActivity: now,
      userAgent: options.userAgent,
      referrer: options.referrer,
      isAuthenticated: options.isAuthenticated || false
    };

    this.sessions.set(sessionId, sessionInfo);
    this.setCurrentSession(sessionId);

    if (options.userId) {
      this.setCurrentUserId(options.userId);
    }

    // Set global context for logging
    this.updateGlobalContext();

    return sessionId;
  }

  /**
   * Update session with user information (for authentication events)
   */
  static updateSession(sessionId: string, updates: {
    userId?: string;
    userEmail?: string;
    isAuthenticated?: boolean;
  }): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { lastActivity: Date.now() });
      this.sessions.set(sessionId, session);

      // Update current context if this is the current session
      if (sessionId === this.currentSessionId) {
        if (updates.userId) {
          this.setCurrentUserId(updates.userId);
        }
        this.updateGlobalContext();
      }
    }
  }

  /**
   * End a session
   */
  static endSession(sessionId: string): void {
    this.sessions.delete(sessionId);

    // Clear session cache when session ends (server-side only)
    if (typeof window === 'undefined') {
      try {
        const { clearSessionCache } = require('../cache/session-cache');
        clearSessionCache(sessionId);
      } catch (error) {
        // Ignore cache clearing errors to avoid breaking session management
        console.warn('Failed to clear session cache:', error);
      }
    }

    if (sessionId === this.currentSessionId) {
      this.currentSessionId = null;
      this.currentUserId = null;
      this.updateGlobalContext();
    }
  }

  /**
   * Get current session ID
   */
  static getCurrentSession(): string | null {
    return this.currentSessionId;
  }

  /**
   * Set current session ID
   */
  static setCurrentSession(sessionId: string): void {
    this.currentSessionId = sessionId;
    this.updateGlobalContext();
  }

  /**
   * Get current user ID
   */
  static getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Set current user ID
   */
  static setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
    this.updateGlobalContext();
  }

  /**
   * Get current request ID
   */
  static getCurrentRequestId(): string | null {
    return this.currentRequestId;
  }

  /**
   * Start tracking a new request
   */
  static startRequest(options: {
    method: string;
    path: string;
    userAgent?: string;
    sessionId?: string;
  }): string {
    const requestId = this.generateRequestId();
    const sessionId = options.sessionId || this.currentSessionId;

    if (sessionId) {
      // Update session activity
      const session = this.sessions.get(sessionId);
      if (session) {
        session.lastActivity = Date.now();
        this.sessions.set(sessionId, session);
      }
    }

    this.currentRequestId = requestId;
    this.updateGlobalContext();

    return requestId;
  }

  /**
   * End request tracking
   */
  static endRequest(): void {
    this.currentRequestId = null;
    this.updateGlobalContext();
  }

  /**
   * Get session information
   */
  static getSessionInfo(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions (for debugging)
   */
  static getActiveSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up old sessions (call periodically)
   */
  static cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const sessionsToDelete: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > maxAgeMs) {
        sessionsToDelete.push(sessionId);
      }
    });

    sessionsToDelete.forEach(sessionId => {
      this.sessions.delete(sessionId);

      // Clear session cache for expired sessions (server-side only)
      if (typeof window === 'undefined') {
        try {
          const { clearSessionCache } = require('../cache/session-cache');
          clearSessionCache(sessionId);
        } catch (error) {
          // Ignore cache clearing errors to avoid breaking session cleanup
          console.warn('Failed to clear session cache during cleanup:', error);
        }
      }
    });
  }

  /**
   * Initialize session from browser context (client-side)
   */
  static initializeFromBrowser(): string {
    if (typeof window === 'undefined') {
      return this.startSession();
    }

    // Try to get existing session from sessionStorage
    let sessionId = sessionStorage.getItem('logging_session_id');
    
    if (!sessionId || !this.sessions.has(sessionId)) {
      // Create new session
      sessionId = this.startSession({
        userAgent: navigator.userAgent,
        referrer: document.referrer
      });
      
      // Store in sessionStorage
      sessionStorage.setItem('logging_session_id', sessionId);
    } else {
      // Restore existing session
      this.setCurrentSession(sessionId);
    }

    return sessionId;
  }

  /**
   * Initialize session from server context (API routes)
   */
  static initializeFromRequest(req: { headers: Record<string, string | string[] | undefined>; url?: string; }): string {
    const userAgent = Array.isArray(req.headers['user-agent']) 
      ? req.headers['user-agent'][0] 
      : req.headers['user-agent'];
    
    const referer = Array.isArray(req.headers.referer) 
      ? req.headers.referer[0] 
      : req.headers.referer;

    return this.startSession({
      userAgent,
      referrer: referer
    });
  }

  /**
   * Update global context for logging access
   */
  private static updateGlobalContext(): void {
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__LOGGING_SESSION_ID = this.currentSessionId;
      (globalThis as any).__LOGGING_USER_ID = this.currentUserId;
      (globalThis as any).__LOGGING_REQUEST_ID = this.currentRequestId;
    }
  }

  /**
   * Get context for logging (used by Logger class)
   */
  static getLoggingContext(): {
    sessionId?: string;
    userId?: string;
    requestId?: string;
  } {
    return {
      sessionId: this.currentSessionId || undefined,
      userId: this.currentUserId || undefined,
      requestId: this.currentRequestId || undefined
    };
  }
}
