import { data } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { getMatchingDeliveryRules, getDefaultDeliveryRule } from "../../lib/supabase.server.ts";
import { validateRequest, formatDeliveryEstimate, createCorsHeaders } from "./utils.js";

/**
 * Handles delivery estimate requests from the theme extension
 * @param {Request} request - The incoming request
 * @returns {Response} JSON response with delivery estimate
 */
export async function handleDeliveryEstimate(request) {
  try {
    // Authenticate the app proxy request
    const { session } = await authenticate.public.appProxy(request);
    
    // Parse and validate request parameters
    const { productId, tags, country, variantId, shop, error: validationError } = validateRequest(request, session);
    
    const headers = createCorsHeaders();
    
    if (validationError) {
      return data({ error: validationError }, { status: 400, headers });
    }
    
    // Create a product object for matching
    const product = {
      id: productId,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      variantId: variantId
    };
    
    // Get matching delivery rules
    const { data: matchingRules, error } = await getMatchingDeliveryRules(product, country, shop);
    
    if (error) {
      console.error('Error fetching delivery rules:', error);
      return data({ error: 'Failed to fetch delivery estimate' }, { status: 500, headers });
    }
    
    // Return the first matching rule (highest priority)
    if (matchingRules && matchingRules.length > 0) {
      const bestMatch = matchingRules[0];
      const estimate = formatDeliveryEstimate(bestMatch.estimated_min_days, bestMatch.estimated_max_days);
      
      return data({
        estimate: estimate,
        ruleName: bestMatch.target_value,
        productId: productId,
        country: country,
        customMessage: bestMatch.custom_message,
        isDefault: false
      }, { headers });
    }
    
    // Try to get shop's default rule
    if (shop) {
      const { data: defaultRule, error: defaultError } = await getDefaultDeliveryRule(shop);
      
      if (!defaultError && defaultRule) {
        const estimate = formatDeliveryEstimate(defaultRule.estimated_min_days, defaultRule.estimated_max_days);
        
        return data({
          estimate: estimate,
          ruleName: 'Default Shipping',
          productId: productId,
          country: country,
          customMessage: defaultRule.custom_message,
          isDefault: true
        }, { headers });
      }
    }
    
    // No matching rules and no default rule found, return generic default
    return data({
      estimate: '5-7 business days',
      ruleName: 'Standard Shipping',
      productId: productId,
      country: country,
      isDefault: true
    }, { headers });
    
  } catch (error) {
    console.error('Error processing delivery estimate request:', error);
    const headers = createCorsHeaders();
    return data({ error: 'Internal server error' }, { status: 500, headers });
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