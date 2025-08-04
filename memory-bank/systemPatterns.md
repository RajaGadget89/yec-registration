# System Patterns: YEC Registration System
*Version: 1.1*
*Created: 2025-01-27*
*Last Updated: 2025-01-27T15:30:00Z*

## Architecture Overview
The YEC Registration System follows a modern full-stack architecture using Next.js App Router with server-side rendering (SSR) and static site generation (SSG). The system is containerized using Docker and follows a microservices-ready approach with clear separation of concerns.

## Key Components
- **Frontend Layer**: Next.js pages and components with Tailwind CSS
- **API Layer**: Next.js API routes for serverless functions
- **Data Layer**: Database with ORM (Prisma) for type-safe access
- **Authentication Layer**: JWT-based authentication system
- **Validation Layer**: Enhanced form validation with conditional logic and visual feedback
- **UX Layer**: Consistent validation cues, progress calculation, and user feedback
- **Admin Dashboard**: Protected admin interface for management

## Design Patterns in Use
- **Component-Based Architecture**: React components for UI modularity
- **Server-Side Rendering (SSR)**: Next.js SSR for SEO and performance
- **API-First Design**: RESTful API endpoints for data operations
- **Container Pattern**: Docker containers for consistent deployment
- **Repository Pattern**: Database access abstraction through Prisma
- **Form Validation Pattern**: Enhanced client-side validation with conditional requirements
- **Authentication Pattern**: JWT tokens with refresh mechanism
- **UX Feedback Pattern**: Real-time validation with visual cues and status messages
- **Progress Calculation Pattern**: Smart progress tracking based on conditional field visibility

## Data Flow
1. **User Registration Flow**:
   - User fills registration form → Real-time validation → Visual feedback → API submission → Server validation → Database storage → Confirmation response

2. **Form Validation Flow**:
   - User input → Conditional validation check → Visual state update → Progress calculation → Field-specific feedback

3. **Admin Management Flow**:
   - Admin login → Authentication → Dashboard access → Data retrieval → Management actions → Database updates

4. **Data Retrieval Flow**:
   - Request → API route → Database query → Data processing → Response

## Key Technical Decisions
- **Next.js App Router**: Chosen for modern React patterns and built-in optimizations
- **TypeScript**: Ensures type safety across the entire application
- **Tailwind CSS**: Utility-first CSS for rapid development and consistency
- **Prisma ORM**: Type-safe database access with automatic migrations
- **Docker Containerization**: Ensures consistent development and deployment environments
- **JWT Authentication**: Stateless authentication suitable for serverless architecture
- **Form Validation**: Client-side validation with conditional logic and real-time feedback
- **UX Standards**: Consistent visual cues with color-coded validation states

## Component Relationships
- **Pages**: Top-level components that define routes and layouts
- **Components**: Reusable UI elements (forms, buttons, cards, etc.)
- **Form Components**: Enhanced form fields with validation and visual feedback
- **Validation Utilities**: Conditional validation logic and progress calculation
- **API Routes**: Serverless functions handling HTTP requests
- **Database Models**: Prisma schema defining data structure
- **Utilities**: Helper functions for validation, formatting, etc.
- **Hooks**: Custom React hooks for state management and API calls

## Form Validation Patterns
- **Conditional Validation**: Fields become required based on user selections
- **Real-time Feedback**: Immediate validation with visual cues
- **Progress Calculation**: Smart progress tracking excluding irrelevant fields
- **Visual States**: Color-coded borders and status messages
- **Thai Phone Validation**: Specialized validation for Thai phone numbers
- **File Upload Validation**: Image validation with preview functionality

## Security Architecture
- **Input Validation**: Enhanced client-side validation with conditional logic
- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: HTTPS, input sanitization, SQL injection prevention
- **Rate Limiting**: API endpoint protection against abuse

## Scalability Considerations
- **Horizontal Scaling**: Docker containers can be scaled horizontally
- **Database Scaling**: PostgreSQL with connection pooling
- **Caching**: Next.js built-in caching and Redis for session storage
- **CDN**: Static assets served through CDN
- **Load Balancing**: Multiple container instances behind load balancer

## Performance Patterns
- **Code Splitting**: Automatic code splitting by Next.js
- **Image Optimization**: Next.js Image component for optimized images
- **Lazy Loading**: Components and data loaded on demand
- **Caching Strategy**: Multiple layers of caching (browser, CDN, server)
- **Database Optimization**: Indexed queries and efficient data access
- **Form Optimization**: Efficient validation with minimal re-renders

## UX Patterns
- **Visual Feedback**: Consistent validation states across all form fields
- **Progress Indication**: Real-time progress calculation and display
- **Error Handling**: Clear error messages with actionable feedback
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Responsive Design**: Mobile-first approach with adaptive layouts

---

*This document captures the system architecture and design patterns used in the project.* 