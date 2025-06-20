/**
 * Explicit API Route: /data/api/delivery-estimate
 * 
 * This route handles delivery estimate requests from the Shopify theme extension.
 * Uses the _index convention for cleaner URL structure.
 * The actual business logic is handled by the delivery-estimate API module.
 */

/**
 * Handles GET requests for delivery estimates
 * @param {Object} params - Route parameters
 * @param {Request} params.request - The incoming request
 * @returns {Response} JSON response with delivery estimate
 */
export async function loader({ request }) {
  const { handleDeliveryEstimate } = await import('../api/delivery-estimate/handler.js');
  return handleDeliveryEstimate(request);
}

/**
 * Handles POST requests for delivery estimates
 * @param {Object} params - Route parameters
 * @param {Request} params.request - The incoming request
 * @returns {Response} JSON response with delivery estimate
 */
export async function action({ request }) {
  const { handleDeliveryEstimate } = await import('../api/delivery-estimate/handler.js');
  return handleDeliveryEstimate(request);
}

/**
 * Handles OPTIONS requests for CORS
 * @param {Object} params - Route parameters
 * @param {Request} params.request - The incoming request
 * @returns {Response} CORS headers response
 */
export async function options({ request }) {
  return handleCorsRequest(request);
}