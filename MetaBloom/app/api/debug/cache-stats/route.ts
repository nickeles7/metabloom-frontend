import { NextRequest } from 'next/server';
import { getCacheStats } from '@/lib/cache/session-cache';
import { createServerLogger } from '@/lib/logging/server';

/**
 * Debug endpoint for session cache statistics
 * GET /api/debug/cache-stats
 */
export async function GET(req: NextRequest) {
  const logger = createServerLogger('cache-stats-debug');
  
  try {
    logger.info('CACHE_STATS_REQUESTED', {
      userAgent: req.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    const stats = getCacheStats();
    
    // Add some computed metrics
    const computedStats = {
      ...stats,
      cacheHitRate: stats.totalSessions > 0 ? 
        Math.round((stats.sessionsWithSystemPrompt / stats.totalSessions) * 100) : 0,
      memoryEstimateKB: Math.round(stats.averagePromptLength * stats.sessionsWithSystemPrompt * 2 / 1024),
      oldestCacheAgeMinutes: Math.round(stats.oldestCacheAge / (1000 * 60)),
      newestCacheAgeMinutes: Math.round(stats.newestCacheAge / (1000 * 60))
    };

    logger.info('CACHE_STATS_RETURNED', {
      totalSessions: stats.totalSessions,
      sessionsWithPrompt: stats.sessionsWithSystemPrompt,
      memoryEstimateKB: computedStats.memoryEstimateKB
    });

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      cacheStats: computedStats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('CACHE_STATS_ERROR', error instanceof Error ? error : new Error(String(error)));
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to retrieve cache statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
