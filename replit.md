# Stormwater AI

## Overview

This is a comprehensive AI-powered stormwater solution system that automatically generates professional documents based on uploaded problem scenarios. When users upload any problem document (e.g., "collapsing culvert"), the system analyzes the entire document library and auto-generates relevant solution documents including inspection forms, Job Safety Analyses (JSAs), maintenance plans, monitoring protocols, and compliance checklists - all with proper citations from the source library. The system transforms simple problem descriptions into complete actionable solution packages for professional stormwater management.

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
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations (DatabaseStorage for permanent persistence)
- **File Processing**: Comprehensive format support (PDF, DOCX, DOC, TXT, XLSX, XLS, CSV, JSON, XML, RTF, JPG, JPEG, PNG, GIF, BMP, WEBP, HTML, HTM, MD, LOG)
- **AI Integration**: Anthropic Claude integration for document analysis
- **API Design**: RESTful API with proper error handling and validation

### Database Schema
- **Documents**: Stores uploaded files with metadata and extracted content
- **Recommendations**: AI-generated and template recommendations categorized by type
- **AI Analyses**: Stores analysis results with insights and queries
- **Categories**: QSD, SWPPP, Erosion Control with subcategories

## Key Components

### Document Processing Engine
- Comprehensive file support (PDF, DOCX, DOC, TXT, XLSX, XLS, CSV, JSON, XML, RTF, JPG, JPEG, PNG, GIF, BMP, WEBP, HTML, HTM, MD, LOG)
- Text extraction and content analysis for all formats
- File validation and size limits (10MB)
- Temporary file cleanup for security

### AI Analysis Service
- Anthropic Claude integration for intelligent document analysis
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
3. **AI Analysis**: Anthropic Claude analyzes content and generates engineering recommendations
4. **Storage**: Documents, analyses, and recommendations stored in PostgreSQL
5. **Presentation**: Frontend displays organized results with search and filtering capabilities

## External Dependencies

### Required Services
- **PostgreSQL Database**: Primary data storage (configured via DATABASE_URL)
- **Anthropic API**: For AI-powered document analysis (ANTHROPIC_API_KEY required)

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
- `ANTHROPIC_API_KEY`: Anthropic API access (required for AI features)
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

- **June 28, 2025**: Transformed into comprehensive smart solution generation system:
  - **Complete Workflow Redesign**: Upload problem document → AI analyzes entire library → Auto-generates solution documents
  - **Smart Document Generation**: Auto-creates inspection forms, JSAs, maintenance plans, monitoring protocols based on problem type
  - **Comprehensive Analysis**: System references ALL uploaded documents simultaneously for unified solutions
  - **Citation Integration**: All generated documents include proper citations from source library
  - **Updated Interface**: Renamed sections to reflect new workflow:
    - "Smart Solutions" (main analysis page)
    - "Generated Documents" (auto-created solutions)
    - "Source Library" (reference documents)
    - "System Overview" (analytics dashboard)
  - **Problem-Type Detection**: Automatically determines document types needed based on keywords (culvert, erosion, pollution, etc.)
  - **Database Storage**: Switched from MemStorage to DatabaseStorage for permanent document persistence
  - **AI Service**: Confirmed using Anthropic Claude (not OpenAI) for all AI analysis functionality
  - **Application Name**: Official name is "Stormwater AI" (not variations or longer names)
  - **History Management**: Removed old analysis history display - only current session data shown