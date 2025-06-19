import { json } from "@remix-run/node";
import { getMatchingDeliveryRules, getDefaultDeliveryRule } from "../lib/supabase.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const productId = url.searchParams.get('productId');
  const tags = url.searchParams.get('tags');
  const country = url.searchParams.get('country') || 'US';
  const variantId = url.searchParams.get('variantId');
  
  if (!productId) {
    return json({ error: 'Product ID is required' }, { status: 400 });
  }
  
  try {
    // Create a product object for matching
    const product = {
      id: productId,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      variantId: variantId
    };
    
    // Get matching delivery rules
    const { data: matchingRules, error } = await getMatchingDeliveryRules(product, country);
    
    if (error) {
      console.error('Error fetching delivery rules:', error);
      return json({ error: 'Failed to fetch delivery estimate' }, { status: 500 });
    }
    
    // Return the first matching rule (highest priority)
    if (matchingRules && matchingRules.length > 0) {
      const bestMatch = matchingRules[0];
      
      // Format the delivery estimate from min/max days
      let estimate;
      if (bestMatch.estimated_min_days === bestMatch.estimated_max_days) {
        estimate = `${bestMatch.estimated_min_days} business day${bestMatch.estimated_min_days > 1 ? 's' : ''}`;
      } else {
        estimate = `${bestMatch.estimated_min_days}-${bestMatch.estimated_max_days} business days`;
      }
      
      return json({
        estimate: estimate,
        ruleName: bestMatch.target_value,
        productId: productId,
        country: country,
        customMessage: bestMatch.custom_message,
        isDefault: false
      });
    } else {
      // No specific matching rules found, try to get shop's default rule
      const shop = url.searchParams.get('shop');
      if (shop) {
        const { data: defaultRule, error: defaultError } = await getDefaultDeliveryRule(shop);
        
        if (!defaultError && defaultRule) {
          // Format the delivery estimate from default rule
          let estimate;
          if (defaultRule.estimated_min_days === defaultRule.estimated_max_days) {
            estimate = `${defaultRule.estimated_min_days} business day${defaultRule.estimated_min_days > 1 ? 's' : ''}`;
          } else {
            estimate = `${defaultRule.estimated_min_days}-${defaultRule.estimated_max_days} business days`;
          }
          
          return json({
            estimate: estimate,
            ruleName: 'Default Shipping',
            productId: productId,
            country: country,
            customMessage: defaultRule.custom_message,
            isDefault: true
          });
        }
      }
      
      // No matching rules and no default rule found, return generic default
      return json({
        estimate: '5-7 business days',
        ruleName: 'Standard Shipping',
        productId: productId,
        country: country,
        isDefault: true
      });
    }
    
  } catch (error) {
    console.error('Error processing delivery estimate request:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle POST requests for more complex delivery estimate calculations
export async function action({ request }) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  try {
    const body = await request.json();
    const { productId, tags, collections, country, variantId, customerId } = body;
    
    if (!productId) {
      return json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    // Create a more detailed product object
    const product = {
      id: productId,
      tags: tags || [],
      collections: collections || [],
      variantId: variantId
    };
    
    // Get matching delivery rules with customer context
    const { data: matchingRules, error } = await getMatchingDeliveryRules(
      product, 
      country || 'US'
    );
    
    if (error) {
      console.error('Error fetching delivery rules:', error);
      return json({ error: 'Failed to fetch delivery estimate' }, { status: 500 });
    }
    
    // Return all matching rules for more detailed response
    if (matchingRules && matchingRules.length > 0) {
      const formatEstimate = (rule) => {
        if (rule.estimated_min_days === rule.estimated_max_days) {
          return `${rule.estimated_min_days} business day${rule.estimated_min_days > 1 ? 's' : ''}`;
        } else {
          return `${rule.estimated_min_days}-${rule.estimated_max_days} business days`;
        }
      };
      
      return json({
        estimates: matchingRules.map(rule => ({
          estimate: formatEstimate(rule),
          ruleName: rule.target_value,
          priority: rule.priority || 0,
          customMessage: rule.custom_message
        })),
        primaryEstimate: formatEstimate(matchingRules[0]),
        productId: productId,
        country: country || 'US'
      });
    } else {
      return json({
        estimates: [{
          estimate: '5-7 business days',
          ruleName: 'Standard Shipping',
          priority: 0
        }],
        primaryEstimate: '5-7 business days',
        productId: productId,
        country: country || 'US',
        isDefault: true
      });
    }
    
  } catch (error) {
    console.error('Error processing delivery estimate request:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}