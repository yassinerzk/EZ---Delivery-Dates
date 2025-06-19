import { handleDeliveryEstimate, handleCorsRequest } from "../../api/delivery-estimate/index.js";

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
  return handleDeliveryEstimate(request);
}

/**
 * Handles POST and OPTIONS requests (mainly for CORS)
 * @param {Object} params - Route parameters
 * @param {Request} params.request - The incoming request
 * @returns {Response} CORS response or error
 */
export async function action({ request }) {
  return handleCorsRequest(request);
}