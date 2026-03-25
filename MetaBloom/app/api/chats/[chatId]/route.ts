/**
 * Individual Chat Management API
 * REST API for single chat operations (get, update, delete)
 * Follows MetaBloom's established API patterns and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getChat,
  updateChat,
  deleteChat
} from '@/lib/firebase/chat-service';
import {
  ChatServiceError,
  ChatErrorCode,
  FirebaseChatDocument
} from '@/lib/firebase/chat-types';
import { createServerLogger } from '@/lib/logging/server';

const logger = createServerLogger('api/chats/[chatId]');

// ============================================================================
// GET - Retrieve specific chat
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

    logger.info('CHAT_GET_REQUEST', {
      requestId,
      chatId,
      userId: userId ? `${userId.substring(0, 8)}...` : null
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_GET_REQUEST', {
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

    // Execute chat retrieval
    const startTime = Date.now();
    const result = await getChat(userId, chatId);
    const executionTime = Date.now() - startTime;

    if (!result.success) {
      logger.error('CHAT_GET_ERROR', result.error || 'Unknown error', {
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

    logger.info('CHAT_GET_SUCCESS', {
      requestId,
      chatId,
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
// PUT - Update chat
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { chatId } = await params;
  
  try {
    const body = await request.json();
    const { userId, updates } = body;

    logger.info('CHAT_UPDATE_REQUEST', {
      requestId,
      chatId,
      userId: userId ? `${userId.substring(0, 8)}...` : null,
      updateFields: updates ? Object.keys(updates) : []
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_UPDATE_REQUEST', {
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

    if (!updates || typeof updates !== 'object') {
      logger.warn('INVALID_UPDATES', {
        requestId,
        chatId,
        error: 'Updates object is required'
      });
      
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      );
    }

    // Validate allowed update fields
    const allowedFields = [
      'title', 'isArchived', 'syncStatus', 'metadata', 'lastMessage'
    ];
    const updateFields = Object.keys(updates);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      logger.warn('INVALID_UPDATE_FIELDS', {
        requestId,
        chatId,
        invalidFields,
        allowedFields
      });
      
      return NextResponse.json(
        { 
          error: `Invalid update fields: ${invalidFields.join(', ')}`,
          allowedFields 
        },
        { status: 400 }
      );
    }

    // Validate title length if provided
    if (updates.title && updates.title.length > 200) {
      logger.warn('INVALID_TITLE_LENGTH', {
        requestId,
        chatId,
        titleLength: updates.title.length
      });
      
      return NextResponse.json(
        { error: 'Title cannot exceed 200 characters' },
        { status: 400 }
      );
    }

    // Execute chat update
    const startTime = Date.now();
    const result = await updateChat(userId, chatId, updates);
    const executionTime = Date.now() - startTime;

    if (!result.success) {
      logger.error('CHAT_UPDATE_ERROR', result.error || 'Unknown error', {
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

    logger.info('CHAT_UPDATE_SUCCESS', {
      requestId,
      chatId,
      updateFields,
      executionTime
    });

    return NextResponse.json({
      success: true,
      message: 'Chat updated successfully',
      requestId,
      executionTime
    });

  } catch (error) {
    logger.error('UNEXPECTED_UPDATE_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
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
// DELETE - Delete chat and all messages
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { chatId } = await params;
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    logger.info('CHAT_DELETE_REQUEST', {
      requestId,
      chatId,
      userId: userId ? `${userId.substring(0, 8)}...` : null
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_DELETE_REQUEST', {
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

    // Execute chat deletion
    const startTime = Date.now();
    const result = await deleteChat(userId, chatId);
    const executionTime = Date.now() - startTime;

    if (!result.success) {
      logger.error('CHAT_DELETE_ERROR', result.error || 'Unknown error', {
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

    logger.info('CHAT_DELETE_SUCCESS', {
      requestId,
      chatId,
      executionTime
    });

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully',
      requestId,
      executionTime
    });

  } catch (error) {
    logger.error('UNEXPECTED_DELETE_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
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
