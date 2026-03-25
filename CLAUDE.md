# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a Next.js 15 application with TypeScript called MetaBloom - an AI-powered conversational interface with Grok integration, Stripe payments, and Firebase authentication. The main application code is in the `MetaBloom/` directory.

## Key Development Commands

```bash
# Development
npm run dev                    # Start development server with Turbopack
npm run build                  # Build for production
npm start                      # Start production server
npm run lint                   # Run ESLint

# Logging utilities
npm run logs:clean             # Clean all log files
npm run logs:view              # View all logs in real-time
npm run logs:errors            # View error logs
npm run logs:queries           # View query logs
npm run logs:sessions          # View session logs
npm run logs:performance       # View performance logs
npm run dev:capture            # Capture development logs
npm run dev:analyze            # Analyze development logs
```

## Architecture Overview

### Core Technologies
- **Next.js 15** with App Router
- **TypeScript** with strict mode
- **Firebase** for authentication, Firestore database
- **Stripe** for payment processing
- **Grok AI** for conversational AI (custom integration)
- **Zustand** for state management
- **Tailwind CSS** for styling

### Key Architectural Components

#### Authentication & User Management
- Firebase Auth with Google OAuth and email/password
- Email link authentication support
- Automatic user profile initialization in Firestore
- Referral tracking system integrated with authentication

#### AI Integration
- Custom Grok service layer in `lib/grok/` with streaming support
- Function calling capabilities for Grok AI
- Comprehensive logging system for AI interactions
- Session-based system prompt caching
- Conversation state management

#### State Management
- Zustand stores for auth, chat, modals, subscriptions, and tokens
- Centralized state with TypeScript types
- Context providers for auth and streaming

#### Payment System
- Stripe integration with webhook handling
- Subscription management with billing periods
- Token-based usage system
- Downgrade notifications and cancellation handling

#### Logging System
- Comprehensive logging in `lib/logging/` with multiple log levels
- Optimized client-side logging to reduce verbosity
- Session-based logging with daily rotation
- Performance monitoring and query tracking

### Directory Structure
- `app/` - Next.js App Router pages and API routes
- `components/` - React components organized by feature
- `lib/` - Core business logic and utilities
- `contexts/` - React context providers
- `stores/` - Zustand state management
- `hooks/` - Custom React hooks
- `logs/` - Application logs (daily rotation)

### Important Files
- `lib/firebase.ts` - Firebase configuration and initialization
- `lib/grok/service.ts` - Main Grok AI service layer
- `contexts/AuthContext.tsx` - Authentication context provider
- `lib/stripe.ts` - Stripe payment integration

## Development Notes

### Firebase Environment Variables
Ensure all Firebase environment variables are set:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### Logging Patterns
The application uses a sophisticated logging system. When working with AI interactions or debugging, use the existing logging infrastructure in `lib/logging/`.

### AI Integration
The Grok integration supports both streaming and non-streaming responses. Function calling is implemented for enhanced AI capabilities. Always use the GrokService class for AI interactions.

### State Management
Use Zustand stores for global state. Each store is typed and follows the established patterns in the `stores/` directory.

### Routing Structure
The application uses Next.js App Router with a clean, consistent routing pattern:
- Chat routes: `/chat/[id]` for all chat functionality
- Main app routes are grouped under `(with-layout)` for shared UI components
- All chat navigation uses the standardized `/chat/[id]` pattern for consistency

### Current Implementation Status
- **Routing Backbone**: In development - see `ROUTING_BACKBONE_IMPLEMENTATION_HANDOFF.md` for current context
- **Build Status**: ✅ Fixed (duplicate exports and logger errors resolved)
- **Legacy Route Cleanup**: ✅ Removed duplicate `/[id]` route pattern