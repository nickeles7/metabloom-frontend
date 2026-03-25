# MetaBloom Function Calling System Review

## Overview

MetaBloom implements a sophisticated function calling system that integrates with xAI's Grok API to provide AI-powered Hearthstone deck building capabilities. The system uses a two-stage streaming architecture with intent-based function exposure and real-time function execution.

## High-Level Architecture

```
User Message → Intent Detection → Streaming Method Selection → Function Execution → Response Streaming
     ↓              ↓                      ↓                        ↓                    ↓
API Route    →  detectUserIntent  →  Normal/Hidden Sequential  →  Tool Call Parser  →  Client UI
```

## Core Components

### 1. **API Entry Point** (`/app/api/chat/route.ts`)
- **Primary Route**: `POST /api/chat`
- **Responsibilities**: 
  - Message validation and preprocessing
  - Intent detection coordination
  - Streaming method selection
  - Function call orchestration
  - Response transformation

### 2. **Grok Client Layer** (`/lib/grok/client.ts`)
- **xAI API Interface**: Direct communication with `https://api.x.ai/v1`
- **Message Format**: Follows xAI's expected structure:
  ```typescript
  interface GrokMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: Array<{ type: 'text'; text: string }>;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string; };
    }>;
    tool_call_id?: string;
  }
  ```

### 3. **Function Registry** (`/lib/grok/functions.ts`)
- **Available Functions**: 14 total functions across different categories
- **Function Categories**:
  - **Intent Detection**: `detectUserIntent`
  - **Deck Operations**: `encodeDeck`, `decodeDeck`, `buildDeck`
  - **Card Search**: `exploreCardsAST`, `exploreCardsNatural`, `fetchCardMetadata`
  - **Legacy Functions**: `exploreCards`, `exploreDeckBuilding`

### 4. **Streaming Architecture**
Two distinct streaming implementations:

#### **Normal Streaming** (Trivial Intents)
- **Used For**: GREETING, GENERAL_CHAT, QUESTION intents
- **Function Exposure**: Limited to `CASUAL_FUNCTIONS` (encode/decode only)
- **Flow**: Direct streaming from Grok → Client

#### **Hidden Sequential Streaming** (Structured Intents)
- **Used For**: CARD_SEARCH, DECK_BUILDING intents
- **Function Exposure**: Full `STRUCTURED_FUNCTIONS` array
- **Flow**: Loading bubbles → Background processing → Result streaming

## Function Calling Flow

### Step 1: Intent Detection
```typescript
// Every message starts with intent classification
const intentResult = await handleDetectUserIntent({
  userMessage: message,
  conversationContext: chatHistory
});
```

### Step 2: Streaming Method Selection
```typescript
if (intentResult.intentType === 'CARD_SEARCH' || intentResult.intentType === 'DECK_BUILDING') {
  // Use Hidden Sequential Streaming
  streamResponse = createHiddenSequentialStream(...);
} else {
  // Use Normal Streaming  
  streamResponse = createNormalStream(...);
}
```

### Step 3: Function Exposure Control
```typescript
// Intent-based function exposure
const toolsToUse = (() => {
  switch (intentResult.intentType) {
    case 'GREETING':
    case 'GENERAL_CHAT':
      return CASUAL_FUNCTIONS;      // [encodeDeck, decodeDeck]
    case 'QUESTION':
      return NO_FUNCTIONS;          // []
    case 'CARD_SEARCH':
    case 'DECK_BUILDING':
      return STRUCTURED_FUNCTIONS;  // Full function array
    default:
      return CASUAL_FUNCTIONS;
  }
})();
```

### Step 4: Tool Call Detection & Execution
```typescript
// Stream parsing detects tool_calls in delta
if (delta.tool_calls) {
  isCollectingToolCalls = true;
  // Buffer tool calls until complete
  toolCallsBuffer.push(...delta.tool_calls);
}

// Execute when all arguments are valid JSON
if (allArgumentsValid) {
  await executeFunctionsAndStream(controller, toolCallsBuffer);
}
```

### Step 5: Function Execution
```typescript
// Direct function mapping and execution
switch (functionName) {
  case 'decodeDeck':
    result = await handleDecodeDeck(functionArgs);
    break;
  case 'exploreCardsAST':
    result = await handleExploreCardsAST(functionArgs);
    break;
  // ... other functions
}
```

## Function Definition Structure

All functions follow xAI's expected schema format:

```typescript
export const EXAMPLE_FUNCTION = {
  type: 'function',
  function: {
    name: 'functionName',
    description: 'Detailed description of what the function does',
    parameters: {
      type: 'object',
      properties: {
        paramName: {
          type: 'string',
          description: 'Parameter description',
          enum: ['option1', 'option2'] // Optional
        }
      },
      required: ['paramName']
    }
  }
};
```

## Key Differences from Standard xAI Implementation

### 1. **Intent-Based Function Exposure**
- **Standard xAI**: All functions exposed to every request
- **MetaBloom**: Dynamic function array based on detected intent
- **Benefit**: Reduces token usage and improves response accuracy

### 2. **Dual Streaming Architecture**
- **Standard xAI**: Single streaming approach
- **MetaBloom**: Two distinct streaming methods based on complexity
- **Benefit**: Better UX for simple vs complex requests

### 3. **Function Result Streaming**
- **Standard xAI**: Function results sent back to model for final response
- **MetaBloom**: Direct streaming of formatted function results to client
- **Benefit**: Faster response times, better user experience

