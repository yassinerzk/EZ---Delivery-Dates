import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;

  // Session scope updates are handled automatically by Shopify's session storage
  // No manual database operations needed when using MemorySessionStorage
  if (session) {
    console.log(`Session scope updated to: ${current.toString()}`);
  }

  return new Response();
};
