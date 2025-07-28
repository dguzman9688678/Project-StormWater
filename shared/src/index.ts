/**
 * Shared Utilities and Types
 * StormWaterAI Enterprise System
 */

export { ARCSECProtocol, type ARCSECMetadata, type ARCSECSeal } from './arcsec/index.js';

// Common types
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseEntity {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin' | 'engineer' | 'reviewer';
  isActive: boolean;
  isVerified: boolean;
}

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  type: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  ownerId: string;
}

// Common utilities
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString();
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export default {
  formatDate,
  formatCurrency,
  generateId,
};