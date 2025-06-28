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
- **Recommendations**: AI-generated and template recommendations under unified "stormwater" category
- **AI Analyses**: Stores analysis results with insights and queries
- **Categories**: Single unified "stormwater" category with QSD, SWPPP, Erosion Control as subcategories

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

- June 28, 2025 - Production Deployment Updates: Updated all Claude AI model references from 'claude-sonnet-4-20250514' to 'claude-3-5-sonnet-20241022' for optimal performance. Fixed all TypeScript errors in frontend components for deployment readiness. Verified database connections and schema integrity. Updated browserslist data and ensured all dependencies are current. Application fully optimized for Replit deployment.
- June 28, 2025. Initial setup

## User Preferences

- **Communication Style**: Simple, everyday language
- **Project Ownership**: All intellectual property belongs to Daniel Guzman (guzman.danield@outlook.com)
- **Application Purpose**: Personal stormwater support tool providing practical developer, SWPPP, and erosion control recommendations
- **Focus**: Actual support for stormwater work, not projects or user management
- **Integration Goal**: Dashboard that provides comprehensive recommendations from uploaded reference documents

## Recent Development Progress

- **June 28, 2025 - Professional QSD/CPESC Enhancement**: Enhanced AI system to act as certified QSD (Qualified SWPPP Developer) and CPESC (Certified Professional in Erosion and Sediment Control) providing professional-grade analysis, regulatory compliance guidance, and consultant-level recommendations with implementation specifications
- **June 28, 2025 - Manual Upload Control**: Added manual upload button that allows users to select files, add descriptions, and only trigger analysis when ready - no more automatic uploads interrupting workflow preparation
- **June 28, 2025 - Description Integration**: Fixed chat system to properly include user descriptions along with uploaded images, ensuring Claude receives both visual content and written context for comprehensive analysis
- **June 28, 2025 - Dual Upload Options**: Implemented upload buttons in both main section (manual control) and chat interface (quick uploads) for flexible workflow management
- **June 28, 2025 - Enhanced Download System**: Created comprehensive download system that includes complete chat discussion history with Claude, supporting 9 formats (Text, Markdown, HTML, PDF, Word, Excel, CSV, JSON, RTF) with all recommendations discussed in chat
- **June 28, 2025 - Fixed Image Analysis**: Resolved syntax error in image analysis system to enable Claude's visual analysis of uploaded images with reference to library documents for comprehensive stormwater solutions
- **June 28, 2025 - Interactive Chat Interface**: Implemented real-time chat with Claude that auto-activates after document upload, providing ongoing consultation and detailed discussions about analysis results
- **June 28, 2025 - Private Reference Library**: Made reference library private - only administrator can add documents to permanent library that AI references for analysis. Regular users get temporary analysis without saving documents
- **June 28, 2025 - Multiple File Upload**: Added batch upload capability supporting multiple documents simultaneously with individual progress tracking and comprehensive cross-document analysis
- **June 28, 2025 - All-in-One Interface**: Created comprehensive single-page design with tabbed sections (Upload & Analyze, Source Library, Recommendations, AI Analyses) including live statistics and global search - eliminated need for navigation between pages
- **June 28, 2025 - Single Session Interface**: Consolidated upload, analysis, and recommendations into one unified section. Users now see everything in a single workflow: upload documents → get instant analysis → view current session recommendations. Removed historical recommendations to focus only on current session results
- **June 28, 2025 - Administrator Interface**: Moved Source Library and AI Analyses to Administrator tab - regular users only see Upload & Analyze and Recommendations tabs, while admins get additional access to reference library management
- **June 28, 2025 - Privacy Update**: Removed "Generated Documents" navigation tab to ensure user privacy and prevent users from seeing others' uploaded documents
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
  - **Unified Categories**: All categories consolidated under single "stormwater" category with QSD, SWPPP, Erosion as subcategories
  - **Combined Upload**: Merged file and image upload into single unified function "Upload Files & Images"