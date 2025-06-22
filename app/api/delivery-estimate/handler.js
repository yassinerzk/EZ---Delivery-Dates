import { data } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { getMatchingDeliveryRules, getDefaultDeliveryRule } from "../../lib/supabase.server.ts";
import { validateRequest, formatDeliveryEstimate, createCorsHeaders, rateLimiter } from "./utils";
import { logger } from "./logger";
import { metrics } from "./metrics";

/**
 * Handles delivery estimate requests from the theme extension
 * @param {Request} request - The incoming request
 * @returns {Response} JSON response with delivery estimate
 */
export async function handleDeliveryEstimate(request) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.check(request);
    if (!rateLimitResult.allowed) {
      logger.warn('[app/api/delivery-estimate/handler.js] Rate limit exceeded', { requestId, ip: rateLimitResult.ip });
      const headers = createCorsHeaders();
      return data(
        { error: "Rate limit exceeded", retryAfter: rateLimitResult.retryAfter },
        { status: 429, headers: { ...headers, 'Retry-After': rateLimitResult.retryAfter.toString() } }
      );
    }
    
    // Authenticate the app proxy request
    const { session } = await authenticate.public.appProxy(request);
    
    // Parse and validate request parameters
    const { productId, tags, country, variantId, shop, error: validationError } = validateRequest(request, session);
    
    const headers = createCorsHeaders();
    
    if (validationError) {
      logger.warn('[app/api/delivery-estimate/handler.js] Invalid request parameters', { requestId, error: validationError });
      return data({ error: validationError }, { status: 400, headers });
    }
    
    logger.info('[app/api/delivery-estimate/handler.js] Processing delivery estimate request', {
      requestId,
      productId,
      country,
      shopId: shop
    });
    
    // Only use default rules for products as per requirements
    // Try to get shop's default rule (latest one if multiple exist)
    if (shop) {
      const { data: defaultRule, error: defaultError } = await getDefaultDeliveryRule(shop);
      
      if (!defaultError && defaultRule) {
        // Return raw min/max days for extension formatting
        const minDays = defaultRule.estimated_min_days;
        const maxDays = defaultRule.estimated_max_days;
        
        // Metrics
        const duration = Date.now() - startTime;
        metrics.recordRequest({
          endpoint: 'delivery-estimate',
          method: 'GET',
          status: 200,
          duration,
          shopId: shop
        });
        
        logger.info('[app/api/delivery-estimate/handler.js] Default delivery estimate used', {
          requestId,
          duration
        });
        
        return data({
          minDays: minDays,
          maxDays: maxDays,
          ruleName: 'Default Shipping',
          productId: productId,
          country: country,
          customMessage: defaultRule.custom_message,
          isDefault: true,
          requestId,
          timestamp: new Date().toISOString()
        }, { headers });
      }
    }
    
    // No default rule found, return flag to hide section
    const duration = Date.now() - startTime;
    metrics.recordRequest({
      endpoint: 'delivery-estimate',
      method: 'GET',
      status: 200,
      duration,
      shopId: shop
    });
    
    logger.info('[app/api/delivery-estimate/handler.js] No delivery rules found, hiding section', {
      requestId,
      duration
    });
    
    // Return flag to indicate no rules found so frontend can hide the section
    return data({
      noRulesFound: true,
      productId: productId,
      country: country,
      requestId,
      timestamp: new Date().toISOString()
    }, { headers });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('[app/api/delivery-estimate/handler.js] Error processing delivery estimate request', {
      requestId,
      error: error.message,
      stack: error.stack,
      duration
    });
    
    metrics.recordRequest({
      endpoint: 'delivery-estimate',
      method: 'GET',
      status: 500,
      duration,
      error: error.message
    });
    
    const headers = createCorsHeaders();
    // Return fallback min/max days for extension formatting
    return data({
      minDays: 5, // Fallback minimum days
      maxDays: 7, // Fallback maximum days
      error: 'Internal server error',
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 500, headers });
  }
}

/**
 * Handles CORS preflight requests
 * @param {Request} request - The incoming request
 * @returns {Response} CORS response
 */
export async function handleCorsRequest(request) {
  const headers = createCorsHeaders();
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }
  
  return data({ error: 'Method not allowed' }, { status: 405, headers });
}