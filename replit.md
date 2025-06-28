# Stormwater-AI Recommendations System

## Overview

This is a comprehensive stormwater support tool that provides developer, SWPPP, and erosion control recommendations from uploaded reference documents. The system combines AI-powered document analysis with stormwater best practices for management, allowing users to upload and analyze stormwater documents, receive AI-generated recommendations, and access organized guidelines for professional stormwater support.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Library**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Component Architecture**: Modular component structure with shared UI components

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **File Processing**: Multi-format document processing (PDF, DOCX, TXT)
- **AI Integration**: OpenAI GPT-4 integration for document analysis
- **API Design**: RESTful API with proper error handling and validation

### Database Schema
- **Documents**: Stores uploaded files with metadata and extracted content
- **Recommendations**: AI-generated and template recommendations categorized by type
- **AI Analyses**: Stores analysis results with insights and queries
- **Categories**: QSD, SWPPP, Erosion Control with subcategories

## Key Components

### Document Processing Engine
- Multi-format file support (PDF, DOCX, TXT)
- Text extraction and content analysis
- File validation and size limits (10MB)
- Temporary file cleanup for security

### AI Analysis Service
- OpenAI GPT-4 integration for intelligent document analysis
- Specialized prompts for stormwater engineering contexts
- Fallback analysis when API is unavailable
- Structured recommendation generation

### Recommendation System
- Template recommendations for common scenarios
- AI-generated recommendations from document analysis
- Categorization by engineering discipline
- Bookmark functionality for important recommendations

### Search and Discovery
- Global search across documents, recommendations, and analyses
- Real-time search with debouncing
- Category-based filtering
- Recent items tracking

## Data Flow

1. **Document Upload**: Users upload engineering documents through drag-and-drop interface
2. **Content Extraction**: Backend processes files and extracts text content
3. **AI Analysis**: OpenAI analyzes content and generates engineering recommendations
4. **Storage**: Documents, analyses, and recommendations stored in PostgreSQL
5. **Presentation**: Frontend displays organized results with search and filtering capabilities

## External Dependencies

### Required Services
- **PostgreSQL Database**: Primary data storage (configured via DATABASE_URL)
- **OpenAI API**: For AI-powered document analysis (OPENAI_API_KEY required)

### Optional Integrations
- **NOAA API**: Weather data integration (referenced in attached files but not actively used)
- **Maps API**: Geographic data integration (placeholder for future features)

### Development Tools
- **Neon Database**: Serverless PostgreSQL provider (via @neondatabase/serverless)
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Production builds for server-side code

## Deployment Strategy

### Build Process
- Frontend: Vite builds React app to `dist/public`
- Backend: ESBuild bundles Express server to `dist/index.js`
- Database: Drizzle migrations applied via `db:push` command

### Environment Configuration
- `NODE_ENV`: Environment setting (development/production)
- `DATABASE_URL`: PostgreSQL connection string (required)
- `OPENAI_API_KEY`: OpenAI API access (required for AI features)
- File upload limits and allowed types configurable

### Production Considerations
- Server configured for node platform with external packages
- Static file serving from built frontend
- Graceful error handling and logging
- CORS configuration for cross-origin requests

## Changelog

- June 28, 2025. Initial setup

## User Preferences

- **Communication Style**: Simple, everyday language
- **Project Ownership**: All intellectual property belongs to Daniel Guzman (guzman.danield@outlook.com)
- **Application Purpose**: Personal stormwater support tool providing practical developer, SWPPP, and erosion control recommendations
- **Focus**: Actual support for stormwater work, not projects or user management
- **Integration Goal**: Dashboard that provides comprehensive recommendations from uploaded reference documents

## Recent Development Progress

- **June 28, 2025**: Created comprehensive React/Express dashboard with:
  - Document upload and processing functionality
  - AI-powered analysis integration
  - Categorized recommendations (Developer, SWPPP, Erosion Control)
  - Global search across documents and recommendations
  - Template recommendations pre-loaded for demonstration
  - Professional UI with sidebar navigation and responsive design
  - Ready for integration with existing Python/FastAPI backend components