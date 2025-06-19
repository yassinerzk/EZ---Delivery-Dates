/**
 * Metrics utility for delivery estimate API
 * Tracks performance, usage, and error statistics
 */

class Metrics {
  constructor() {
    this.stats = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byStatus: {},
        byShop: {},
        byEndpoint: {}
      },
      performance: {
        totalDuration: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: Infinity
      },
      errors: {
        byType: {},
        recent: []
      }
    };
  }

  recordRequest({ endpoint, method, status, duration, shopId, error }) {
    const timestamp = new Date().toISOString();
    
    // Update request counts
    this.stats.requests.total++;
    
    if (status >= 200 && status < 300) {
      this.stats.requests.success++;
    } else {
      this.stats.requests.errors++;
    }
    
    // Track by status code
    this.stats.requests.byStatus[status] = (this.stats.requests.byStatus[status] || 0) + 1;
    
    // Track by shop
    if (shopId) {
      this.stats.requests.byShop[shopId] = (this.stats.requests.byShop[shopId] || 0) + 1;
    }
    
    // Track by endpoint
    const endpointKey = `${method} ${endpoint}`;
    this.stats.requests.byEndpoint[endpointKey] = (this.stats.requests.byEndpoint[endpointKey] || 0) + 1;
    
    // Update performance metrics
    if (duration) {
      this.stats.performance.totalDuration += duration;
      this.stats.performance.averageDuration = this.stats.performance.totalDuration / this.stats.requests.total;
      this.stats.performance.maxDuration = Math.max(this.stats.performance.maxDuration, duration);
      this.stats.performance.minDuration = Math.min(this.stats.performance.minDuration, duration);
    }
    
    // Track errors
    if (error) {
      const errorType = error.split(':')[0] || 'Unknown';
      this.stats.errors.byType[errorType] = (this.stats.errors.byType[errorType] || 0) + 1;
      
      // Keep recent errors (last 10)
      this.stats.errors.recent.unshift({
        timestamp,
        error,
        endpoint,
        method,
        status,
        shopId
      });
      
      if (this.stats.errors.recent.length > 10) {
        this.stats.errors.recent.pop();
      }
    }
    
    // Log metrics periodically (every 100 requests)
    if (this.stats.requests.total % 100 === 0) {
      this.logSummary();
    }
  }

  getStats() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  getHealthStatus() {
    const errorRate = this.stats.requests.total > 0 
      ? (this.stats.requests.errors / this.stats.requests.total) * 100 
      : 0;
    
    const avgDuration = this.stats.performance.averageDuration;
    
    let status = 'healthy';
    const issues = [];
    
    if (errorRate > 10) {
      status = 'unhealthy';
      issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
    } else if (errorRate > 5) {
      status = 'degraded';
      issues.push(`Elevated error rate: ${errorRate.toFixed(2)}%`);
    }
    
    if (avgDuration > 5000) {
      status = status === 'healthy' ? 'degraded' : 'unhealthy';
      issues.push(`High average response time: ${avgDuration.toFixed(0)}ms`);
    }
    
    return {
      status,
      errorRate: errorRate.toFixed(2),
      averageResponseTime: avgDuration.toFixed(0),
      totalRequests: this.stats.requests.total,
      issues,
      timestamp: new Date().toISOString()
    };
  }

  logSummary() {
    const summary = {
      totalRequests: this.stats.requests.total,
      successRate: ((this.stats.requests.success / this.stats.requests.total) * 100).toFixed(2),
      averageDuration: this.stats.performance.averageDuration.toFixed(0),
      topShops: Object.entries(this.stats.requests.byShop)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      recentErrors: this.stats.errors.recent.slice(0, 3)
    };
    
    console.log('📊 Delivery Estimate API Metrics Summary:', JSON.stringify(summary, null, 2));
  }

  reset() {
    this.stats = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byStatus: {},
        byShop: {},
        byEndpoint: {}
      },
      performance: {
        totalDuration: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: Infinity
      },
      errors: {
        byType: {},
        recent: []
      }
    };
  }
}

export const metrics = new Metrics();