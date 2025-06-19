import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Global test setup
    globals: true,
    setupFiles: ['./test-setup.js'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'build/',
        'public/',
        'extensions/',
        '**/*.test.js',
        '**/*.config.js',
        'test-setup.js'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Test file patterns
    include: [
      'app/**/*.{test,spec}.{js,ts,jsx,tsx}',
      '**/__tests__/**/*.{js,ts,jsx,tsx}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/',
      'build/',
      'public/',
      'extensions/'
    ],
    
    // Test timeout
    testTimeout: 10000,
    
    // Hooks timeout
    hookTimeout: 10000,
    
    // Reporter configuration
    reporter: ['verbose', 'json'],
    
    // Watch options
    watch: {
      exclude: [
        'node_modules/**',
        'build/**',
        'public/**'
      ]
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
      '@': resolve(__dirname, 'app')
    }
  },
  
  // Define global variables for tests
  define: {
    'process.env.NODE_ENV': '"test"'
  }
});