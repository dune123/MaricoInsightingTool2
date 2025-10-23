# AI Data Analyst - Replit Documentation

## Overview

AI Data Analyst is an intelligent chatbot application that enables users to upload CSV or Excel files and receive instant AI-powered data analysis, interactive charts, and actionable insights. Users can ask natural language questions about their data and receive visualizations and explanations in response.

The application features:
- File upload support (CSV, Excel formats up to 10MB)
- Automatic data analysis and visualization upon upload
- Natural language chat interface for asking questions about data
- AI-generated charts (line, bar, scatter, pie, area)
- Correlation analysis for understanding variable relationships
- Responsive, professional UI with Material Design principles

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript and Vite build tooling

**UI Component System**: 
- Shadcn/ui component library (New York style variant) with Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Material Design-inspired approach emphasizing data clarity and hierarchy

**State Management**:
- TanStack Query (React Query) for server state and API caching
- Local React state for UI interactions
- Session-based data persistence (sessionId stored client-side)

**Routing**: Wouter for lightweight client-side routing

**Key Frontend Components**:
- `FileUpload`: Drag-and-drop file upload with react-dropzone
- `ChatInterface`: Conversational UI with message history and suggestions
- `ChartRenderer`: Recharts-based visualization component supporting 5 chart types
- `MessageBubble`: Chat message display with embedded charts and insights
- `InsightCard`: AI-generated insight display component

### Backend Architecture

**Framework**: Express.js with TypeScript (ESM modules)

**API Structure**:
- `POST /api/upload`: File upload endpoint with multer middleware
  - Accepts CSV/Excel files (10MB limit)
  - Returns sessionId, charts, insights, and data summary
- `POST /api/chat`: Natural language query endpoint
  - Requires sessionId for data context
  - Returns answer text with optional charts and insights

**Data Processing Pipeline**:
1. File parsing (csv-parse for CSV, xlsx for Excel)
2. Data type inference and column analysis
3. AI-powered chart generation using OpenAI GPT-4o
4. Statistical analysis and insight generation

**AI Integration**:
- OpenAI GPT-4o model for natural language understanding and chart specification
- Question classification system (general vs. correlation analysis)
- Correlation analysis engine for relationship discovery
- Chart data processing with aggregation (sum, mean, count)

**Session Management**:
- In-memory session storage (MemStorage class)
- Session-scoped data retention
- UUID-based session identifiers

### Data Storage

**Current Implementation**: In-memory storage using Map-based session store

**Database Configuration**: 
- Drizzle ORM configured for PostgreSQL (via Neon serverless driver)
- Schema defined in `/shared/schema.ts`
- Migration support via drizzle-kit
- **Note**: Database currently configured but not actively used; data persistence is session-based in memory

**Data Models** (Zod schemas):
- `ChartSpec`: Chart configuration (type, title, axes, data)
- `Insight`: AI-generated insight with ID and text
- `Message`: Chat message with role, content, optional charts/insights
- `DataSummary`: Metadata about uploaded dataset (rows, columns, types)
- `SessionData`: User session containing raw data and summary

### External Dependencies

**AI Services**:
- OpenAI API (GPT-4o model) - Requires `OPENAI_API_KEY` environment variable
- Used for: chart generation, insight extraction, question answering, correlation analysis

**Database**:
- Neon Serverless PostgreSQL (via `@neondatabase/serverless`)
- Drizzle ORM for type-safe database operations
- **Configuration**: Requires `DATABASE_URL` environment variable (currently optional as DB not in active use)

**File Processing**:
- csv-parse: CSV file parsing with type inference
- xlsx: Excel file reading (.xls, .xlsx support)
- multer: Multipart form-data handling for file uploads

**Chart Library**:
- Recharts 2.10.0: React-based charting library
- Supports: Line, Bar, Scatter, Pie, Area charts with responsive containers

**UI Component Libraries**:
- Radix UI primitives: Accessible, unstyled component foundation
- Tailwind CSS: Utility-first styling
- Shadcn/ui: Pre-built component patterns

**Development Tools**:
- Vite: Development server and build tool
- Replit plugins: Runtime error overlay, cartographer, dev banner (development only)
- TypeScript: Type safety across frontend and backend