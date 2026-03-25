/**
 * Chat Synchronization Status API
 * REST API for sync status monitoring and control
 * Follows MetaBloom's established API patterns and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSyncStatus,
  forceSyncProcess,
  clearSyncQueue
} from '@/lib/firebase/chat-sync';
import { createServerLogger } from '@/lib/logging/server';

const logger = createServerLogger('api/chats/sync');

// ============================================================================
// GET - Get current synchronization status
// ============================================================================

export async function GET(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    logger.info('SYNC_STATUS_REQUEST', {
      requestId,
      userId: userId ? `${userId.substring(0, 8)}...` : null
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_SYNC_REQUEST', {
        requestId,
        error: 'User ID is required'
      });
      
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get sync status
    const startTime = Date.now();
    const syncStatus = getSyncStatus();
    const executionTime = Date.now() - startTime;

    logger.info('SYNC_STATUS_SUCCESS', {
      requestId,
      status: syncStatus.status,
      pendingOperations: syncStatus.pendingOperations,
      hasErrors: syncStatus.errors && syncStatus.errors.length > 0,
      executionTime
    });

    // Convert Firestore Timestamp to ISO string if present
    const responseData = {
      ...syncStatus,
      lastSyncAt: syncStatus.lastSyncAt?.toDate().toISOString() || null
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      requestId,
      executionTime
    });

  } catch (error) {
    logger.error('UNEXPECTED_SYNC_STATUS_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
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
// POST - Force synchronization process or clear queue
// ============================================================================

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await request.json();
    const { userId, action } = body;

    logger.info('SYNC_ACTION_REQUEST', {
      requestId,
      userId: userId ? `${userId.substring(0, 8)}...` : null,
      action
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_SYNC_ACTION_REQUEST', {
        requestId,
        error: 'User ID is required'
      });
      
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!action) {
      logger.warn('INVALID_ACTION', {
        requestId,
        error: 'Action is required'
      });
      
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    let result: any = {};

    switch (action) {
      case 'force_sync':
        logger.info('FORCE_SYNC_INITIATED', {
          requestId,
          userId: `${userId.substring(0, 8)}...`
        });
        
        await forceSyncProcess();
        result = {
          action: 'force_sync',
          message: 'Synchronization process initiated'
        };
        break;

      case 'clear_queue':
        logger.warn('CLEAR_QUEUE_INITIATED', {
          requestId,
          userId: `${userId.substring(0, 8)}...`,
          warning: 'This will clear all pending sync operations'
        });
        
        clearSyncQueue();
        result = {
          action: 'clear_queue',
          message: 'Sync queue cleared successfully'
        };
        break;

      case 'get_status':
        const syncStatus = getSyncStatus();
        result = {
          action: 'get_status',
          status: {
            ...syncStatus,
            lastSyncAt: syncStatus.lastSyncAt?.toDate().toISOString() || null
          }
        };
        break;

      default:
        logger.warn('UNKNOWN_SYNC_ACTION', {
          requestId,
          action,
          availableActions: ['force_sync', 'clear_queue', 'get_status']
        });
        
        return NextResponse.json(
          { 
            error: 'Unknown action',
            availableActions: ['force_sync', 'clear_queue', 'get_status']
          },
          { status: 400 }
        );
    }

    const executionTime = Date.now() - startTime;

    logger.info('SYNC_ACTION_SUCCESS', {
      requestId,
      action,
      executionTime
    });

    return NextResponse.json({
      success: true,
      data: result,
      requestId,
      executionTime
    });

  } catch (error) {
    logger.error('UNEXPECTED_SYNC_ACTION_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
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
// PUT - Update sync configuration (future enhancement)
// ============================================================================

export async function PUT(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await request.json();
    const { userId, config } = body;

    logger.info('SYNC_CONFIG_REQUEST', {
      requestId,
      userId: userId ? `${userId.substring(0, 8)}...` : null,
      config
    });

    // Validate required parameters
    if (!userId) {
      logger.warn('INVALID_CONFIG_REQUEST', {
        requestId,
        error: 'User ID is required'
      });
      
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // For now, return not implemented
    // This endpoint can be extended in the future for sync configuration
    logger.info('SYNC_CONFIG_NOT_IMPLEMENTED', {
      requestId,
      message: 'Sync configuration endpoint not yet implemented'
    });

    return NextResponse.json({
      success: false,
      error: 'Sync configuration not yet implemented',
      message: 'This endpoint is reserved for future sync configuration features',
      requestId
    }, { status: 501 });

  } catch (error) {
    logger.error('UNEXPECTED_CONFIG_ERROR', error instanceof Error ? error : new Error('Unknown error'), {
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
