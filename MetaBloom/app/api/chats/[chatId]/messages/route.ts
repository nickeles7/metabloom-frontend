/**
 * Chat Messages API Endpoints
 * REST API for message operations within chats
 * Follows MetaBloom's established API patterns and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getMessages,
  createMessage,
  createMessagesBatch
} from '@/lib/firebase/chat-service';
import {
  MessageQueryParams,
  CreateMessageParams,
  ChatServiceError,
  ChatErrorCode
} from '@/lib/firebase/chat-types';
import { createServerLogger } from '@/lib/logging/server';
import { isEmailVerified } from '@/lib/subscription';

const logger = createServerLogger('api/chats/[chatId]/messages');

// ============================================================================
// GET - Retrieve messages for a chat with pagination
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { chatId } = await params;
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit');
    const startAfter = searchParams.get('startAfter');
    const orderDirection = searchParams.get('orderDirection');

    logger.info('MESSAGES_GET_REQUEST', {
      requestId,
      chatId,
      userId: userId ? `${userId.substring(0, 8)}...` : null,
      limit,
      startAfter,
      orderDirection
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_REQUEST', {
        requestId,
        chatId,
        error: 'User ID is required'
      });
      
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!chatId) {
      logger.warn('INVALID_CHAT_ID', {
        requestId,
        error: 'Chat ID is required'
      });
      
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Build query parameters
    const queryParams: MessageQueryParams = {
      userId,
      chatId,
      limit: limit ? parseInt(limit, 10) : 50,
      orderDirection: (orderDirection as 'asc' | 'desc') || 'asc'
    };

    // Handle startAfter order
    if (startAfter) {
      try {
        queryParams.startAfter = parseInt(startAfter, 10);
      } catch (error) {
        logger.warn('INVALID_START_AFTER', {
          requestId,
          chatId,
          startAfter,
          error: 'Invalid startAfter order format'
        });
        
        return NextResponse.json(
          { error: 'Invalid startAfter order format' },
          { status: 400 }
        );
      }
    }

    // Validate limit
    if (queryParams.limit && (queryParams.limit < 1 || queryParams.limit > 200)) {
      logger.warn('INVALID_LIMIT', {
        requestId,
        chatId,
        limit: queryParams.limit,
        error: 'Limit must be between 1 and 200'
      });
      
      return NextResponse.json(
        { error: 'Limit must be between 1 and 200' },
        { status: 400 }
      );
    }

    // Execute messages query
    const startTime = Date.now();
    const result = await getMessages(queryParams);
    const executionTime = Date.now() - startTime;

    if (!result.success) {
      logger.error('MESSAGES_GET_ERROR', result.error || 'Unknown error', {
        requestId,
        chatId,
        code: result.code,
        executionTime
      });

      // Map service errors to HTTP status codes
      const statusCode = result.code === ChatErrorCode.UNAUTHORIZED ? 403 :
                        result.code === ChatErrorCode.NOT_FOUND ? 404 :
                        result.code === ChatErrorCode.INVALID_INPUT ? 400 :
                        result.code === ChatErrorCode.NETWORK_ERROR ? 503 :
                        500;

      return NextResponse.json(
        { 
          error: result.error,
          code: result.code 
        },
        { status: statusCode }
      );
    }

    logger.info('MESSAGES_GET_SUCCESS', {
      requestId,
      chatId,
      messageCount: result.data?.messages.length || 0,
      hasMore: result.data?.hasMore || false,
      executionTime
    });

    // Convert Firestore Timestamps to ISO strings for JSON response
    const responseData = {
      ...result.data,
      messages: result.data?.messages.map(message => ({
        ...message,
        timestamp: message.timestamp.toDate().toISOString(),
        createdAt: message.createdAt.toDate().toISOString(),
        updatedAt: message.updatedAt.toDate().toISOString()
      })) || []
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      requestId,
      executionTime
    });

  } catch (error) {
    logger.error('UNEXPECTED_GET_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
      requestId,
      chatId
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        requestId 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create new message or batch of messages
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { chatId } = await params;
  
  try {
    const body = await request.json();
    const { userId, message, messages, deviceOrigin } = body;

    logger.info('MESSAGE_CREATE_REQUEST', {
      requestId,
      chatId,
      userId: userId ? `${userId.substring(0, 8)}...` : null,
      isBatch: !!messages,
      messageCount: messages ? messages.length : 1,
      deviceOrigin
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_CREATE_REQUEST', {
        requestId,
        chatId,
        error: 'User ID is required'
      });

      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check email verification status
    const emailVerified = await isEmailVerified(userId);
    if (!emailVerified) {
      logger.warn('EMAIL_NOT_VERIFIED', {
        requestId,
        chatId,
        userId: userId.substring(0, 8) + '...',
        error: 'Email verification required'
      });

      return NextResponse.json(
        {
          error: 'Email verification required. Please verify your email address before sending messages.',
          code: 'EMAIL_NOT_VERIFIED'
        },
        { status: 403 }
      );
    }

    if (!chatId) {
      logger.warn('INVALID_CHAT_ID', {
        requestId,
        error: 'Chat ID is required'
      });
      
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Handle batch message creation
    if (messages && Array.isArray(messages)) {
      if (messages.length === 0) {
        logger.warn('EMPTY_BATCH', {
          requestId,
          chatId,
          error: 'Messages array cannot be empty'
        });
        
        return NextResponse.json(
          { error: 'Messages array cannot be empty' },
          { status: 400 }
        );
      }

      if (messages.length > 100) {
        logger.warn('BATCH_TOO_LARGE', {
          requestId,
          chatId,
          messageCount: messages.length,
          error: 'Batch cannot exceed 100 messages'
        });
        
        return NextResponse.json(
          { error: 'Batch cannot exceed 100 messages' },
          { status: 400 }
        );
      }

      // Validate each message in batch
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!msg.text || typeof msg.isUser !== 'boolean') {
          logger.warn('INVALID_BATCH_MESSAGE', {
            requestId,
            chatId,
            messageIndex: i,
            error: 'Each message must have text and isUser fields'
          });
          
          return NextResponse.json(
            { error: `Message at index ${i} must have text and isUser fields` },
            { status: 400 }
          );
        }
      }

      // Execute batch creation
      const startTime = Date.now();
      const result = await createMessagesBatch(userId, chatId, messages.map(msg => ({
        text: msg.text,
        isUser: msg.isUser,
        isStreaming: msg.isStreaming || false,
        deviceOrigin: msg.deviceOrigin || deviceOrigin
      })));
      const executionTime = Date.now() - startTime;

      if (!result.success) {
        logger.error('BATCH_CREATE_ERROR', result.error || 'Unknown error', {
          requestId,
          chatId,
          code: result.code,
          executionTime
        });

        const statusCode = result.code === ChatErrorCode.UNAUTHORIZED ? 403 :
                          result.code === ChatErrorCode.INVALID_INPUT ? 400 :
                          result.code === ChatErrorCode.QUOTA_EXCEEDED ? 429 :
                          result.code === ChatErrorCode.NETWORK_ERROR ? 503 :
                          500;

        return NextResponse.json(
          { 
            error: result.error,
            code: result.code 
          },
          { status: statusCode }
        );
      }

      logger.info('BATCH_CREATE_SUCCESS', {
        requestId,
        chatId,
        messageCount: result.data?.length || 0,
        executionTime
      });

      // Convert Firestore Timestamps to ISO strings
      const responseData = result.data?.map(message => ({
        ...message,
        timestamp: message.timestamp.toDate().toISOString(),
        createdAt: message.createdAt.toDate().toISOString(),
        updatedAt: message.updatedAt.toDate().toISOString()
      })) || [];

      return NextResponse.json({
        success: true,
        data: responseData,
        requestId,
        executionTime
      }, { status: 201 });
    }

    // Handle single message creation
    if (!message || !message.text || typeof message.isUser !== 'boolean') {
      logger.warn('INVALID_SINGLE_MESSAGE', {
        requestId,
        chatId,
        error: 'Message must have text and isUser fields'
      });
      
      return NextResponse.json(
        { error: 'Message must have text and isUser fields' },
        { status: 400 }
      );
    }

    // Build create parameters
    const createParams: CreateMessageParams = {
      userId,
      chatId,
      text: message.text,
      isUser: message.isUser,
      isStreaming: message.isStreaming || false,
      deviceOrigin: message.deviceOrigin || deviceOrigin
    };

    // Execute single message creation
    const startTime = Date.now();
    const result = await createMessage(createParams);
    const executionTime = Date.now() - startTime;

    if (!result.success) {
      logger.error('MESSAGE_CREATE_ERROR', result.error || 'Unknown error', {
        requestId,
        chatId,
        code: result.code,
        executionTime
      });

      const statusCode = result.code === ChatErrorCode.UNAUTHORIZED ? 403 :
                        result.code === ChatErrorCode.INVALID_INPUT ? 400 :
                        result.code === ChatErrorCode.QUOTA_EXCEEDED ? 429 :
                        result.code === ChatErrorCode.NETWORK_ERROR ? 503 :
                        500;

      return NextResponse.json(
        { 
          error: result.error,
          code: result.code 
        },
        { status: statusCode }
      );
    }

    logger.info('MESSAGE_CREATE_SUCCESS', {
      requestId,
      chatId,
      messageId: result.data?.id,
      executionTime
    });

    // Convert Firestore Timestamps to ISO strings
    const responseData = result.data ? {
      ...result.data,
      timestamp: result.data.timestamp.toDate().toISOString(),
      createdAt: result.data.createdAt.toDate().toISOString(),
      updatedAt: result.data.updatedAt.toDate().toISOString()
    } : null;

    return NextResponse.json({
      success: true,
      data: responseData,
      requestId,
      executionTime
    }, { status: 201 });

  } catch (error) {
    logger.error('UNEXPECTED_CREATE_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
      requestId,
      chatId
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        requestId 
      },
      { status: 500 }
    );
  }
}
