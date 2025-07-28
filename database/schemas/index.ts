/**
 * Database Schema for StormWaterAI Enterprise System
 * Using Drizzle ORM with PostgreSQL
 */

import { pgTable, text, timestamp, uuid, integer, decimal, boolean, jsonb, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).notNull().default('user'), // user, admin, engineer, reviewer
  organization: varchar('organization', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  isActive: boolean('is_active').notNull().default(true),
  isVerified: boolean('is_verified').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  metadata: jsonb('metadata')
});

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 100 }).notNull(), // stormwater, drainage, erosion, etc.
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, on_hold, cancelled
  location: jsonb('location'), // { address, city, state, coordinates, etc. }
  scope: text('scope'),
  budget: decimal('budget', { precision: 12, scale: 2 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  clientInfo: jsonb('client_info'),
  regulations: jsonb('regulations'), // applicable regulations and standards
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  metadata: jsonb('metadata')
});

// Documents table
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  path: text('path').notNull(),
  category: varchar('category', { length: 100 }), // permit, report, drawing, photo, etc.
  projectId: uuid('project_id').references(() => projects.id),
  uploadedById: uuid('uploaded_by_id').notNull().references(() => users.id),
  isProcessed: boolean('is_processed').notNull().default(false),
  extractedContent: text('extracted_content'),
  extractedMetadata: jsonb('extracted_metadata'),
  processingStatus: varchar('processing_status', { length: 50 }).default('pending'), // pending, processing, completed, failed
  processingErrors: jsonb('processing_errors'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// AI Analysis Results table
export const analysisResults = pgTable('analysis_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id),
  projectId: uuid('project_id').references(() => projects.id),
  analysisType: varchar('analysis_type', { length: 100 }).notNull(), // compliance, risk, technical, etc.
  summary: text('summary'),
  keyFindings: jsonb('key_findings'),
  recommendations: jsonb('recommendations'),
  complianceStatus: jsonb('compliance_status'),
  riskAssessment: jsonb('risk_assessment'),
  confidence: decimal('confidence', { precision: 3, scale: 2 }),
  aiModel: varchar('ai_model', { length: 100 }),
  processingTime: integer('processing_time'), // in milliseconds
  createdAt: timestamp('created_at').notNull().defaultNow(),
  metadata: jsonb('metadata')
});

// Reports table
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(), // technical, executive, compliance, assessment
  projectId: uuid('project_id').notNull().references(() => projects.id),
  generatedById: uuid('generated_by_id').notNull().references(() => users.id),
  content: jsonb('content'), // structured report content
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, review, approved, published
  version: varchar('version', { length: 20 }).notNull().default('1.0'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  metadata: jsonb('metadata')
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // info, warning, error, success
  category: varchar('category', { length: 100 }), // document, project, system, etc.
  isRead: boolean('is_read').notNull().default(false),
  actionUrl: text('action_url'),
  relatedId: uuid('related_id'), // ID of related object (project, document, etc.)
  relatedType: varchar('related_type', { length: 50 }), // project, document, report, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at')
});

// Audit Log table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').notNull().defaultNow()
});

// Settings table
export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value'),
  description: text('description'),
  category: varchar('category', { length: 50 }),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  documents: many(documents),
  reports: many(reports),
  notifications: many(notifications),
  auditLogs: many(auditLogs)
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id]
  }),
  documents: many(documents),
  analysisResults: many(analysisResults),
  reports: many(reports)
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id]
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
    references: [users.id]
  }),
  analysisResults: many(analysisResults)
}));

export const analysisResultsRelations = relations(analysisResults, ({ one }) => ({
  document: one(documents, {
    fields: [analysisResults.documentId],
    references: [documents.id]
  }),
  project: one(projects, {
    fields: [analysisResults.projectId],
    references: [projects.id]
  })
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  project: one(projects, {
    fields: [reports.projectId],
    references: [projects.id]
  }),
  generatedBy: one(users, {
    fields: [reports.generatedById],
    references: [users.id]
  }),
  reviewedByUser: one(users, {
    fields: [reports.reviewedBy],
    references: [users.id]
  }),
  approvedByUser: one(users, {
    fields: [reports.approvedBy],
    references: [users.id]
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  })
}));

// Export all tables for use in migrations and queries
export const schema = {
  users,
  projects,
  documents,
  analysisResults,
  reports,
  notifications,
  auditLogs,
  settings
};