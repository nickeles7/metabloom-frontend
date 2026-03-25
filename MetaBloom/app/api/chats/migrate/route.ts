/**
 * Chat Migration API Endpoint
 * REST API for migrating localStorage chat data to Firebase
 * Follows MetaBloom's established API patterns and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  migrateChatsToFirebase,
  getMigrationPreview,
  clearLocalStorageChats
} from '@/lib/firebase/chat-migration';
import {
  MigrationOptions,
  ChatServiceError,
  ChatErrorCode
} from '@/lib/firebase/chat-types';
import { createServerLogger } from '@/lib/logging/server';

const logger = createServerLogger('api/chats/migrate');

// ============================================================================
// GET - Get migration preview
// ============================================================================

export async function GET(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    logger.info('MIGRATION_PREVIEW_REQUEST', {
      requestId,
      userId: userId ? `${userId.substring(0, 8)}...` : null
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_PREVIEW_REQUEST', {
        requestId,
        error: 'User ID is required'
      });
      
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get migration preview
    const startTime = Date.now();
    const preview = getMigrationPreview();
    const executionTime = Date.now() - startTime;

    logger.info('MIGRATION_PREVIEW_SUCCESS', {
      requestId,
      totalChats: preview.totalChats,
      totalMessages: preview.totalMessages,
      executionTime
    });

    // Return preview without sensitive data
    const responseData = {
      totalChats: preview.totalChats,
      totalMessages: preview.totalMessages,
      chats: preview.chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        messageCount: chat.messages.length,
        hasMessages: chat.messages.length > 0,
        firstMessagePreview: chat.messages.length > 0 
          ? (typeof chat.messages[0].text === 'string' 
              ? chat.messages[0].text.substring(0, 100)
              : chat.messages[0].text.summary?.substring(0, 100) || 'Complex message')
          : null
      }))
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      requestId,
      executionTime
    });

  } catch (error) {
    logger.error('UNEXPECTED_PREVIEW_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
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
// POST - Execute migration
// ============================================================================

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await request.json();
    const { 
      userId, 
      batchSize, 
      preserveTimestamps, 
      skipExisting,
      clearAfterMigration 
    } = body;

    logger.info('MIGRATION_START_REQUEST', {
      requestId,
      userId: userId ? `${userId.substring(0, 8)}...` : null,
      batchSize,
      preserveTimestamps,
      skipExisting,
      clearAfterMigration
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_MIGRATION_REQUEST', {
        requestId,
        error: 'User ID is required'
      });
      
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate batch size
    if (batchSize && (batchSize < 1 || batchSize > 50)) {
      logger.warn('INVALID_BATCH_SIZE', {
        requestId,
        batchSize,
        error: 'Batch size must be between 1 and 50'
      });
      
      return NextResponse.json(
        { error: 'Batch size must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Build migration options
    const migrationOptions: MigrationOptions = {
      userId,
      batchSize: batchSize || 10,
      preserveTimestamps: preserveTimestamps !== false,
      skipExisting: skipExisting !== false
    };

    // Execute migration
    const startTime = Date.now();
    
    logger.info('MIGRATION_EXECUTION_START', {
      requestId,
      options: migrationOptions
    });

    const progress = await migrateChatsToFirebase(migrationOptions);
    const executionTime = Date.now() - startTime;

    // Clear localStorage if requested and migration was successful
    if (clearAfterMigration && progress.errors.length === 0) {
      try {
        clearLocalStorageChats();
        logger.info('MIGRATION_CLEANUP_SUCCESS', {
          requestId,
          message: 'localStorage cleared after successful migration'
        });
      } catch (error) {
        logger.warn('MIGRATION_CLEANUP_ERROR', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        progress.errors.push('Failed to clear localStorage after migration');
      }
    }

    const isSuccess = progress.errors.length === 0;
    const statusCode = isSuccess ? 200 : 207; // 207 = Multi-Status (partial success)

    logger.info('MIGRATION_EXECUTION_COMPLETE', {
      requestId,
      success: isSuccess,
      processedChats: progress.processedChats,
      totalChats: progress.totalChats,
      processedMessages: progress.processedMessages,
      totalMessages: progress.totalMessages,
      errorCount: progress.errors.length,
      executionTime
    });

    return NextResponse.json({
      success: isSuccess,
      data: {
        ...progress,
        duration: progress.completedAt ? progress.completedAt - progress.startedAt : null
      },
      requestId,
      executionTime
    }, { status: statusCode });

  } catch (error) {
    logger.error('UNEXPECTED_MIGRATION_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
      requestId
    });

    // Handle specific migration errors
    if (error instanceof ChatServiceError && error.code === ChatErrorCode.MIGRATION_ERROR) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details,
          requestId 
        },
        { status: 422 }
      );
    }

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
// DELETE - Clear localStorage (cleanup operation)
// ============================================================================

export async function DELETE(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const confirm = searchParams.get('confirm');

    logger.info('MIGRATION_CLEANUP_REQUEST', {
      requestId,
      userId: userId ? `${userId.substring(0, 8)}...` : null,
      confirm
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_CLEANUP_REQUEST', {
        requestId,
        error: 'User ID is required'
      });
      
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Require explicit confirmation
    if (confirm !== 'true') {
      logger.warn('CLEANUP_NOT_CONFIRMED', {
        requestId,
        error: 'Confirmation required to clear localStorage'
      });
      
      return NextResponse.json(
        { 
          error: 'Confirmation required',
          message: 'Add ?confirm=true to clear localStorage chat data'
        },
        { status: 400 }
      );
    }

    // Clear localStorage
    const startTime = Date.now();
    clearLocalStorageChats();
    const executionTime = Date.now() - startTime;

    logger.info('MIGRATION_CLEANUP_SUCCESS', {
      requestId,
      executionTime
    });

    return NextResponse.json({
      success: true,
      message: 'localStorage chat data cleared successfully',
      requestId,
      executionTime
    });

  } catch (error) {
    logger.error('UNEXPECTED_CLEANUP_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
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
// OPTIONS - CORS preflight support
// ============================================================================

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
