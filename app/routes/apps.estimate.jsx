import { json } from '@remix-run/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Verify Shopify signature
function verifyShopifySignature(query, signature, secret) {
  const sortedQuery = Object.keys(query)
    .filter(key => key !== 'signature' && key !== 'hmac')
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');
  
  const calculatedSignature = crypto
    .createHmac('sha256', secret)
    .update(sortedQuery)
    .digest('hex');
  
  return calculatedSignature === signature;
}

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    
    // Extract all query parameters for signature verification
    const queryParams = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Verify Shopify signature (optional but recommended for production)
    const signature = url.searchParams.get('signature');
    const shopifySecret = process.env.SHOPIFY_API_SECRET;
    
    if (signature && shopifySecret) {
      const isValidSignature = verifyShopifySignature(queryParams, signature, shopifySecret);
      if (!isValidSignature) {
        console.warn('⚠️ Invalid Shopify signature detected');
        // In production, you might want to return an error here
        // return json({ error: "Invalid signature" }, { status: 401 });
      }
    }
    const productId = url.searchParams.get("product_id") || url.searchParams.get("productId");
    const shop = url.searchParams.get("shop");
    const country = url.searchParams.get("country") || "US";
    const tags = url.searchParams.get("tags") || "";
    const variantId = url.searchParams.get("variant_id") || url.searchParams.get("variantId");
    const productType = url.searchParams.get("product_type") || url.searchParams.get("productType");
    const vendor = url.searchParams.get("vendor");

    console.log('🔍 Proxy Estimate Request:', {
      productId,
      shop,
      country,
      tags,
      variantId,
      productType,
      vendor
    });

    // Validate required parameters
    if (!productId || !shop) {
      return json({
        error: "Missing required parameters: product_id and shop",
        success: false
      }, { status: 400 });
    }

    // Query delivery rules from Supabase
    const { data: rules, error: rulesError } = await supabase
      .from('delivery_rules')
      .select('*')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (rulesError) {
      console.error('❌ Supabase error:', rulesError);
      return json({
        error: "Database error",
        success: false
      }, { status: 500 });
    }

    // Find matching rule
    let matchedRule = null;
    
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        let matches = true;

        // Check country condition
        if (rule.conditions?.countries && rule.conditions.countries.length > 0) {
          if (!rule.conditions.countries.includes(country)) {
            matches = false;
            continue;
          }
        }

        // Check product type condition
        if (rule.conditions?.product_types && rule.conditions.product_types.length > 0) {
          if (!productType || !rule.conditions.product_types.includes(productType)) {
            matches = false;
            continue;
          }
        }

        // Check vendor condition
        if (rule.conditions?.vendors && rule.conditions.vendors.length > 0) {
          if (!vendor || !rule.conditions.vendors.includes(vendor)) {
            matches = false;
            continue;
          }
        }

        // Check tags condition
        if (rule.conditions?.tags && rule.conditions.tags.length > 0) {
          const productTagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
          const hasMatchingTag = rule.conditions.tags.some(ruleTag => 
            productTagsArray.includes(ruleTag)
          );
          if (!hasMatchingTag) {
            matches = false;
            continue;
          }
        }

        if (matches) {
          matchedRule = rule;
          break;
        }
      }
    }

    // Calculate delivery estimate
    let deliveryDays = 7; // Default fallback
    let deliveryText = "5-7 business days";
    let deliveryDate = null;

    if (matchedRule) {
      deliveryDays = matchedRule.delivery_days || 7;
      deliveryText = matchedRule.delivery_text || `${deliveryDays} business days`;
      
      // Calculate delivery date
      const today = new Date();
      const deliveryDateObj = new Date(today);
      deliveryDateObj.setDate(today.getDate() + deliveryDays);
      deliveryDate = deliveryDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    const response = {
      success: true,
      delivery_estimate: {
        days: deliveryDays,
        text: deliveryText,
        date: deliveryDate,
        country: country,
        matched_rule: matchedRule ? {
          id: matchedRule.id,
          name: matchedRule.name,
          priority: matchedRule.priority
        } : null
      },
      debug: {
        product_id: productId,
        shop: shop,
        country: country,
        rules_found: rules?.length || 0,
        matched_rule_id: matchedRule?.id || null
      }
    };

    console.log('✅ Proxy Estimate Response:', response);

    return json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('💥 Proxy Estimate Error:', error);
    
    return json({
      error: "Internal server error",
      success: false,
      message: error.message
    }, { status: 500 });
  }
};

// Handle OPTIONS requests for CORS
export const action = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  
  return loader({ request });
};