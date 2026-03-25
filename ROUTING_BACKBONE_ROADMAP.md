# MetaBloom Routing Backbone & Guided Conversation Roadmap

## Executive Summary

This roadmap outlines the development of MetaBloom's **Routing Backbone** and **Guided Actions** system to enhance AI conversation intelligence. The goal is to transform brittle intent detection into a robust, user-guided conversation experience similar to ChatGPT's contextual suggestions.

**Vision**: Replace unpredictable AI guessing with intelligent, contextual conversation guidance that offers users clear next steps: *"Want me to: ✅ Analyze synergies ✅ Find similar decks ✅ Export to game"*

---

## Current State Analysis

### ✅ What's Working Well

1. **Sophisticated Pre-routing System** (`/app/api/chat/route.ts:13-86`)
   - Deterministic pattern matching with 7 distinct patterns
   - 95%+ accuracy for deck codes, explicit requests, and greetings
   - Immediate routing without AI overhead

2. **Dual Streaming Architecture** (`/app/api/chat/route.ts:455-830`)
   - Normal Streaming: Direct responses for casual chat
   - Hidden Sequential: Two-stage processing for complex queries
   - Proper loading states and error handling

3. **Auto-processing Pipeline** (`/app/api/chat/route.ts:288-360`)
   - Deck codes → Database lookup → Formatted analysis → AI presentation
   - Bypasses function calling for deterministic patterns
   - Reduces token usage and improves reliability

### ⚠️ Critical Pain Points

1. **Intent Detection Brittleness**
   - AI fallback fails frequently, defaults to `GENERAL_CHAT` 
   - Single confidence threshold (0.8) creates binary decisions
   - No learning from user interactions or feedback

2. **Conversation Flow Failures**
   - JSON parsing errors in streaming (Position 353 pattern)
   - Function calling corruption: `"detectUserIntentexploreCardsAST"`
   - Circuit breaker triggers too aggressively (5 failures = 30s cooldown)

3. **Missing Guided Actions**
   - No contextual suggestions for user next steps
   - Static chat options don't adapt to conversation context
   - Users left guessing what the AI can do next

4. **Conversation State Management**
   - History limited to 10 messages
   - Long conversations lose important context
   - No conversation summarization or key insight preservation

---

## Routing Backbone Architecture

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Build the core routing infrastructure to support guided actions

#### 1.1 Enhanced Pre-routing System
```typescript
// Extend current pre-routing with confidence bands
interface RoutingDecision {
  route: string;
  confidence: number;
  guidedActions?: GuidedAction[];
  context: ConversationContext;
}

// Add confidence bands instead of single threshold
const CONFIDENCE_BANDS = {
  CERTAIN: 0.95,     // Execute immediately
  CONFIDENT: 0.8,    // Execute with guided actions
  UNCERTAIN: 0.6,    // Offer choices to user
  UNCLEAR: 0.4       // Request clarification
};
```

#### 1.2 Conversation Context Engine
```typescript
interface ConversationContext {
  recentIntents: IntentType[];
  deckCodesShared: string[];
  userPreferences: UserPreferences;
  conversationPhase: 'discovery' | 'analysis' | 'refinement' | 'export';
  lastSuccessfulActions: string[];
}
```

#### 1.3 Guided Actions Framework
```typescript
interface GuidedAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  confidence: number;
  intent: IntentType;
  parameters?: Record<string, any>;
}

// Context-aware action generation
function generateGuidedActions(context: ConversationContext): GuidedAction[] {
  // Dynamic suggestion based on conversation state
}
```

### Phase 2: Guided Actions Integration (Weeks 3-4)
**Goal**: Enhance streaming responses with contextual suggestions

#### 2.1 Streaming Response Enhancement
```typescript
// Integration point already marked in code
// /app/api/chat/route.ts:523-526
function enhanceStreamingWithGuidedActions(
  streamResponse: ReadableStream,
  context: { userMessage: string; intentResult: any; conversationContext: ConversationContext }
): ReadableStream {
  // Transform stream to include guided actions
  return new TransformStream({
    transform(chunk, controller) {
      const enhanced = addGuidedActionsToChunk(chunk, context);
      controller.enqueue(enhanced);
    }
  });
}
```

