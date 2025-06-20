import { json } from "@remix-run/node";

/**
 * Health check endpoint for monitoring API status
 * GET /data/api/health
 */
export async function loader({ request }) {
  try {
    const { metrics } = await import("../api/delivery-estimate/metrics");
    const { rateLimiter } = await import("../api/delivery-estimate/utils");
    
    const healthStatus = metrics.getHealthStatus();
    const rateLimiterStats = rateLimiter.getStats();
    const apiStats = metrics.getStats();
    
    const response = {
      status: healthStatus.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // API Health
      api: {
        status: healthStatus.status,
        errorRate: healthStatus.errorRate,
        averageResponseTime: healthStatus.averageResponseTime,
        totalRequests: healthStatus.totalRequests,
        issues: healthStatus.issues
      },
      
      // Rate Limiting Stats
      rateLimiting: {
        activeIPs: rateLimiterStats.totalIPs,
        windowMs: rateLimiterStats.windowMs,
        maxRequestsPerWindow: rateLimiterStats.maxRequests,
        activeRequests: rateLimiterStats.activeRequests
      },
      
      // Performance Metrics
      performance: {
        averageResponseTime: apiStats.performance.averageDuration,
        maxResponseTime: apiStats.performance.maxDuration,
        minResponseTime: apiStats.performance.minDuration === Infinity ? 0 : apiStats.performance.minDuration
      },
      
      // Request Statistics
      requests: {
        total: apiStats.requests.total,
        success: apiStats.requests.success,
        errors: apiStats.requests.errors,
        successRate: apiStats.requests.total > 0 
          ? ((apiStats.requests.success / apiStats.requests.total) * 100).toFixed(2)
          : '0.00',
        byStatus: apiStats.requests.byStatus,
        topShops: Object.entries(apiStats.requests.byShop)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([shop, count]) => ({ shop, requests: count }))
      },
      
      // Recent Errors
      recentErrors: apiStats.errors.recent.slice(0, 5)
    };
    
    // Set appropriate HTTP status based on health
    const httpStatus = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    return json(response, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message
    }, { status: 503 });
  }
}

// Handle OPTIONS for CORS
export async function action({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  return json({ error: 'Method not allowed' }, { status: 405 });
}