import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // Session cleanup is handled automatically by Shopify's session storage
  // No manual database operations needed when using MemorySessionStorage
  if (session) {
    console.log(`App uninstalled for shop: ${shop}`);
  }

  return new Response();
};
