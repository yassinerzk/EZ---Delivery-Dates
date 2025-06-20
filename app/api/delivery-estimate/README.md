# Delivery Estimate API Module

This module provides a clean, modular approach to handling delivery estimate requests from the Shopify theme extension. It separates concerns and improves maintainability by organizing the code into focused, reusable components.

## Structure

```
app/api/delivery-estimate/
├── index.js          # Main exports and API configuration
├── handler.js        # Core business logic handlers
├── utils.js          # Utility functions and helpers
├── types.js          # TypeScript/JSDoc type definitions
└── README.md         # This documentation
```

## Files Overview

### `index.js`
Main entry point that exports all public functions and constants. This provides a clean interface for importing the module.

### `handler.js`
Contains the core business logic:
- `handleDeliveryEstimate()` - Main handler for delivery estimate requests
- `handleCorsRequest()` - Handler for CORS preflight requests

### `utils.js`
Utility functions for:
- Request validation
- Data formatting
- CORS header creation
- Response standardization
- Input sanitization

### `types.js`
JSDoc type definitions for better IntelliSense and documentation.

## Usage

### In Route Files
```javascript
import { handleDeliveryEstimate, handleCorsRequest } from "../api/delivery-estimate/index";

export async function loader({ request }) {
  return handleDeliveryEstimate(request);
}

export async function action({ request }) {
  return handleCorsRequest(request);
}
```

### Using Utilities
```javascript
import { 
  validateRequest, 
  formatDeliveryEstimate, 
  createCorsHeaders 
} from "../api/delivery-estimate/index";

// Validate request parameters
const { productId, error } = validateRequest(request, session);

// Format delivery estimate
const estimate = formatDeliveryEstimate(3, 5); // "3-5 business days"

// Create CORS headers
const headers = createCorsHeaders();
```

## API Endpoints

### GET `/data/api/delivery-estimate`

Retrieves delivery estimates for products.

**Query Parameters:**
- `productId` (required) - Product ID
- `tags` (optional) - Comma-separated product tags
- `country` (optional) - Country code (defaults to 'US')
- `variantId` (optional) - Product variant ID
- `shop` (optional) - Shop domain

**Response:**
```json
{
  "estimate": "3-5 business days",
  "ruleName": "Express Shipping",
  "productId": "123456",
  "country": "US",
  "customMessage": "Ships within 24 hours",
  "isDefault": false
}
```

### OPTIONS `/data/api/delivery-estimate`

Handles CORS preflight requests.

## Error Handling

The module includes comprehensive error handling:

- **400 Bad Request** - Missing required parameters
- **500 Internal Server Error** - Database or processing errors
- **405 Method Not Allowed** - Unsupported HTTP methods

All responses include appropriate CORS headers for theme extension compatibility.

## Constants

- `DEFAULT_COUNTRY` - Default country code ('US')
- `DEFAULT_ESTIMATE` - Fallback estimate ('5-7 business days')
- `DEFAULT_RULE_NAME` - Default rule name ('Standard Shipping')
- `API_VERSION` - Current API version
- `MAX_TAGS_LIMIT` - Maximum tags per request
- `CACHE_DURATION` - Recommended cache duration

## Benefits of This Structure

1. **Separation of Concerns** - Route logic separated from business logic
2. **Reusability** - Utility functions can be used across different routes
3. **Testability** - Individual functions can be easily unit tested
4. **Maintainability** - Changes to business logic don't affect route structure
5. **Documentation** - Clear type definitions and inline documentation
6. **Scalability** - Easy to add new features or modify existing ones

## Future Enhancements

- Add caching layer for frequently requested estimates
- Implement rate limiting for API requests
- Add request/response logging for analytics
- Create automated tests for all functions
- Add input validation schemas using Zod or similar