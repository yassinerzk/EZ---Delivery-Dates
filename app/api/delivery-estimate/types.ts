/**
 * TypeScript type definitions for the Delivery Estimate API
 * Provides type safety and better developer experience
 */

// Request types
export interface DeliveryEstimateRequest {
  productId: string;
  country: string;
  shop?: string;
  variantId?: string;
  tags?: string;
}

export interface ValidationResult {
  valid: boolean;
  data?: DeliveryEstimateRequest;
  errors?: string[];
}

// Response types
export interface DeliveryEstimateResponse {
  estimate: string;
  productId: string;
  country: string;
  customMessage?: string;
  isDefault: boolean;
  requestId: string;
  timestamp: string;
}

export interface ErrorResponse {
  error: string;
  details?: string[];
  requestId: string;
  timestamp: string;
  retryAfter?: number;
}

// Database types
export interface DeliveryRule {
  id: number;
  shop_id: string;
  rule_name: string;
  target_type: 'product_id' | 'product_tag' | 'variant_id' | 'country' | 'default';
  target_value: string;
  estimated_min_days: number;
  estimated_max_days: number;
  custom_message?: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  tags: string[];
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  title: string;
  price: string;
}

// Rate limiting types
export interface RateLimitResult {
  allowed: boolean;
  ip: string;
  retryAfter?: number;
  remaining?: number;
  resetTime?: number;
}

export interface RateLimitStats {
  totalIPs: number;
  windowMs: number;
  maxRequests: number;
  activeRequests: number;
}

// Metrics types
export interface RequestMetrics {
  endpoint: string;
  method: string;
  status: number;
  duration: number;
  shopId?: string;
  error?: string;
}

export interface PerformanceMetrics {
  totalDuration: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
}

export interface ErrorMetrics {
  byType: Record<string, number>;
  recent: Array<{
    timestamp: string;
    error: string;
    endpoint: string;
    method: string;
    status: number;
    shopId?: string;
  }>;
}

export interface ApiStats {
  requests: {
    total: number;
    success: number;
    errors: number;
    byStatus: Record<string, number>;
    byShop: Record<string, number>;
    byEndpoint: Record<string, number>;
  };
  performance: PerformanceMetrics;
  errors: ErrorMetrics;
  timestamp: string;
  uptime: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  errorRate: string;
  averageResponseTime: string;
  totalRequests: number;
  issues: string[];
  timestamp: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  api: HealthStatus;
  rateLimiting: RateLimitStats;
  performance: PerformanceMetrics;
  requests: {
    total: number;
    success: number;
    errors: number;
    successRate: string;
    byStatus: Record<string, number>;
    topShops: Array<{ shop: string; requests: number }>;
  };
  recentErrors: Array<{
    timestamp: string;
    error: string;
    endpoint: string;
    method: string;
    status: number;
    shopId?: string;
  }>;
}

// Logger types
export interface LogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  context: string;
  message: string;
  environment: string;
  [key: string]: any;
}

export interface LogMetadata {
  requestId?: string;
  shopId?: string;
  productId?: string;
  country?: string;
  duration?: number;
  error?: string;
  stack?: string;
  ip?: string;
  [key: string]: any;
}

// Shopify types
export interface ShopifySession {
  shop: string;
  accessToken: string;
  id: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  accountOwner?: boolean;
  locale?: string;
  collaborator?: boolean;
  emailVerified?: boolean;
}

export interface ShopifyAdmin {
  rest: any;
  graphql: any;
}

// Utility types
export type DeliveryEstimateType = 
  | 'STANDARD'
  | 'EXPRESS'
  | 'OVERNIGHT'
  | 'CUSTOM';

export const DELIVERY_ESTIMATE_TYPES: Record<DeliveryEstimateType, string> = {
  STANDARD: 'Standard Delivery',
  EXPRESS: 'Express Delivery',
  OVERNIGHT: 'Overnight Delivery',
  CUSTOM: 'Custom Delivery'
};

export const DEFAULT_COUNTRY = 'US';
export const DEFAULT_ESTIMATE = '5-7 business days';

// Environment configuration
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  APP_URL: string;
}

// Function signatures
export type ValidateRequestFunction = (
  productId: string,
  country: string
) => string | null;

export type CalculateDeliveryEstimateFunction = (
  params: {
    productId: string;
    country: string;
    admin: ShopifyAdmin;
    session: ShopifySession;
    requestId: string;
  }
) => Promise<DeliveryEstimateResponse>;

export type FormatDeliveryEstimateFunction = (
  minDays: number,
  maxDays: number
) => string;

export type CreateCorsHeadersFunction = () => Record<string, string>;