/**
 * Type definitions for the Delivery Estimate API
 * 
 * These JSDoc type definitions provide better IntelliSense and documentation
 * for the delivery estimate functionality.
 */

/**
 * @typedef {Object} DeliveryRule
 * @property {string} id - Unique identifier for the rule
 * @property {string} target_value - The target value (product tag, type, etc.)
 * @property {string} target_type - Type of targeting (tag, product_type, etc.)
 * @property {string} country - Country code for the rule
 * @property {number} estimated_min_days - Minimum delivery days
 * @property {number} estimated_max_days - Maximum delivery days
 * @property {string|null} custom_message - Custom message to display
 * @property {string} shop - Shop domain
 * @property {boolean} is_default - Whether this is a default rule
 * @property {number} priority - Rule priority (lower = higher priority)
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Last update timestamp
 */

/**
 * @typedef {Object} Product
 * @property {string} id - Product ID
 * @property {string[]} tags - Array of product tags
 * @property {string} [variantId] - Optional variant ID
 * @property {string} [type] - Product type
 * @property {string} [vendor] - Product vendor
 */

/**
 * @typedef {Object} DeliveryEstimateRequest
 * @property {string} productId - Product ID (required)
 * @property {string} [tags] - Comma-separated product tags
 * @property {string} [country] - Country code (defaults to 'US')
 * @property {string} [variantId] - Product variant ID
 * @property {string} [shop] - Shop domain
 * @property {string} [productType] - Product type
 * @property {string} [vendor] - Product vendor
 */

/**
 * @typedef {Object} DeliveryEstimateResponse
 * @property {string} estimate - Formatted delivery estimate
 * @property {string} ruleName - Name of the matching rule
 * @property {string} productId - Product ID
 * @property {string} country - Country code
 * @property {string|null} customMessage - Custom message from the rule
 * @property {boolean} isDefault - Whether this is a default estimate
 */

/**
 * @typedef {Object} ValidationResult
 * @property {string} [productId] - Validated product ID
 * @property {string} [tags] - Validated tags string
 * @property {string} [country] - Validated country code
 * @property {string} [variantId] - Validated variant ID
 * @property {string} [shop] - Validated shop domain
 * @property {string|null} error - Validation error message
 */

/**
 * @typedef {Object} ApiResponse
 * @property {DeliveryEstimateResponse|Object} data - Response data
 * @property {number} status - HTTP status code
 * @property {Object} headers - Response headers
 * @property {string} [error] - Error message if applicable
 */

/**
 * @typedef {Object} CorsHeaders
 * @property {string} Access-Control-Allow-Origin - CORS origin header
 * @property {string} Access-Control-Allow-Methods - CORS methods header
 * @property {string} Access-Control-Allow-Headers - CORS headers header
 * @property {string} Content-Type - Content type header
 */

export {}; // Make this a module