/**
 * Chat List API Endpoints
 * REST API for chat management operations
 * Follows MetaBloom's established API patterns and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase/firestore';
import {
  getChatList,
  createChat
} from '@/lib/firebase/chat-service';
import {
  ChatQueryParams,
  CreateChatParams,
  ChatServiceError,
  ChatErrorCode
} from '@/lib/firebase/chat-types';
import { createServerLogger } from '@/lib/logging/server';
import { isEmailVerified } from '@/lib/subscription';

const logger = createServerLogger('api/chats');

// ============================================================================
// GET - Retrieve chat list with pagination
// ============================================================================

export async function GET(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit');
    const startAfter = searchParams.get('startAfter');
    const includeArchived = searchParams.get('includeArchived');
    const orderBy = searchParams.get('orderBy');
    const orderDirection = searchParams.get('orderDirection');

    logger.info('CHAT_LIST_REQUEST', {
      requestId,
      userId: userId ? `${userId.substring(0, 8)}...` : null,
      limit,
      includeArchived,
      orderBy,
      orderDirection
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_REQUEST', {
        requestId,
        error: 'User ID is required',
        provided: { userId }
      });
      
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build query parameters
    const queryParams: ChatQueryParams = {
      userId,
      limit: limit ? parseInt(limit, 10) : 20,
      includeArchived: includeArchived === 'true',
      orderBy: (orderBy as 'createdAt' | 'lastMessageAt') || 'lastMessageAt',
      orderDirection: (orderDirection as 'asc' | 'desc') || 'desc'
    };

    // Handle startAfter timestamp
    if (startAfter) {
      try {
        const timestamp = parseInt(startAfter, 10);
        queryParams.startAfter = Timestamp.fromMillis(timestamp);
      } catch (error) {
        logger.warn('INVALID_TIMESTAMP', {
          requestId,
          startAfter,
          error: 'Invalid timestamp format'
        });
        
        return NextResponse.json(
          { error: 'Invalid startAfter timestamp format' },
          { status: 400 }
        );
      }
    }

    // Validate limit
    if (queryParams.limit && (queryParams.limit < 1 || queryParams.limit > 100)) {
      logger.warn('INVALID_LIMIT', {
        requestId,
        limit: queryParams.limit,
        error: 'Limit must be between 1 and 100'
      });
      
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Execute chat list query
    const startTime = Date.now();
    const result = await getChatList(queryParams);
    const executionTime = Date.now() - startTime;

    if (!result.success) {
      logger.error('CHAT_LIST_ERROR', result.error || 'Unknown error', {
        requestId,
        code: result.code,
        executionTime
      });

      // Map service errors to HTTP status codes
      const statusCode = result.code === ChatErrorCode.UNAUTHORIZED ? 403 :
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

    logger.info('CHAT_LIST_SUCCESS', {
      requestId,
      chatCount: result.data?.chats.length || 0,
      hasMore: result.data?.hasMore || false,
      executionTime
    });

    // Convert Firestore Timestamps to ISO strings for JSON response
    const responseData = {
      ...result.data,
      chats: result.data?.chats.map(chat => ({
        ...chat,
        createdAt: chat.createdAt.toDate().toISOString(),
        updatedAt: chat.updatedAt.toDate().toISOString(),
        lastMessageAt: chat.lastMessageAt.toDate().toISOString(),
        lastMessage: {
          ...chat.lastMessage,
          timestamp: chat.lastMessage.timestamp.toDate().toISOString()
        }
      })) || [],
      lastDocument: result.data?.lastDocument?.toMillis()
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      requestId,
      executionTime
    });

  } catch (error) {
    logger.error('UNEXPECTED_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
      requestId
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
// POST - Create new chat
// ============================================================================

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await request.json();
    const { userId, title, initialMessage, deviceOrigin } = body;

    logger.info('CHAT_CREATE_REQUEST', {
      requestId,
      userId: userId ? `${userId.substring(0, 8)}...` : null,
      title: title ? `${title.substring(0, 50)}...` : null,
      hasInitialMessage: !!initialMessage,
      deviceOrigin
    });

    // Validate required parameters
    if (!userId || !title) {
      logger.warn('INVALID_CREATE_REQUEST', {
        requestId,
        error: 'User ID and title are required',
        provided: { userId: !!userId, title: !!title }
      });

      return NextResponse.json(
        { error: 'User ID and title are required' },
        { status: 400 }
      );
    }

    // Check email verification status
    const emailVerified = await isEmailVerified(userId);
    if (!emailVerified) {
      logger.warn('EMAIL_NOT_VERIFIED', {
        requestId,
        userId: userId.substring(0, 8) + '...',
        error: 'Email verification required'
      });

      return NextResponse.json(
        {
          error: 'Email verification required. Please verify your email address before creating chats.',
          code: 'EMAIL_NOT_VERIFIED'
        },
        { status: 403 }
      );
    }

    // Validate title length
    if (title.length > 200) {
      logger.warn('INVALID_TITLE_LENGTH', {
        requestId,
        titleLength: title.length,
        error: 'Title cannot exceed 200 characters'
      });
      
      return NextResponse.json(
        { error: 'Title cannot exceed 200 characters' },
        { status: 400 }
      );
    }

    // Build create parameters
    const createParams: CreateChatParams = {
      userId,
      title: title.trim(),
      deviceOrigin
    };

    // Add initial message if provided
    if (initialMessage) {
      if (!initialMessage.text || typeof initialMessage.isUser !== 'boolean') {
        logger.warn('INVALID_INITIAL_MESSAGE', {
          requestId,
          error: 'Initial message must have text and isUser fields',
          provided: initialMessage
        });
        
        return NextResponse.json(
          { error: 'Initial message must have text and isUser fields' },
          { status: 400 }
        );
      }
      
      createParams.initialMessage = {
        text: initialMessage.text,
        isUser: initialMessage.isUser,
        timestamp: new Date().toISOString(),
        isStreaming: initialMessage.isStreaming || false
      };
    }

    // Execute chat creation
    const startTime = Date.now();
    const result = await createChat(createParams);
    const executionTime = Date.now() - startTime;

    if (!result.success) {
      logger.error('CHAT_CREATE_ERROR', result.error || 'Unknown error', {
        requestId,
        code: result.code,
        executionTime
      });

      // Map service errors to HTTP status codes
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

    logger.info('CHAT_CREATE_SUCCESS', {
      requestId,
      chatId: result.data?.id,
      executionTime
    });

    // Convert Firestore Timestamps to ISO strings for JSON response
    const responseData = result.data ? {
      ...result.data,
      createdAt: result.data.createdAt.toDate().toISOString(),
      updatedAt: result.data.updatedAt.toDate().toISOString(),
      lastMessageAt: result.data.lastMessageAt.toDate().toISOString(),
      lastMessage: {
        ...result.data.lastMessage,
        timestamp: result.data.lastMessage.timestamp.toDate().toISOString()
      }
    } : null;

    return NextResponse.json({
      success: true,
      data: responseData,
      requestId,
      executionTime
    }, { status: 201 });

  } catch (error) {
    logger.error('UNEXPECTED_CREATE_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
      requestId
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
