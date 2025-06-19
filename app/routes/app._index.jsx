import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  DataTable,
  Badge,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getDeliveryRules } from "../lib/supabase.server.ts";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;

  // Fetch delivery rules from Supabase (or mock data if not configured)
  const { data: deliveryRules, error } = await getDeliveryRules(shop);
  
  if (error) {
    console.error('Error loading delivery rules:', error);
    return { deliveryRules: [], error: error.message };
  }

  // Transform data to match expected format for the new schema
  const formattedRules = deliveryRules.map(rule => ({
    id: rule.id,
    targetType: rule.target_type,
    targetValue: rule.target_value,
    countries: rule.country_codes || [],
    estimatedMinDays: rule.estimated_min_days,
    estimatedMaxDays: rule.estimated_max_days,
    customMessage: rule.custom_message,
    status: rule.enabled ? "active" : "inactive"
  }));

  return { deliveryRules: formattedRules };
};

export default function Index() {
  const { deliveryRules } = useLoaderData();
  const navigate = useNavigate();

  const handleAddNewRule = () => {
    navigate('/app/rules/new');
  };

  const rows = deliveryRules.map((rule) => [
    `${rule.targetType}: ${rule.targetValue}`,
    rule.countries.join(", ") || "All countries",
    `${rule.estimatedMinDays}-${rule.estimatedMaxDays} days`,
    rule.customMessage || "Standard delivery",
    <Badge key={rule.id} status={rule.status === "active" ? "success" : "critical"}>
      {rule.status}
    </Badge>,
  ]);

  return (
    <Page>
      <TitleBar title="EstimaTrack Delivery Rules" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Delivery Rules Dashboard
                  </Text>
                  <Text variant="bodyMd" as="p">
                    These delivery rules are automatically read from your Supabase database and displayed on product pages based on product tags, collections, and customer location.
                  </Text>
                </BlockStack>
                
                {deliveryRules.length > 0 ? (
                  <DataTable
                    columnContentTypes={[
                      "text",
                      "text", 
                      "text",
                      "text",
                      "text",
                    ]}
                    headings={[
                      "Target",
                      "Countries",
                      "Delivery Time",
                      "Message",
                      "Status",
                    ]}
                    rows={rows}
                  />
                ) : (
                  <EmptyState
                      heading="No delivery rules configured"
                      action={{
                        content: "Add New Estimated Delivery Rules",
                        onAction: handleAddNewRule,
                      }}
                    secondaryAction={{
                      content: "View Documentation",
                      url: "https://github.com/your-repo/docs",
                      external: true,
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Create delivery rules to show estimated delivery times on your product pages. Rules can target specific products, collections, or tags and display different estimates based on customer location.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    How It Works
                  </Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      <strong>1. Database Rules:</strong> Rules are stored in your Supabase database with targeting criteria.
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>2. Smart Matching:</strong> The app matches products based on ID, SKU, tags, or collections.
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>3. Location Aware:</strong> Delivery estimates adjust based on customer's country or region.
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>4. Real-time Display:</strong> Estimates appear automatically on product pages.
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Setup Required
                  </Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      To start using EstimaTrack, you'll need to:
                    </Text>
                    <Text as="p" variant="bodyMd">
                      • Configure your Supabase database connection
                    </Text>
                    <Text as="p" variant="bodyMd">
                      • Create delivery rules in your database
                    </Text>
                    <Text as="p" variant="bodyMd">
                      • Install the theme extension on your storefront
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
