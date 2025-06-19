# EstimaTrack Delivery Rules - Shopify App

A powerful Shopify embedded app that displays dynamic delivery estimates on product pages based on configurable rules stored in a Supabase database. The app intelligently matches products with delivery rules using product ID/SKU, tags, collections, customer country/region, and Shopify variant ID.

## Features

- 🚀 **Dynamic Delivery Estimates**: Display real-time delivery estimates on product pages
- 🎯 **Smart Targeting**: Match products using multiple criteria (tags, collections, variants, countries)
- 🗄️ **Database-Driven Rules**: Store and manage delivery rules in Supabase
- 🌍 **Multi-Country Support**: Different estimates for different countries/regions
- 📱 **Theme Extension**: Seamlessly integrates with any Shopify theme
- ⚡ **Real-time Updates**: Instant updates when rules change in the database
- 🔧 **Easy Management**: Admin dashboard to view and manage delivery rules

## Prerequisites

- Node.js 18+
- Shopify CLI 3.0+
- Shopify Partner account
- Supabase account (for database)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
```env
# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SCOPES=write_products
HOST=https://your-app-url.com

# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Set Up Supabase Database

Create a table called `delivery_rules` in your Supabase database:

```sql
CREATE TABLE delivery_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  product_tags TEXT[] DEFAULT '{}',
  product_collections TEXT[] DEFAULT '{}',
  product_skus TEXT[] DEFAULT '{}',
  variant_ids TEXT[] DEFAULT '{}',
  countries TEXT[] DEFAULT '{}',
  estimated_days VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_delivery_rules_status ON delivery_rules(status);
CREATE INDEX idx_delivery_rules_priority ON delivery_rules(priority DESC);
CREATE INDEX idx_delivery_rules_countries ON delivery_rules USING GIN(countries);
CREATE INDEX idx_delivery_rules_tags ON delivery_rules USING GIN(product_tags);
```

### 4. Add Sample Data

```sql
INSERT INTO delivery_rules (name, product_tags, countries, estimated_days, status, priority) VALUES
('Express Electronics', '{"electronics", "gadgets"}', '{"US", "CA"}', '1-2 business days', 'active', 10),
('Standard Clothing', '{"clothing", "apparel"}', '{"US", "CA", "UK"}', '3-5 business days', 'active', 5),
('International Shipping', '{"*"}', '{"*"}', '7-14 business days', 'active', 1);
```

### 5. Start Development Server

```bash
npm run dev
```

### 6. Deploy Theme Extension

The app includes a theme extension that displays delivery estimates on product pages. After installing the app, merchants can add the "Delivery Estimate" block to their product pages through the theme editor.

## Database Schema

### delivery_rules Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `name` | VARCHAR(255) | Rule name for identification |
| `product_tags` | TEXT[] | Array of product tags to match |
| `product_collections` | TEXT[] | Array of collection handles to match |
| `product_skus` | TEXT[] | Array of product SKUs to match |
| `variant_ids` | TEXT[] | Array of Shopify variant IDs to match |
| `countries` | TEXT[] | Array of country codes (use "*" for all) |
| `estimated_days` | VARCHAR(100) | Delivery estimate text |
| `status` | VARCHAR(20) | Rule status (active/inactive) |
| `priority` | INTEGER | Rule priority (higher = more important) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

## Rule Matching Logic

The app matches delivery rules using the following priority:

1. **Exact Variant ID Match**: If a rule specifies variant IDs and the current variant matches
2. **Product SKU Match**: If a rule specifies SKUs and the product SKU matches
3. **Collection Match**: If a rule specifies collections and the product belongs to those collections
4. **Tag Match**: If a rule specifies tags and the product has those tags
5. **Wildcard Match**: Rules with "*" in product criteria match all products
6. **Country Match**: Rules must match the customer's country or use "*" for all countries
7. **Priority**: Higher priority rules are preferred when multiple rules match

## API Endpoints

### GET `/api/delivery-estimate`

Get delivery estimate for a specific product.

**Parameters:**
- `productId` (required): Shopify product ID
- `tags` (optional): Comma-separated product tags
- `country` (optional): Customer country code (default: "US")
- `variantId` (optional): Shopify variant ID

**Response:**
```json
{
  "estimate": "1-2 business days",
  "ruleName": "Express Electronics",
  "productId": "123456789",
  "country": "US"
}
```

### POST `/api/delivery-estimate`

Get detailed delivery estimates with multiple matching rules.

**Request Body:**
```json
{
  "productId": "123456789",
  "tags": ["electronics", "gadgets"],
  "collections": ["featured-products"],
  "country": "US",
  "variantId": "987654321",
  "customerId": "customer_123"
}
```

## Theme Extension Usage

After installing the app, merchants can:

1. Go to **Online Store > Themes > Customize**
2. Navigate to a product page
3. Add the **"Delivery Estimate"** block
4. Configure the block settings:
   - Block title
   - Show/hide country selector
   - Default country

## Development

### Project Structure

```
app/
├── lib/
│   └── supabase.server.js     # Supabase client and database functions
├── routes/
│   ├── app._index.jsx         # Admin dashboard
│   └── api.delivery-estimate.jsx # API endpoints
extensions/
└── delivery-estimate/
    ├── blocks/
    │   └── delivery-estimate.liquid # Theme extension block
    └── shopify.extension.toml   # Extension configuration
```

### Key Files

- **`app/lib/supabase.server.js`**: Database connection and query functions
- **`app/routes/app._index.jsx`**: Admin dashboard for viewing delivery rules
- **`app/routes/api.delivery-estimate.jsx`**: API endpoints for delivery estimates
- **`extensions/delivery-estimate/blocks/delivery-estimate.liquid`**: Theme extension for product pages

### Adding New Features

1. **New Rule Criteria**: Modify the `getMatchingDeliveryRules` function in `supabase.server.js`
2. **UI Improvements**: Update the theme extension in `delivery-estimate.liquid`
3. **Admin Features**: Add new routes and components for rule management

## Deployment

### Deploy to Shopify

```bash
npm run deploy
```

### Environment Setup

Make sure to set up your production environment variables in your hosting platform:

- Shopify app credentials
- Supabase production database URL and keys
- Proper HOST URL for your deployed app

## Troubleshooting

### Common Issues

1. **"Supabase credentials not found"**: Check your `.env` file and ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
2. **Theme extension not showing**: Ensure the app is installed and the theme extension is added to the product page
3. **API errors**: Check the browser console and server logs for detailed error messages

### Mock Data Mode

If Supabase is not configured, the app will automatically use mock data for development and testing.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Check the [Shopify App Development documentation](https://shopify.dev/docs/apps)
- Review [Supabase documentation](https://supabase.com/docs)
- Open an issue in this repository
