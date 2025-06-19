/**
 * Delivery Estimate API Module
 * 
 * This module provides a clean interface for handling delivery estimate requests
 * from the Shopify theme extension. It includes request validation, data formatting,
 * and proper error handling.
 */

export { handleDeliveryEstimate, handleCorsRequest } from './handler.js';
export { 
  validateRequest, 
  formatDeliveryEstimate, 
  createCorsHeaders,
  createDeliveryResponse,
  isValidProduct,
  sanitizeTags,
  DEFAULT_COUNTRY,
  DEFAULT_ESTIMATE,
  DEFAULT_RULE_NAME
} from './utils.js';

/**
 * API version for tracking compatibility
 */
export const API_VERSION = '1.0.0';

/**
 * Supported HTTP methods for this API
 */
export const SUPPORTED_METHODS = ['GET', 'OPTIONS'];

/**
 * Maximum number of tags to process per request
 */
export const MAX_TAGS_LIMIT = 50;

/**
 * Cache duration for delivery estimates (in seconds)
 */
export const CACHE_DURATION = 300; // 5 minutes