### 4. **Tool Call Buffering**
- **Standard xAI**: Process tool calls as they arrive
- **MetaBloom**: Buffer incomplete tool calls until JSON arguments are valid
- **Benefit**: Prevents JSON parsing errors from partial chunks

## Message Flow Example

### User Input: "Show me some good Hunter cards"

1. **Intent Detection**: `CARD_SEARCH` (confidence: 0.95)
2. **Streaming Selection**: Hidden Sequential Streaming
3. **Function Exposure**: `STRUCTURED_FUNCTIONS` array
4. **Grok Response**: Calls `exploreCardsAST` with Hunter filter
5. **Function Execution**: AST query compiled and executed
6. **Result Streaming**: Formatted card results streamed to client
7. **Client Display**: Real-time card table rendering

## Error Handling & Classification

### Function Execution Errors
```typescript
const classifiedError = classifyError(technicalError, functionName);
result = {
  success: false,
  error: classifiedError.technicalDetails,
  userVisible: classifiedError.userVisible,
  userMessage: classifiedError.userMessage
};
```

### Stream Content Validation
- Technical errors filtered before reaching client
- User-friendly error messages generated
- Function results formatted for optimal display

## Performance Optimizations

1. **Session-Based Logging**: Reduced console verbosity
2. **Function Result Caching**: QueryMaster integration
3. **Token Optimization**: Intent-based function exposure
4. **Streaming Efficiency**: Direct result streaming without model round-trip

## Integration Points

### Client-Side Integration
- **StreamingContext**: React context for real-time updates
- **Chat Store**: Zustand store for message persistence
- **UI Components**: Specialized renderers for function results

### Database Integration
- **QueryMaster**: AST-based query compilation
- **Lambda Client**: AWS Lambda for database queries
- **Card Metadata**: Hearthstone card database integration

## Security Considerations

1. **Input Validation**: Message length and character restrictions
2. **Function Access Control**: Intent-based function exposure
3. **Error Information Leakage**: Technical details filtered from user responses
4. **Rate Limiting**: Session-based request tracking

## Technical Implementation Details

### Tool Call Processing Pipeline

```typescript
// 1. Stream chunk parsing
const grokChunk = JSON.parse(data);
if (grokChunk.choices[0].delta.tool_calls) {
  isCollectingToolCalls = true;
  toolCallsBuffer.push(...delta.tool_calls);
}

// 2. JSON validation check
const allArgumentsValid = toolCallsBuffer.every(call =>
  isCompleteJSON(call.function.arguments)
);

// 3. Function execution when ready
if (allArgumentsValid) {
  await executeFunctionsAndStream(controller, toolCallsBuffer);
}
```

### Function Handler Pattern

Each function follows a consistent handler pattern:

```typescript
export async function handleFunctionName(request: RequestType): Promise<ResponseType> {
  const logger = createServerLogger('function-name');
  const timer = new PerformanceTimer('function-name', 'handleFunctionName');

  try {
    // Input validation
    // Business logic execution
    // Response formatting
    return { success: true, data: result };
  } catch (error) {
    logger.error('FUNCTION_FAILED', error);
    return { success: false, error: error.message };
  }
}
```

### Streaming Response Format

MetaBloom uses a custom streaming format optimized for the chat interface:

```typescript
// Standard chunk format
const chatBoxData = {
  content: deltaContent,        // Incremental text content
  tokensUsed: 0,               // Token tracking
  isLoading?: boolean,         // Loading state indicator
  loadingType?: 'thinking'     // Loading animation type
};

// Server-Sent Events format
const formattedLine = `data: ${JSON.stringify(chatBoxData)}\n\n`;
```

## Comparison with xAI Standards

### Message Structure Compliance
✅ **Compliant**: Uses xAI's expected message format
✅ **Compliant**: Proper tool_calls structure with id, type, function
✅ **Compliant**: Correct role assignments (system, user, assistant, tool)

### Function Definition Compliance
✅ **Compliant**: OpenAPI-style parameter schemas
✅ **Compliant**: Required/optional parameter handling
✅ **Enhanced**: More detailed descriptions and examples

### Streaming Implementation
⚠️ **Modified**: Custom streaming format instead of standard SSE
⚠️ **Modified**: Direct function result streaming vs model processing
✅ **Compliant**: Proper chunk parsing and delta handling

### Tool Choice Implementation
✅ **Compliant**: Supports 'auto', 'none', 'required' tool_choice
🔧 **Enhanced**: Dynamic tool_choice based on intent detection
🔧 **Enhanced**: Intent-based function array exposure

## Potential Areas for Optimization

### 1. **Function Call Batching**
Current implementation processes functions sequentially. Could be optimized for parallel execution where appropriate.

### 2. **Response Caching**
Function results could be cached based on input parameters to reduce redundant database queries.

### 3. **Token Usage Optimization**
Further reduction in system prompt size and function descriptions could improve token efficiency.

### 4. **Error Recovery**
More sophisticated error recovery mechanisms for partial function failures.

## Debugging and Monitoring

### Logging Integration
- **Session-based tracking**: Each request gets unique session ID
- **Performance monitoring**: Function execution times tracked
- **Error classification**: Technical vs user-facing error separation

### Development Tools
- **Function schema validation**: Runtime parameter validation
- **Stream debugging**: Detailed chunk processing logs
- **Intent detection monitoring**: Classification accuracy tracking

---

*This documentation reflects the current implementation as of the review date. The system continues to evolve with new features and optimizations.*