#### 2.2 Dynamic Action Generation
```typescript
// Context-aware guided actions
const generateActionsForDeckAnalysis = (deckData: any): GuidedAction[] => [
  {
    id: 'analyze-synergies',
    label: 'Analyze Synergies',
    description: 'Find card combinations and synergistic effects',
    icon: '🔗',
    confidence: 0.9,
    intent: 'DECK_ANALYSIS'
  },
  {
    id: 'find-similar',
    label: 'Find Similar Decks',
    description: 'Search for decks with similar strategy',
    icon: '🔍',
    confidence: 0.85,
    intent: 'DECK_SEARCH'
  },
  {
    id: 'suggest-improvements',
    label: 'Suggest Improvements',
    description: 'Recommend card substitutions and optimizations',
    icon: '⚡',
    confidence: 0.8,
    intent: 'DECK_OPTIMIZATION'
  }
];
```

### Phase 3: Conversation Intelligence (Weeks 5-6)
**Goal**: Implement progressive conversation flows and context preservation

#### 3.1 Multi-turn Conversation Flows
```typescript
interface ConversationFlow {
  flowId: string;
  currentStep: number;
  totalSteps: number;
  stepData: Record<string, any>;
  nextActions: GuidedAction[];
}

// Progressive disclosure of functionality
const deckBuildingFlow: ConversationFlow = {
  flowId: 'deck-building',
  steps: [
    { id: 'class-selection', actions: ['Choose Class', 'Suggest Popular'] },
    { id: 'strategy-definition', actions: ['Aggro', 'Control', 'Midrange'] },
    { id: 'card-selection', actions: ['Core Cards', 'Synergies', 'Tech Cards'] },
    { id: 'optimization', actions: ['Mana Curve', 'Win Conditions', 'Sideboard'] }
  ]
};
```

#### 3.2 Conversation Context Summarization
```typescript
interface ConversationSummary {
  keyInsights: string[];
  userPreferences: UserPreferences;
  importantCards: string[];
  decksDiscussed: string[];
  unfinishedTasks: string[];
}

// Intelligent context preservation beyond 10 messages
function summarizeConversation(messages: Message[]): ConversationSummary {
  // AI-powered summarization to preserve key context
}
```

### Phase 4: Advanced Features (Weeks 7-8)
**Goal**: Implement learning and optimization features

#### 4.1 User Preference Learning
```typescript
interface UserPreferences {
  favoriteClasses: string[];
  preferredFormats: string[];
  playStyle: 'aggro' | 'control' | 'midrange' | 'combo';
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  frequentActions: string[];
}

// Learn from user interactions
function updateUserPreferences(action: string, outcome: 'positive' | 'negative') {
  // Adjust future guided action suggestions
}
```

#### 4.2 Conversation Quality Metrics
```typescript
interface ConversationMetrics {
  guidedActionUsage: number;
  userSatisfactionScore: number;
  taskCompletionRate: number;
  averageConversationLength: number;
  errorRate: number;
}
```

---

## Implementation Strategy

### Technical Approach

1. **Incremental Enhancement**
   - Build on existing pre-routing system
   - Enhance streaming without breaking current functionality
   - A/B test guided actions with user subsets

2. **Backward Compatibility**
   - Maintain existing API contracts
   - Graceful degradation when guided actions fail
   - Preserve current user experience during transition

3. **Error Resilience**
   - Robust fallback mechanisms
   - Circuit breaker improvements
   - Better error classification and recovery

### Development Phases

**Phase 1: Foundation (Weeks 1-2)**
- ✅ Pre-routing system enhancement
- ✅ Conversation context engine
- ✅ Basic guided actions framework

