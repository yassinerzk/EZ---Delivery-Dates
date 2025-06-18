const express = require('express');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const { shopifyApp } = require('@shopify/shopify-app-express');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
  scopes: ['write_products', 'read_products', 'write_script_tags', 'read_script_tags'],
  hostName: process.env.SHOPIFY_APP_URL || `localhost:${PORT}`,
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

// Create Express app
const app = express();

// Initialize Shopify app middleware
const shopifyAppMiddleware = shopifyApp({
  api: shopify,
  auth: {
    path: '/auth',
    callbackPath: '/auth/callback',
  },
  webhooks: {
    path: '/webhooks',
  },
});

app.use(shopifyAppMiddleware);

// Delivery estimation logic
const deliveryRules = {
  // Default delivery rules - can be expanded
  standard: {
    minDays: 3,
    maxDays: 7,
    message: 'Estimated delivery: {minDays}-{maxDays} business days'
  },
  express: {
    minDays: 1,
    maxDays: 2,
    message: 'Express delivery: {minDays}-{maxDays} business days'
  },
  international: {
    minDays: 7,
    maxDays: 14,
    message: 'International delivery: {minDays}-{maxDays} business days'
  }
};

// API endpoint to get delivery estimation
app.get('/api/delivery-estimate', async (req, res) => {
  try {
    const { productId, country = 'US', shippingMethod = 'standard' } = req.query;
    
    // Get delivery rule based on shipping method
    const rule = deliveryRules[shippingMethod] || deliveryRules.standard;
    
    // Calculate delivery dates
    const today = new Date();
    const minDeliveryDate = new Date(today);
    const maxDeliveryDate = new Date(today);
    
    minDeliveryDate.setDate(today.getDate() + rule.minDays);
    maxDeliveryDate.setDate(today.getDate() + rule.maxDays);
    
    // Format message
    const message = rule.message
      .replace('{minDays}', rule.minDays)
      .replace('{maxDays}', rule.maxDays);
    
    res.json({
      success: true,
      productId,
      country,
      shippingMethod,
      estimatedDelivery: {
        minDate: minDeliveryDate.toISOString().split('T')[0],
        maxDate: maxDeliveryDate.toISOString().split('T')[0],
        minDays: rule.minDays,
        maxDays: rule.maxDays,
        message
      }
    });
  } catch (error) {
    console.error('Error calculating delivery estimate:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate delivery estimate' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 EstimaTrack Delivery Rules app is running on port ${PORT}`);
  console.log(`📦 Ready to provide delivery estimates!`);
});

module.exports = app;