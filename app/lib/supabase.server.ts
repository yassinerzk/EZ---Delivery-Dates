import { supabaseAdminTyped } from './supabase';
import { Metafield } from '../utils/metafields.js';

// Use the admin client for server-side operations
const supabase = supabaseAdminTyped;

export async function getDeliveryRules(shop?: string) {
  if (!supabase) {
    // Return mock data if Supabase is not configured
    return {
      data: [
        {
          id: "1",
          shop: "test-shop.myshopify.com",
          target_type: "tag" as const,
          target_value: "electronics",
          country_codes: ["US", "CA"],
          estimated_min_days: 1,
          estimated_max_days: 2,
          custom_message: "Express delivery for electronics",
          enabled: true,
          created_at: new Date().toISOString()
        },
        {
          id: "2",
          shop: "test-shop.myshopify.com",
          target_type: "tag" as const,
          target_value: "clothing",
          country_codes: ["US", "CA", "UK"],
          estimated_min_days: 3,
          estimated_max_days: 5,
          custom_message: "Standard shipping for clothing",
          enabled: true,
          created_at: new Date().toISOString()
        },
        {
          id: "3",
          shop: "test-shop.myshopify.com",
          target_type: "tag" as const,
          target_value: "*",
          country_codes: ["*"],
          estimated_min_days: 7,
          estimated_max_days: 14,
          custom_message: "International shipping",
          enabled: true,
          created_at: new Date().toISOString()
        }
      ],
      error: null
    };
    console.log('No data supabase Fetched delivery rules for shop:', shop);
  }

  try {
    let query = supabase
      .from('delivery_rules')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: false });
      console.log('Number of reasponse from supabase :', (await query).count);
    
    if (shop) {
      query = query.eq('shop', shop);
    }
    
    const { data, error } = await query;

    return { data, error };
  } catch (error) {
    console.error('Error fetching delivery rules:', error);
    return { data: null, error };
  }
}

/**
 * Get delivery rules that match the given product and customer country
 * @param {Object} product - Product object with id, tags, collections, etc.
 * @param {string} customerCountry - Customer's country code
 * @param {string} shop - Shop domain
 */
export async function getMatchingDeliveryRules(product: any, customerCountry: string = 'US', shop?: string) {
  const { data: rules, error } = await getDeliveryRules(shop);
  
  if (error || !rules) {
    return { data: [], error };
  }

  // Filter rules based on target type, target value, and customer country
  const matchingRules = rules.filter(rule => {
    // Check if rule applies to all countries or specific country
    const countryMatch = rule.country_codes.includes('*') || rule.country_codes.includes(customerCountry);
    
    // Check if rule applies based on target type and value
    let targetMatch = false;
    
    switch (rule.target_type) {
      case 'product':
        targetMatch = rule.target_value === '*' || rule.target_value === product.id?.toString();
        break;
      case 'sku':
        targetMatch = rule.target_value === '*' || 
          (product.variants && product.variants.some((variant: any) => variant.sku === rule.target_value));
        break;
      case 'tag':
        targetMatch = rule.target_value === '*' || 
          (product.tags && product.tags.some((tag: string) => tag === rule.target_value));
        break;
      case 'collection':
        targetMatch = rule.target_value === '*' || 
          (product.collections && product.collections.some((collection: any) => collection.id?.toString() === rule.target_value));
        break;
      case 'collection_tag':
        targetMatch = rule.target_value === '*' || 
          (product.collections && product.collections.some((collection: any) => 
            collection.tags && collection.tags.includes(rule.target_value)));
        break;
      case 'variant':
        targetMatch = rule.target_value === '*' || 
          (product.variants && product.variants.some((variant: any) => variant.id?.toString() === rule.target_value));
        break;
      default:
        targetMatch = false;
    }
    
    return countryMatch && targetMatch;
  });

  return { data: matchingRules, error: null };
}

/**
 * Get the default delivery rule for a shop
 * @param {string} shop - Shop domain
 * @returns {Promise<{data: any, error: any}>} - The default delivery rule or null
 */
export async function getDefaultDeliveryRule(shop: string) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase is not configured')
    };
  }

  try {
    // Get all default rules and order by updated_at DESC to get the latest one
    const { data, error } = await supabase
      .from('delivery_rules')
      .select('*')
      .eq('shop', shop)
      .eq('enabled', true)
      .eq('is_default', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      return { data: null, error };
    }

    // Return the first (latest) default rule or null if none found
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('Error fetching default delivery rule:', error);
    return { data: null, error };
  }
}

/**
 * Save a new delivery rule to the Supabase database
 * @param {Object} ruleData - The delivery rule data to save
 * @returns {Promise<{data: any, error: any}>} - Result of the database operation
 */
