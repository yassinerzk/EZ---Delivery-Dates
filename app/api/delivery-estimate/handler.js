import { data } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { getMatchingDeliveryRules, getDefaultDeliveryRule } from "../../lib/supabase.server.ts";
import { validateRequest, formatDeliveryEstimate, createCorsHeaders, rateLimiter } from "./utils.js";
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
      logger.warn('Rate limit exceeded', { requestId, ip: rateLimitResult.ip });
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
      logger.warn('Invalid request parameters', { requestId, error: validationError });
      return data({ error: validationError }, { status: 400, headers });
    }
    
    logger.info('Processing delivery estimate request', {
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
      logger.error('Error fetching delivery rules', { requestId, error });
      return data({ error: 'Failed to fetch delivery estimate' }, { status: 500, headers });
    }
    
    // Return the first matching rule (highest priority)
    if (matchingRules && matchingRules.length > 0) {
      const bestMatch = matchingRules[0];
      const estimate = formatDeliveryEstimate(bestMatch.estimated_min_days, bestMatch.estimated_max_days);
      
      // Metrics
      const duration = Date.now() - startTime;
      metrics.recordRequest({
        endpoint: 'delivery-estimate',
        method: 'GET',
        status: 200,
        duration,
        shopId: shop
      });
      
      logger.info('Delivery estimate calculated successfully', {
        requestId,
        duration,
        ruleName: bestMatch.target_value
      });
      
      return data({
        estimate: estimate,
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
        const estimate = formatDeliveryEstimate(defaultRule.estimated_min_days, defaultRule.estimated_max_days);
        
        // Metrics
        const duration = Date.now() - startTime;
        metrics.recordRequest({
          endpoint: 'delivery-estimate',
          method: 'GET',
          status: 200,
          duration,
          shopId: shop
        });
        
        logger.info('Default delivery estimate used', {
          requestId,
          duration
        });
        
        return data({
          estimate: estimate,
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
    
    logger.info('Generic default estimate used', {
      requestId,
      duration
    });
    
    return data({
      estimate: '5-7 business days',
      ruleName: 'Standard Shipping',
      productId: productId,
      country: country,
      isDefault: true,
      requestId,
      timestamp: new Date().toISOString()
    }, { headers });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Error processing delivery estimate request', {
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
    return data({
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