**Phase 2: Integration (Weeks 3-4)**
- ✅ Streaming response enhancement
- ✅ Dynamic action generation
- ✅ Frontend guided actions UI

**Phase 3: Intelligence (Weeks 5-6)**
- ✅ Multi-turn conversation flows
- ✅ Context summarization
- ✅ Progressive disclosure patterns

**Phase 4: Optimization (Weeks 7-8)**
- ✅ User preference learning
- ✅ Conversation quality metrics
- ✅ Performance optimization

### Success Metrics

**User Experience**
- 🎯 50% reduction in "I don't know what to ask" scenarios
- 🎯 40% increase in conversation completion rates
- 🎯 60% improvement in user satisfaction scores

**Technical Performance**
- 🎯 95% reduction in intent detection failures
- 🎯 80% reduction in JSON parsing errors
- 🎯 50% improvement in conversation flow reliability

**Engagement Metrics**
- 🎯 30% increase in average conversation length
- 🎯 70% increase in guided action usage
- 🎯 25% improvement in task completion rates

---

## Integration Points

### Critical Code Locations

1. **Main Integration Point**: `/app/api/chat/route.ts:523-526`
   ```typescript
   // TODO: [ROUTING_BACKBONE] [GUIDED_ACTIONS] - Critical integration point
   // Future: RoutingBackbone.enhanceStreamingWithGuidedActions(streamResponse, context)
   ```

2. **Frontend Integration**: `/components/ChatBox.tsx`
   - Add guided actions UI components
   - Handle user action selection
   - Update conversation flow state

3. **Context Management**: `/stores/chatList.ts`
   - Extend chat state with conversation context
   - Preserve guided actions across sessions
   - Implement conversation summarization

### API Enhancements

```typescript
// Enhanced chat API response format
interface ChatResponse {
  content: string;
  guidedActions?: GuidedAction[];
  conversationContext?: ConversationContext;
  flowState?: ConversationFlow;
  tokensUsed: number;
}
```

---

## Risk Mitigation

### Technical Risks

1. **Streaming Complexity**
   - Risk: Guided actions could break existing streaming
   - Mitigation: Incremental rollout with A/B testing
   - Fallback: Graceful degradation to current system

2. **Performance Impact**
   - Risk: Context analysis could slow response times
   - Mitigation: Async processing and caching
   - Monitoring: Real-time performance metrics

3. **User Experience Disruption**
   - Risk: Too many suggestions could overwhelm users
   - Mitigation: Progressive disclosure and user preferences
   - Testing: Extensive user testing and feedback loops

### Business Risks

1. **Development Timeline**
   - Risk: Complex implementation could delay launch
   - Mitigation: MVP approach with iterative enhancements
   - Fallback: Phase 1 delivers immediate value

2. **User Adoption**
   - Risk: Users might ignore guided actions
   - Mitigation: Contextual, high-value suggestions
   - Validation: Early user feedback and iteration

---

## Next Steps

### Immediate Actions (Week 1)

1. **Set up development branch** for routing backbone
2. **Implement basic guided actions framework**
3. **Enhance pre-routing system** with confidence bands
4. **Create conversation context engine**

### Quick Wins (Weeks 1-2)

1. **Fix existing JSON parsing errors** in streaming
2. **Improve circuit breaker logic** for better resilience
3. **Add basic guided actions** for deck analysis
4. **Implement conversation context tracking**

### Foundation Complete (Week 2)

1. **Working guided actions system** for deck codes
2. **Enhanced streaming** with contextual suggestions
3. **Improved error handling** and recovery
4. **Basic conversation flow management**

---

## Conclusion

The Routing Backbone and Guided Actions system will transform MetaBloom from a reactive AI assistant into a proactive conversation partner. By building on the existing sophisticated pre-routing system and addressing current pain points, we can create a user experience that rivals ChatGPT's contextual intelligence while maintaining the specialized domain expertise that makes MetaBloom valuable for Hearthstone players.

The phased approach ensures we can deliver value incrementally while maintaining system stability and user satisfaction throughout the development process.