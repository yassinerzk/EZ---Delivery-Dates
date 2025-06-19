/**
 * Default values for delivery estimates
 */
export const DEFAULT_COUNTRY = 'US';
export const DEFAULT_ESTIMATE = '5-7 business days';
export const DEFAULT_RULE_NAME = 'Standard Shipping';

/**
 * Validates the incoming request parameters
 * @param {Request} request - The incoming request
 * @param {Object} session - The authenticated session
 * @returns {Object} Validated parameters or error
 */
export function validateRequest(request, session) {
  const url = new URL(request.url);
  const productId = url.searchParams.get('productId');
  const tags = url.searchParams.get('tags');
  const country = url.searchParams.get('country') || DEFAULT_COUNTRY;
  const variantId = url.searchParams.get('variantId');
  const shop = url.searchParams.get('shop') || session?.shop;
  
  if (!productId) {
    return { error: 'Product ID is required' };
  }
  
  return {
    productId,
    tags,
    country,
    variantId,
    shop,
    error: null
  };
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
 * Creates CORS headers for theme extension requests
 * @returns {Object} CORS headers object
 */
export function createCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    'Content-Type': 'application/json'
  };
}

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