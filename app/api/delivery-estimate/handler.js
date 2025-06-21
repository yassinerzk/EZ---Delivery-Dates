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
    
    // Create a product object for matching
    const product = {
      id: productId,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      variantId: variantId
    };
    
    // Get matching delivery rules
    const { data: matchingRules, error } = await getMatchingDeliveryRules(product, country, shop);
    
    if (error) {
      logger.error('[app/api/delivery-estimate/handler.js] Error fetching delivery rules', { requestId, error });
      return data({ error: 'Failed to fetch delivery estimate' }, { status: 500, headers });
    }
    
    // Return the first matching rule (highest priority)
    if (matchingRules && matchingRules.length > 0) {
      const bestMatch = matchingRules[0];
      // Return raw min/max days for extension formatting
        const minDays = bestMatch.estimated_min_days;
        const maxDays = bestMatch.estimated_max_days;
      
      // Metrics
      const duration = Date.now() - startTime;
      metrics.recordRequest({
        endpoint: 'delivery-estimate',
        method: 'GET',
        status: 200,
        duration,
        shopId: shop
      });
      
      logger.info('[app/api/delivery-estimate/handler.js] Delivery estimate calculated successfully', {
        requestId,
        duration,
        ruleName: bestMatch.target_value
      });
      
      return data({
          minDays: minDays,
          maxDays: maxDays,
        ruleName: bestMatch.target_value,
        productId: productId,
        country: country,
        customMessage: bestMatch.custom_message,
        isDefault: false,
        requestId,
        timestamp: new Date().toISOString()
      }, { headers });
    }
    
    // Try to get shop's default rule
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
    
    // No matching rules and no default rule found, return generic default
    const duration = Date.now() - startTime;
    metrics.recordRequest({
      endpoint: 'delivery-estimate',
      method: 'GET',
      status: 200,
      duration,
      shopId: shop
    });
    
    logger.info('[app/api/delivery-estimate/handler.js] Generic default estimate used', {
      requestId,
      duration
    });
    
    // Return default min/max days for extension formatting
    return data({
      minDays: 5,
      maxDays: 7,
      ruleName: 'Standard Shipping',
      productId: productId,
      country: country,
      isDefault: true,
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