/**
 * Test setup file for Vitest
 * Configures global mocks and test environment
 */

import { vi } from 'vitest';

// Mock global objects
global.crypto = {
  randomUUID: vi.fn(() => 'test-uuid-123'),
  getRandomValues: vi.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
};

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// Mock process.env
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  SHOPIFY_API_KEY: 'test-api-key',
  SHOPIFY_API_SECRET: 'test-api-secret',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  APP_URL: 'https://test-app.com'
};

// Mock Request and Response for Node.js environment
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new Map(Object.entries(options.headers || {}));
      this.body = options.body;
    }
    
    headers = {
      get: vi.fn((name) => {
        const headers = {
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'test-agent',
          'content-type': 'application/json'
        };
        return headers[name.toLowerCase()];
      })
    };
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, options = {}) {
      this.body = body;
      this.status = options.status || 200;
      this.statusText = options.statusText || 'OK';
      this.headers = new Map(Object.entries(options.headers || {}));
    }
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  };
}

// Mock URL constructor
if (typeof URL === 'undefined') {
  global.URL = class URL {
    constructor(url) {
      const parts = url.split('?');
      this.href = url;
      this.origin = parts[0].split('/').slice(0, 3).join('/');
      this.pathname = parts[0].split('/').slice(3).join('/');
      this.search = parts[1] ? '?' + parts[1] : '';
      this.searchParams = new URLSearchParams(parts[1] || '');
    }
  };
}

// Mock URLSearchParams
if (typeof URLSearchParams === 'undefined') {
  global.URLSearchParams = class URLSearchParams {
    constructor(search = '') {
      this.params = new Map();
      if (search) {
        search.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key) {
            this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
          }
        });
      }
    }
    
    get(key) {
      return this.params.get(key);
    }
    
    set(key, value) {
      this.params.set(key, value);
    }
    
    has(key) {
      return this.params.has(key);
    }
    
    toString() {
      return Array.from(this.params.entries())
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    }
  };
}

// Setup test utilities
global.testUtils = {
  createMockRequest: (url, options = {}) => {
    return new Request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'test-agent',
        ...options.headers
      },
      ...options
    });
  },
  
  createMockSession: (overrides = {}) => {
    return {
      shop: 'test-shop.myshopify.com',
      accessToken: 'test-token',
      id: 'test-session-id',
      ...overrides
    };
  },
  
  createMockDeliveryRule: (overrides = {}) => {
    return {
      id: 1,
      shop_id: 'test-shop.myshopify.com',
      rule_name: 'Test Rule',
      target_type: 'country',
      target_value: 'US',
      estimated_min_days: 3,
      estimated_max_days: 5,
      custom_message: 'Test message',
      is_active: true,
      priority: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides
    };
  },
  
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  mockTimers: () => {
    vi.useFakeTimers();
    return {
      advance: (ms) => vi.advanceTimersByTime(ms),
      restore: () => vi.useRealTimers()
    };
  }
};

// Clean up after each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});