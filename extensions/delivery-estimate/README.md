# EstimaTrack Delivery Estimate Extension

A Shopify theme app extension that displays dynamic delivery estimates based on product details and customer location.

## Features

- **Real-time Delivery Estimates**: Fetches delivery times from the modular API
- **Country Detection**: Automatically detects customer's country from browser locale
- **Manual Country Selection**: Allows customers to select their delivery country
- **Expected Delivery Dates**: Calculates and displays expected delivery dates
- **Responsive Design**: Mobile-friendly interface with modern styling
- **Error Handling**: Robust error handling with retry functionality
- **Loading States**: Smooth loading animations and state management

## API Integration

This extension integrates with the modular delivery estimate API:

- **Endpoint**: `/data/api/delivery-estimate`
- **Method**: GET
- **Parameters**:
  - `productId`: Shopify product ID
  - `tags`: Product tags (comma-separated)
  - `country`: Customer's country code
  - `shop`: Shop domain
  - `variantId`: Product variant ID
  - `productType`: Product type
  - `vendor`: Product vendor

## Configuration

The extension can be configured through the Shopify theme editor:

### Settings

1. **API Endpoint**: The endpoint for fetching delivery estimates
   - Default: `/data/api/delivery-estimate`
   - Uses the modular API structure

2. **Default Country**: Fallback country for delivery estimates
   - Options: US, CA, UK, AU, DE, FR, JP
   - Default: US

3. **Enable Geolocation**: Automatically detect customer's country
   - Default: true
   - Uses browser locale for detection

### Block Settings

1. **Block Title**: Customizable title for the delivery estimate block
   - Default: "Estimated Delivery"

2. **Show Country Selector**: Display country selection dropdown
   - Default: true
   - Allows customers to change delivery country

3. **Show Expected Delivery Date**: Calculate and display delivery dates
   - Default: true
   - Calculates business days excluding weekends

## Implementation Details

### Data Attributes

The extension uses the following data attributes from the product:

- `data-product-id`: Product ID
- `data-product-tags`: Product tags
- `data-product-type`: Product type
- `data-product-vendor`: Product vendor
- `data-shop-domain`: Shop domain
- `data-variant-id`: Selected variant ID

### Error Handling

- **Network Errors**: Automatic retry with exponential backoff
- **API Errors**: Displays user-friendly error messages
- **Invalid Responses**: Validates API response structure
- **Offline Detection**: Retries when connection is restored

### Performance Features

- **Caching**: Prevents browser caching with `cache: 'no-cache'`
- **Debouncing**: Prevents excessive API calls
- **Lazy Loading**: Only loads when block is visible
- **Minimal DOM Manipulation**: Efficient state updates

## Supported Countries

The extension supports delivery estimates for:

- 🇺🇸 United States (US)
- 🇨🇦 Canada (CA)
- 🇬🇧 United Kingdom (GB)
- 🇦🇺 Australia (AU)
- 🇩🇪 Germany (DE)
- 🇫🇷 France (FR)
- 🇯🇵 Japan (JP)
- 🇮🇹 Italy (IT)
- 🇪🇸 Spain (ES)
- 🇳🇱 Netherlands (NL)
- 🌍 Other Countries (*)

## Browser Compatibility

- Modern browsers with ES6+ support
- Fetch API support
- CSS Grid and Flexbox support
- Mobile browsers (iOS Safari, Chrome Mobile)

## Debugging

The extension logs detailed error information to the browser console:

```javascript
{
  productId: "123456789",
  productTags: "tag1,tag2",
  country: "US",
  shopDomain: "example.myshopify.com",
  variantId: "987654321",
  productType: "Electronics",
  productVendor: "Brand Name",
  apiEndpoint: "/data/api/delivery-estimate",
  error: "Error message",
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

## Installation

1. The extension is automatically available in the theme editor
2. Add the "Delivery Estimate" block to product pages
3. Configure settings as needed
4. Test with different products and countries

## Maintenance

- Monitor API response times and error rates
- Update country list as needed
- Review and update styling for theme compatibility
- Test with new Shopify theme updates