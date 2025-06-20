# Scripts Directory

## URL Synchronization System

### Overview
This directory contains automation scripts to keep your Shopify app and extension URLs synchronized during development.

### sync-urls.mjs
Automatically syncs the `application_url` from `shopify.app.toml` to the `api_endpoint` setting in `shopify.extension.toml`.

#### What it does:
1. Reads the `application_url` from `shopify.app.toml`
2. Constructs the API endpoint URL by appending `/data/api/delivery-estimate`
3. Updates the `default` value for `api_endpoint` in `shopify.extension.toml`

#### Usage:
```bash
# Run manually
npm run sync:urls

# Automatically runs before development server
npm run dev

# Start dev server without URL sync
npm run dev:no-sync
```

#### Benefits:
- ✅ Automatic URL synchronization during development
- ✅ No more manual updates when your tunnel URL changes
- ✅ Ensures extension always points to the correct app domain
- ✅ Works with Shopify CLI's `automatically_update_urls_on_dev = true`

#### How it works:
1. When you run `npm run dev`, the sync script runs first
2. It reads your current app URL from `shopify.app.toml`
3. Updates the extension's API endpoint to match
4. Then starts the development server

#### File Structure:
```
├── shopify.app.toml                    # Contains application_url
├── extensions/delivery-estimate/
│   └── shopify.extension.toml          # Contains api_endpoint (auto-updated)
└── scripts/
    ├── sync-urls.mjs                   # URL sync script
    └── README.md                       # This file
```

#### Troubleshooting:
- If the script fails, check that both TOML files exist and are properly formatted
- The script looks for `application_url = "..."` in `shopify.app.toml`
- It updates `default = "..."` under the `api_endpoint` setting in `shopify.extension.toml`

#### Development Workflow:
1. Run `npm run dev` (URLs sync automatically)
2. Your extension will use the correct app domain
3. When Shopify CLI updates your tunnel URL, run `npm run sync:urls` again if needed