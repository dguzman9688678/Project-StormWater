/**
 * Test Configuration for StormWaterAI Enterprise System
 * Comprehensive testing setup with unit, integration, and e2e tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import React from 'react';

// Test utilities
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export const renderWithProviders = (
  ui: React.ReactElement,
  {
    initialEntries = ['/'],
    ...renderOptions
  } = {}
) => {
  const router = createMemoryRouter([
    {
      path: '*',
      element: ui,
    },
  ], {
    initialEntries,
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestWrapper>
      <RouterProvider router={router} />
    </TestWrapper>
  );

  return {
    router,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// Mock data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  isActive: true,
  isVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: 'project-1',
  name: 'Test Stormwater Project',
  description: 'A test project for stormwater management',
  type: 'stormwater',
  status: 'active',
  location: {
    address: '123 Test St',
    city: 'Test City',
    state: 'CA',
    zipCode: '12345',
  },
  ownerId: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockDocument = (overrides = {}) => ({
  id: 'doc-1',
  filename: 'test-document.pdf',
  originalName: 'Test Document.pdf',
  mimeType: 'application/pdf',
  size: 1024000,
  path: '/uploads/test-document.pdf',
  category: 'report',
  projectId: 'project-1',
  uploadedById: 'user-1',
  isProcessed: true,
  extractedContent: 'This is test extracted content from the document.',
  processingStatus: 'completed',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export default {
  createTestQueryClient,
  TestWrapper,
  renderWithProviders,
  createMockUser,
  createMockProject,
  createMockDocument,
};