export async function saveDeliveryRule(ruleData: {
  shop: string;
  target_type: 'product' | 'sku' | 'tag' | 'collection' | 'collection_tag' | 'variant';
  target_value: string;
  country_codes: string[];
  estimated_min_days: number;
  estimated_max_days: number;
  custom_message?: string | null;
  enabled?: boolean;
  is_default?: boolean;
}) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase is not configured')
    };
  }

  try {
    // If this rule is being set as default, unset any existing default rules for this shop
    if (ruleData.is_default) {
      await supabase
        .from('delivery_rules')
        .update({ is_default: false })
        .eq('shop', ruleData.shop)
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('delivery_rules')
      .insert([
        {
          ...ruleData,
          enabled: ruleData.enabled ?? true,
          is_default: ruleData.is_default ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error saving delivery rule:', error);
    return { data: null, error };
  }
}

/**
 * Creates or updates a product metafield with the delivery rule data
 * @param {string} productId - Shopify product ID (e.g., "gid://shopify/Product/123456")
 * @param {string|number|object} ruleData - Rule data to store (can be ID, object, or JSON)
 * @param {Object} admin - Shopify admin API instance
 * @param {string} namespace - Metafield namespace (default: "delivery_rules")
 * @param {string} key - Metafield key (default: "rule_data")
 * @returns {Promise<{success: boolean, metafield?: any, error?: string}>}
 */
export async function attachRuleMetafieldToProduct(
  productId: string, 
  ruleData: string | number | object, 
  admin: any,
  namespace: string = "delivery_rules",
  key: string = "rule_data"
) {
  try {
    const metafieldClient = new Metafield(admin);
    
    // Check if metafield already exists
    const existingMetafield = await metafieldClient.getProductMetafield(
      productId, 
      namespace, 
      key
    );

    let result;
    if (existingMetafield) {
       // Update existing metafield
       result = await metafieldClient.update({
         id: existingMetafield.id,
         namespace,
         key,
         value: ruleData,
         ownerId: productId,
         type: undefined // Let the method infer the type
       });
    } else {
      // Create new metafield
      result = await metafieldClient.create({
        namespace,
        key,
        value: ruleData,
        ownerId: productId,
        type: undefined 
      });
    }

    return { success: true, metafield: result };
  } catch (error) {
    console.error('Error managing product metafield:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Retrieves delivery rule data from product metafield
 * @param {string} productId - Shopify product ID
 * @param {Object} admin - Shopify admin API instance
 * @param {string} namespace - Metafield namespace (default: "delivery_rules")
 * @param {string} key - Metafield key (default: "rule_data")
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getProductRuleMetafield(
  productId: string,
  admin: any,
  namespace: string = "delivery_rules",
  key: string = "rule_data"
) {
  try {
    const metafieldClient = new Metafield(admin);
    const metafield = await metafieldClient.getProductMetafield(productId, namespace, key);
    
    if (!metafield) {
      return { success: true, data: null };
    }

    // Try to parse JSON if it's a JSON type
    let parsedValue = metafield.value;
    if (metafield.type === 'json') {
      try {
        parsedValue = JSON.parse(metafield.value);
      } catch (e) {
        console.warn('Failed to parse JSON metafield value:', e);
      }
    }

    return { 
      success: true, 
      data: {
        ...metafield,
        parsedValue
      }
    };
  } catch (error) {
    console.error('Error retrieving product metafield:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Saves complete delivery rule data to product metafield in JSON format
 * @param {string} productId - Shopify product ID
 * @param {object} ruleData - Complete rule data object
 * @param {Object} admin - Shopify admin API instance
 * @returns {Promise<{success: boolean, metafield?: any, error?: string}>}
 */
export async function saveDeliveryRuleToProduct(productId: string, ruleData: object, admin: any) {
  return attachRuleMetafieldToProduct(
    productId,
    ruleData,
    admin,
    "delivery_rules",
    "complete_rule"
  );
}

/**
 * Updates delivery rule data in database and syncs to product metafield
 * @param {string} ruleId - Database rule ID
 * @param {object} updateData - Data to update
 * @param {string} productId - Shopify product ID (optional)
 * @param {Object} admin - Shopify admin API instance (optional)
 * @returns {Promise<{success: boolean, rule?: any, metafield?: any, error?: string}>}
 */
export async function updateDeliveryRuleAndSync(
  ruleId: string,
  updateData: object,
  productId?: string,
  admin?: any
) {
  try {
    // Update in database
    const { data: updatedRule, error: dbError } = await supabase
      .from('delivery_rules')
      .update(updateData)
      .eq('id', ruleId)
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database update failed: ${dbError.message}`);
    }

    // Sync to metafield if product ID and admin are provided
    let metafieldResult = null;
    if (productId && admin) {
      metafieldResult = await saveDeliveryRuleToProduct(productId, updatedRule, admin);
      if (!metafieldResult.success) {
        console.warn('Failed to sync to metafield:', metafieldResult.error);
      }
    }

    return {
      success: true,
      rule: updatedRule,
      metafield: metafieldResult?.metafield
    };
  } catch (error) {
    console.error('Error updating delivery rule and syncing:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export { supabase };