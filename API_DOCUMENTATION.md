# Delivery Estimate API Documentation

## Overview

The Delivery Estimate API provides real-time delivery time estimates for products based on customer location and product characteristics. This API is designed for Shopify stores to enhance customer experience by providing accurate delivery expectations.

## Base URL

```
https://your-app-domain.com/data/api/delivery-estimate
```

## Authentication

This API uses Shopify App Proxy authentication. Requests must be made through the Shopify storefront with proper app proxy configuration.

## Endpoints

### 1. Get Delivery Estimate

**Endpoint:** `GET /data/api/delivery-estimate`

**Description:** Calculate delivery estimate for a specific product and location.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `productId` | string | Yes | Shopify product ID (numeric string) |
| `country` | string | Yes | 2-3 character country code (e.g., 'US', 'CA', 'UK') |
| `shop` | string | No | Shop domain (auto-detected from app proxy) |

**Example Request:**
```bash
GET /data/api/delivery-estimate?productId=123456789&country=US
```

**Success Response (200):**
```json
{
  "estimate": "3-5 business days",
  "productId": "123456789",
  "country": "US",
  "customMessage": "Fast shipping available to your area!",
  "isDefault": false,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (400):**
```json
{
  "error": "Invalid parameters",
  "details": ["Product ID must contain only numbers"],
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (429):**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Health Check

**Endpoint:** `GET /data/api/health`

**Description:** Check API health status and performance metrics.

**Example Request:**
```bash
GET /data/api/health
```

**Success Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "environment": "production",
  "api": {
    "status": "healthy",
    "errorRate": "2.50",
    "averageResponseTime": "150",
    "totalRequests": 1000,
    "issues": []
  },
  "rateLimiting": {
    "activeIPs": 25,
    "windowMs": 60000,
    "maxRequestsPerWindow": 100,
    "activeRequests": 45
  },
  "performance": {
    "averageResponseTime": 150.5,
    "maxResponseTime": 2500,
    "minResponseTime": 50
  },
  "requests": {
    "total": 1000,
    "success": 975,
    "errors": 25,
    "successRate": "97.50",
    "byStatus": {
      "200": 975,
      "400": 15,
      "500": 10
    },
    "topShops": [
      { "shop": "example-store.myshopify.com", "requests": 500 },
      { "shop": "another-store.myshopify.com", "requests": 300 }
    ]
  },
  "recentErrors": []
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Limit:** 100 requests per minute per IP address
- **Window:** 60 seconds (sliding window)
- **Headers:** Rate limit information is included in response headers
- **Exceeded:** Returns HTTP 429 with `Retry-After` header

## Error Handling

The API uses standard HTTP status codes and provides detailed error messages:

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Health check failed |

## Response Format

All responses are in JSON format and include:

- **Success responses:** Requested data plus metadata (requestId, timestamp)
- **Error responses:** Error message, details, requestId, and timestamp
- **Consistent structure:** All responses follow the same basic structure

## Integration Examples

### JavaScript (Frontend)

```javascript
// Fetch delivery estimate
async function getDeliveryEstimate(productId, country) {
  try {
    const response = await fetch(
      `/data/api/delivery-estimate?productId=${productId}&country=${country}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching delivery estimate:', error);
    throw error;
  }
}

// Usage
getDeliveryEstimate('123456789', 'US')
  .then(data => {
    console.log('Delivery estimate:', data.estimate);
    console.log('Custom message:', data.customMessage);
  })
  .catch(error => {
    console.error('Failed to get delivery estimate:', error);
  });
```

### Liquid (Shopify Theme)

```liquid
<script>
  // Get delivery estimate for current product
  function loadDeliveryEstimate() {
    const productId = '{{ product.id }}';
    const country = '{{ localization.country.iso_code }}';
    
    fetch(`/data/api/delivery-estimate?productId=${productId}&country=${country}`)
      .then(response => response.json())
      .then(data => {
        if (data.estimate) {
          document.getElementById('delivery-estimate').innerHTML = 
            `<strong>Estimated Delivery:</strong> ${data.estimate}`;
          
          if (data.customMessage) {
            document.getElementById('delivery-message').innerHTML = data.customMessage;
          }
        }
      })
      .catch(error => {
        console.error('Error:', error);
        document.getElementById('delivery-estimate').innerHTML = 
          'Delivery estimate unavailable';
      });
  }
  
  // Load estimate when page loads
  document.addEventListener('DOMContentLoaded', loadDeliveryEstimate);
</script>

<div id="delivery-estimate">Loading delivery estimate...</div>
<div id="delivery-message"></div>
```

## Monitoring and Logging

The API includes comprehensive monitoring:

- **Structured logging:** All requests and errors are logged with context
- **Performance metrics:** Response times, success rates, and error rates
- **Health monitoring:** Real-time health status and diagnostics
- **Request tracking:** Unique request IDs for debugging

## Best Practices

1. **Caching:** Cache delivery estimates on the frontend to reduce API calls
2. **Error handling:** Always handle API errors gracefully
3. **Rate limiting:** Respect rate limits and implement retry logic
4. **Monitoring:** Use the health endpoint to monitor API status
5. **Security:** Never expose API keys or sensitive data in frontend code

## Support

For technical support or questions about the API:

- Check the health endpoint for current API status
- Review error messages and request IDs for debugging
- Contact support with specific request IDs for faster resolution

## Changelog

### Version 1.0.0
- Initial API release
- Basic delivery estimate functionality
- Rate limiting implementation
- Health monitoring
- Comprehensive error handling
- Request validation and logging