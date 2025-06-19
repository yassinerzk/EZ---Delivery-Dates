import { supabaseAdminTyped } from './supabase';

// Use the admin client for server-side operations
const supabase = supabaseAdminTyped;

/**
 * Fetch delivery rules from Supabase database
 * Expected table structure: delivery_rules
 * Columns: id, shop, target_type, target_value, country_codes, estimated_min_days, estimated_max_days, custom_message, enabled, created_at
 */
export async function getDeliveryRules(shop) {
  if (!supabase) {
    // Return mock data if Supabase is not configured
    return {
      data: [
        {
          id: "1",
          shop: "test-shop.myshopify.com",
          target_type: "tag",
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
          target_type: "tag",
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
          target_type: "tag",
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
  }

  try {
    let query = supabase
      .from('delivery_rules')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: false });
    
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
export async function getMatchingDeliveryRules(product, customerCountry = 'US', shop) {
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
          (product.variants && product.variants.some((variant) => variant.sku === rule.target_value));
        break;
      case 'tag':
        targetMatch = rule.target_value === '*' || 
          (product.tags && product.tags.some((tag) => tag === rule.target_value));
        break;
      case 'collection':
        targetMatch = rule.target_value === '*' || 
          (product.collections && product.collections.some((collection) => collection.id?.toString() === rule.target_value));
        break;
      case 'collection_tag':
        targetMatch = rule.target_value === '*' || 
          (product.collections && product.collections.some((collection) => 
            collection.tags && collection.tags.includes(rule.target_value)));
        break;
      case 'variant':
        targetMatch = rule.target_value === '*' || 
          (product.variants && product.variants.some((variant) => variant.id?.toString() === rule.target_value));
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
export async function getDefaultDeliveryRule(shop) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase is not configured')
    };
  }

  try {
    const { data, error } = await supabase
      .from('delivery_rules')
      .select('*')
      .eq('shop', shop)
      .eq('enabled', true)
      .eq('is_default', true)
      .single();

    return { data, error };
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
export async function saveDeliveryRule(ruleData) {
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
 * Update an existing delivery rule in the Supabase database
 * @param {string} id - The ID of the rule to update
 * @param {Object} ruleData - The updated delivery rule data
 * @returns {Promise<{data: any, error: any}>} - Result of the database operation
 */
export async function updateDeliveryRule(id, ruleData) {
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
        .eq('is_default', true)
        .neq('id', id);
    }

    const { data, error } = await supabase
      .from('delivery_rules')
      .update(ruleData)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error updating delivery rule:', error);
    return { data: null, error };
  }
}

/**
 * Delete a delivery rule from the Supabase database
 * @param {string} id - The ID of the rule to delete
 * @returns {Promise<{data: any, error: any}>} - Result of the database operation
 */
export async function deleteDeliveryRule(id) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase is not configured')
    };
  }

  try {
    const { data, error } = await supabase
      .from('delivery_rules')
      .delete()
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error deleting delivery rule:', error);
    return { data: null, error };
  }
}