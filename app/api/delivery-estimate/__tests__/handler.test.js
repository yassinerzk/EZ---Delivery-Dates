/**
 * Test suite for delivery estimate handler
 * Comprehensive tests for API functionality, error handling, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleDeliveryEstimate, handleCorsRequest } from '../handler';
import { metrics } from '../metrics';
import { rateLimiter } from '../utils';

// Mock dependencies
vi.mock('../../../shopify.server', () => ({
  authenticate: {
    public: {
      appProxy: vi.fn()
    }
  }
}));

vi.mock('../../../lib/supabase.server.ts', () => ({
  getMatchingDeliveryRules: vi.fn(),
  getDefaultDeliveryRule: vi.fn()
}));

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Test data
const mockSession = {
  shop: 'test-shop.myshopify.com',
  accessToken: 'test-token',
  id: 'test-session-id'
};

const mockDeliveryRule = {
  id: 1,
  shop_id: 'test-shop.myshopify.com',
  rule_name: 'US Standard',
  target_type: 'country',
  target_value: 'US',
  estimated_min_days: 3,
  estimated_max_days: 5,
  custom_message: 'Fast shipping to US',
  is_active: true,
  priority: 1
};

const mockDefaultRule = {
  id: 2,
  shop_id: 'test-shop.myshopify.com',
  rule_name: 'Default',
  target_type: 'default',
  target_value: 'default',
  estimated_min_days: 5,
  estimated_max_days: 7,
  custom_message: 'Standard shipping',
  is_active: true,
  priority: 999
};

describe('Delivery Estimate Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    metrics.reset();
    
    // Mock crypto.randomUUID
    global.crypto = {
      randomUUID: () => 'test-request-id-123'
    };
    
    // Mock Date.now for consistent timing
    vi.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleDeliveryEstimate', () => {
    it('should return delivery estimate for valid request', async () => {
      // Setup mocks
      const { authenticate } = await import('../../../shopify.server');
      const { getMatchingDeliveryRules } = await import('../../../lib/supabase.server.ts');
      
      authenticate.public.appProxy.mockResolvedValue({ session: mockSession });
      getMatchingDeliveryRules.mockResolvedValue({ data: [mockDeliveryRule], error: null });
      
      // Mock rate limiter
      vi.spyOn(rateLimiter, 'check').mockResolvedValue({
        allowed: true,
        ip: '127.0.0.1',
        remaining: 99,
        resetTime: Date.now() + 60000
      });
      
      // Create test request
      const request = new Request('https://test.com/api/delivery-estimate?productId=123&country=US');
      
      const response = await handleDeliveryEstimate(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.estimate).toBe('3-5 business days');
      expect(data.productId).toBe('123');
      expect(data.country).toBe('US');
      expect(data.customMessage).toBe('Fast shipping to US');
      expect(data.isDefault).toBe(false);
      expect(data.requestId).toBe('test-request-id-123');
      expect(data.timestamp).toBeDefined();
    });
    
    it('should return default estimate when no matching rules found', async () => {
      const { authenticate } = await import('../../../shopify.server');
      const { getMatchingDeliveryRules, getDefaultDeliveryRule } = await import('../../../lib/supabase.server.ts');
      
      authenticate.public.appProxy.mockResolvedValue({ session: mockSession });
      getMatchingDeliveryRules.mockResolvedValue({ data: [], error: null });
      getDefaultDeliveryRule.mockResolvedValue({ data: mockDefaultRule, error: null });
      
      vi.spyOn(rateLimiter, 'check').mockResolvedValue({ allowed: true, ip: '127.0.0.1' });
      
      const request = new Request('https://test.com/api/delivery-estimate?productId=123&country=CA');
      
      const response = await handleDeliveryEstimate(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.estimate).toBe('5-7 business days');
      expect(data.isDefault).toBe(true);
      expect(data.customMessage).toBe('Standard shipping');
    });
    
    it('should return generic default when no rules exist', async () => {
      const { authenticate } = await import('../../../shopify.server');
      const { getMatchingDeliveryRules, getDefaultDeliveryRule } = await import('../../../lib/supabase.server.ts');
      
      authenticate.public.appProxy.mockResolvedValue({ session: mockSession });
      getMatchingDeliveryRules.mockResolvedValue({ data: [], error: null });
      getDefaultDeliveryRule.mockResolvedValue({ data: null, error: null });
      
      vi.spyOn(rateLimiter, 'check').mockResolvedValue({ allowed: true, ip: '127.0.0.1' });
      
      const request = new Request('https://test.com/api/delivery-estimate?productId=123&country=FR');
      
      const response = await handleDeliveryEstimate(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.estimate).toBe('5-7 business days');
      expect(data.isDefault).toBe(true);
    });
    
    it('should return 400 for missing productId', async () => {
      const { authenticate } = await import('../../../shopify.server');
      authenticate.public.appProxy.mockResolvedValue({ session: mockSession });
      
      vi.spyOn(rateLimiter, 'check').mockResolvedValue({ allowed: true, ip: '127.0.0.1' });
      
      const request = new Request('https://test.com/api/delivery-estimate?country=US');
      
      const response = await handleDeliveryEstimate(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Product ID is required and must be a non-empty string');
      expect(data.requestId).toBe('test-request-id-123');
    });
    
    it('should return 400 for invalid productId format', async () => {
      const { authenticate } = await import('../../../shopify.server');
      authenticate.public.appProxy.mockResolvedValue({ session: mockSession });
      
      vi.spyOn(rateLimiter, 'check').mockResolvedValue({ allowed: true, ip: '127.0.0.1' });
      
      const request = new Request('https://test.com/api/delivery-estimate?productId=abc123&country=US');
      
      const response = await handleDeliveryEstimate(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Product ID must contain only numbers');
    });
    
    it('should return 400 for invalid country format', async () => {
      const { authenticate } = await import('../../../shopify.server');
      authenticate.public.appProxy.mockResolvedValue({ session: mockSession });
      
      vi.spyOn(rateLimiter, 'check').mockResolvedValue({ allowed: true, ip: '127.0.0.1' });
      
      const request = new Request('https://test.com/api/delivery-estimate?productId=123&country=US123');
      
      const response = await handleDeliveryEstimate(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Country code must contain only letters');
    });
    
    it('should return 429 when rate limit exceeded', async () => {
      const { authenticate } = await import('../../../shopify.server');
      authenticate.public.appProxy.mockResolvedValue({ session: mockSession });
      
      vi.spyOn(rateLimiter, 'check').mockResolvedValue({
        allowed: false,
        ip: '127.0.0.1',
        retryAfter: 60,
        remaining: 0
      });
      
      const request = new Request('https://test.com/api/delivery-estimate?productId=123&country=US');
      
      const response = await handleDeliveryEstimate(request);
      const data = await response.json();
      
      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
      expect(data.retryAfter).toBe(60);
      expect(response.headers.get('Retry-After')).toBe('60');
    });
    
    it('should return 500 for database errors', async () => {
      const { authenticate } = await import('../../../shopify.server');
      const { getMatchingDeliveryRules } = await import('../../../lib/supabase.server.ts');
      
      authenticate.public.appProxy.mockResolvedValue({ session: mockSession });
      getMatchingDeliveryRules.mockResolvedValue({ 
        data: null, 
        error: new Error('Database connection failed') 
      });
      
      vi.spyOn(rateLimiter, 'check').mockResolvedValue({ allowed: true, ip: '127.0.0.1' });
      
      const request = new Request('https://test.com/api/delivery-estimate?productId=123&country=US');
      
      const response = await handleDeliveryEstimate(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch delivery estimate');
    });
    
    it('should return 500 for unexpected errors', async () => {
      const { authenticate } = await import('../../../shopify.server');
      
      authenticate.public.appProxy.mockRejectedValue(new Error('Authentication failed'));
      
      vi.spyOn(rateLimiter, 'check').mockResolvedValue({ allowed: true, ip: '127.0.0.1' });
      
      const request = new Request('https://test.com/api/delivery-estimate?productId=123&country=US');
      
      const response = await handleDeliveryEstimate(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.requestId).toBe('test-request-id-123');
    });
    
    it('should record metrics for successful requests', async () => {
      const { authenticate } = await import('../../../shopify.server');
      const { getMatchingDeliveryRules } = await import('../../../lib/supabase.server.ts');
      
      authenticate.public.appProxy.mockResolvedValue({ session: mockSession });
      getMatchingDeliveryRules.mockResolvedValue({ data: [mockDeliveryRule], error: null });
      
      vi.spyOn(rateLimiter, 'check').mockResolvedValue({ allowed: true, ip: '127.0.0.1' });
      vi.spyOn(metrics, 'recordRequest');
      
      const request = new Request('https://test.com/api/delivery-estimate?productId=123&country=US');
      
      await handleDeliveryEstimate(request);
      
      expect(metrics.recordRequest).toHaveBeenCalledWith({
        endpoint: 'delivery-estimate',
        method: 'GET',
        status: 200,
        duration: expect.any(Number),
        shopId: 'test-shop.myshopify.com'
      });
    });
  });
  
  describe('handleCorsRequest', () => {
    it('should return proper CORS headers for OPTIONS request', async () => {
      const request = new Request('https://test.com/api/delivery-estimate', {
        method: 'OPTIONS'
      });
      
      const response = await handleCorsRequest(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });
    
    it('should return 405 for non-OPTIONS requests', async () => {
      const request = new Request('https://test.com/api/delivery-estimate', {
        method: 'POST'
      });
      
      const response = await handleCorsRequest(request);
      const data = await response.json();
      
      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });
  });
});

// Integration tests
describe('Delivery Estimate Integration', () => {
  it('should handle complete request flow with real-like data', async () => {
    const { authenticate } = await import('../../../shopify.server');
    const { getMatchingDeliveryRules } = await import('../../../lib/supabase.server.ts');
    
    // Setup realistic scenario
    authenticate.public.appProxy.mockResolvedValue({ 
      session: {
        shop: 'real-store.myshopify.com',
        accessToken: 'real-token',
        id: 'real-session'
      }
    });
    
    getMatchingDeliveryRules.mockResolvedValue({ 
      data: [{
        id: 1,
        shop_id: 'real-store.myshopify.com',
        rule_name: 'Express US',
        target_type: 'country',
        target_value: 'US',
        estimated_min_days: 1,
        estimated_max_days: 2,
        custom_message: 'Express delivery available!',
        is_active: true,
        priority: 1
      }], 
      error: null 
    });
    
    vi.spyOn(rateLimiter, 'check').mockResolvedValue({ allowed: true, ip: '192.168.1.1' });
    
    const request = new Request(
      'https://real-store.myshopify.com/data/api/delivery-estimate?productId=7891234567890&country=US'
    );
    
    const response = await handleDeliveryEstimate(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.estimate).toBe('1-2 business days');
    expect(data.customMessage).toBe('Express delivery available!');
    expect(data.isDefault).toBe(false);
    expect(data.requestId).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });
});