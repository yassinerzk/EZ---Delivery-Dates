/**
 * Default values for delivery estimates
 */
export const DEFAULT_COUNTRY = 'US';
export const DEFAULT_ESTIMATE = '5-7 business days';
export const DEFAULT_RULE_NAME = 'Standard Shipping';

/**
 * Validates the incoming request parameters from app proxy
 * @param {Request} request - The incoming request
 * @param {Object} session - The authenticated session
 * @returns {Object} - Extracted and validated parameters or error
 */
export function validateRequest(request, session) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Extract parameters from query string (app proxy format)
    const productId = searchParams.get('productId') || searchParams.get('product_id');
    const country = searchParams.get('country') || DEFAULT_COUNTRY;
    const tags = searchParams.get('tags');
    const variantId = searchParams.get('variantId') || searchParams.get('variant_id');
    const shop = session?.shop || searchParams.get('shop');
    
    // Validate required parameters
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      return { error: 'Product ID is required and must be a non-empty string' };
    }
    
    if (!country || typeof country !== 'string' || country.trim() === '') {
      return { error: 'Country is required and must be a non-empty string' };
    }
    
    // Basic country code validation (2-3 characters)
    if (country.length < 2 || country.length > 3) {
      return { error: 'Country must be a valid 2-3 character country code' };
    }
    
    // Validate product ID format (basic Shopify product ID validation)
    if (!/^\d+$/.test(productId)) {
      return { error: 'Product ID must contain only numbers' };
    }
    
    // Validate country code format (letters only)
    if (!/^[A-Za-z]+$/.test(country)) {
      return { error: 'Country code must contain only letters' };
    }
    
    return {
      productId: productId.trim(),
      country: country.toUpperCase().trim(),
      tags: tags ? tags.trim() : null,
      variantId: variantId ? variantId.trim() : null,
      shop: shop ? shop.trim() : null,
      error: null
    };
    
  } catch (err) {
    return { error: `Invalid request format: ${err.message}` };
  }
}

/**
 * Formats delivery estimate from min/max days
 * @param {number} minDays - Minimum delivery days
 * @param {number} maxDays - Maximum delivery days
 * @returns {string} Formatted delivery estimate
 */
export function formatDeliveryEstimate(minDays, maxDays) {
  if (minDays === maxDays) {
    return `${minDays} business day${minDays > 1 ? 's' : ''}`;
  }
  return `${minDays}-${maxDays} business days`;
}

/**
 * Creates CORS headers for the response
 * @returns {Object} - CORS headers
 */
export function createCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Content-Type': 'application/json',
  };
}

/**
 * Rate limiter implementation
 * Simple in-memory rate limiting (consider Redis for production)
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.windowMs = 60 * 1000; // 1 minute
    this.maxRequests = 100; // 100 requests per minute per IP
    
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  async check(request) {
    const ip = this.getClientIP(request);
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }
    
    const ipRequests = this.requests.get(ip);
    
    // Remove old requests outside the window
    const validRequests = ipRequests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000);
      
      return {
        allowed: false,
        ip,
        retryAfter,
        remaining: 0
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(ip, validRequests);
    
    return {
      allowed: true,
      ip,
      remaining: this.maxRequests - validRequests.length,
      resetTime: windowStart + this.windowMs
    };
  }
  
  getClientIP(request) {
    // Try to get real IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return request.headers.get('x-real-ip') || 
           request.headers.get('cf-connecting-ip') || 
           'unknown';
  }
  
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [ip, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      
      if (validRequests.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, validRequests);
      }
    }
  }
  
  getStats() {
    return {
      totalIPs: this.requests.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      activeRequests: Array.from(this.requests.values()).reduce((sum, reqs) => sum + reqs.length, 0)
    };
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Creates a standardized delivery estimate response
 * @param {Object} params - Response parameters
 * @returns {Object} Standardized response object
 */
export function createDeliveryResponse({
  estimate,
  ruleName,
  productId,
  country,
  customMessage = null,
  isDefault = false
}) {
  return {
    estimate,
    ruleName,
    productId,
    country,
    customMessage,
    isDefault
  };
}

/**
 * Validates product data structure
 * @param {Object} product - Product object to validate
 * @returns {boolean} Whether the product is valid
 */
export function isValidProduct(product) {
  return product && 
         typeof product.id === 'string' && 
         product.id.length > 0 &&
         Array.isArray(product.tags);
}

/**
 * Sanitizes and normalizes product tags
 * @param {string} tagsString - Comma-separated tags string
 * @returns {Array} Array of sanitized tags
 */
export function sanitizeTags(tagsString) {
  if (!tagsString || typeof tagsString !== 'string') {
    return [];
  }
  
  return tagsString
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0);
}