# YEC Registration System - API Documentation

## 📋 Overview

The YEC Registration System provides a comprehensive REST API for managing event registrations, administrative functions, and system operations. All endpoints are built using Next.js API routes with TypeScript for type safety.

## 🔗 Base URL

- **Development**: `http://localhost:8080`
- **Production**: `https://your-domain.com`

## 🔐 Authentication

### Admin Authentication
Admin endpoints require authentication via email-based allowlist system. See [Security & Access Control](security/security-access.md) for details.

### Public Endpoints
Registration and verification endpoints are publicly accessible.

## 📚 API Endpoints

### 🔐 Authentication Endpoints

#### POST `/api/auth/login`
Authenticate admin user.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

#### POST `/api/auth/logout`
Logout admin user.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 📝 Registration Endpoints

#### POST `/api/register`
Complete registration with badge generation and email notification.

**Request Body:**
```json
{
  "title": "Mr.",
  "first_name": "John",
  "last_name": "Doe",
  "nickname": "Johnny",
  "phone": "0812345678",
  "line_id": "johndoe",
  "email": "john@example.com",
  "company_name": "Tech Corp",
  "business_type": "Technology",
  "business_type_other": null,
  "yec_province": "bangkok",
  "hotel_choice": "in-quota",
  "room_type": "single",
  "roommate_info": null,
  "roommate_phone": null,
  "external_hotel_name": null,
  "travel_type": "private-car",
  "profile_image_url": "https://...",
  "chamber_card_url": "https://...",
  "payment_slip_url": "https://...",
  "pdpa_accepted": true
}
```

**Response:**
```json
{
  "success": true,
  "registration_id": "YEC-20250127-001",
  "badge_url": "https://...",
  "message": "Registration successful"
}
```

#### GET `/api/verify-registration`
Get latest registration for verification.

**Response:**
```json
{
  "success": true,
  "registration": {
    "registration_id": "YEC-20250127-001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "status": "pending",
    "created_at": "2025-01-27T10:30:00Z"
  }
}
```

### 🛠️ Admin Endpoints

#### GET `/api/admin/registrations`
Get filtered registrations with pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 20)
- `status` (string): Comma-separated status filters
- `provinces` (string): Comma-separated province filters
- `search` (string): Search term
- `dateFrom` (string): Start date (YYYY-MM-DD)
- `dateTo` (string): End date (YYYY-MM-DD)
- `sortColumn` (string): Sort column
- `sortDirection` (string): Sort direction (asc/desc)

**Response:**
```json
{
  "registrations": [...],
  "totalCount": 150,
  "statusCounts": {
    "total": 150,
    "pending": 45,
    "waiting_for_review": 30,
    "approved": 60,
    "rejected": 15
  }
}
```

#### POST `/api/admin/registrations/[id]/approve`
Approve a registration.

**Response:**
```json
{
  "success": true,
  "message": "Registration approved"
}
```

#### POST `/api/admin/registrations/[id]/reject`
Reject a registration.

**Request Body:**
```json
{
  "reason": "Incomplete information"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration rejected"
}
```

#### POST `/api/admin/registrations/[id]/request-update`
Request update from registrant.

**Request Body:**
```json
{
  "message": "Please provide additional information"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Update request sent"
}
```

#### GET `/api/admin/export-csv`
Export registrations to CSV.

**Query Parameters:**
- `status` (string): Comma-separated status filters
- `provinces` (string): Comma-separated province filters
- `search` (string): Search term
- `dateFrom` (string): Start date
- `dateTo` (string): End date

**Response:** CSV file download

### 🧪 Development Endpoints

#### POST `/api/dev/login`
Development login for testing.

**Request Body:**
```json
{
  "email": "test@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Development login successful"
}
```

#### POST `/api/dev/logout`
Development logout.

**Response:**
```json
{
  "success": true,
  "message": "Development logout successful"
}
```

### 🧪 Testing Endpoints

#### GET `/api/test-email`
Test email service functionality.

**Response:**
```json
{
  "success": true,
  "message": "Test email sent"
}
```

#### GET `/api/test-badge`
Test badge generation functionality.

**Response:**
```json
{
  "success": true,
  "badge_url": "https://...",
  "message": "Test badge generated"
}
```

#### POST `/api/fix-timezone`
Fix timezone issues in database.

**Response:**
```json
{
  "success": true,
  "message": "Timezone fixed",
  "updated_count": 150
}
```

## 📊 Data Models

### Registration Object
```typescript
interface Registration {
  id: number;
  registration_id: string;
  title: string;
  first_name: string;
  last_name: string;
  nickname: string;
  phone: string;
  line_id: string;
  email: string;
  company_name: string;
  business_type: string;
  business_type_other: string | null;
  yec_province: string;
  hotel_choice: 'in-quota' | 'out-of-quota';
  room_type: 'single' | 'double' | 'suite' | 'no-accommodation' | null;
  roommate_info: string | null;
  roommate_phone: string | null;
  external_hotel_name: string | null;
  travel_type: 'private-car' | 'van';
  profile_image_url: string | null;
  chamber_card_url: string | null;
  payment_slip_url: string | null;
  badge_url: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  form_data: any;
  created_at: string;
  updated_at: string;
}
```

### Filter State
```typescript
interface FilterState {
  status: string[];
  provinces: string[];
  search: string;
  dateFrom: string;
  dateTo: string;
}
```

### Pagination Parameters
```typescript
interface PaginationParams {
  page: number;
  pageSize: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}
```

## 🔄 Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

## 🚨 Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Form validation failed
- `DUPLICATE_EMAIL`: Email already registered
- `FILE_UPLOAD_ERROR`: File upload failed
- `BADGE_GENERATION_ERROR`: Badge generation failed
- `EMAIL_SEND_ERROR`: Email delivery failed
- `DATABASE_ERROR`: Database operation failed
- `AUTHENTICATION_ERROR`: Authentication failed
- `AUTHORIZATION_ERROR`: Insufficient permissions

## 🔒 Security Considerations

### Rate Limiting
- Registration endpoints: 10 requests per minute
- Admin endpoints: 100 requests per minute
- File upload endpoints: 5 requests per minute

### Input Validation
- All inputs are validated on both client and server
- File uploads are validated for type and size
- SQL injection prevention via parameterized queries
- XSS protection via input sanitization

### CORS Configuration
```typescript
const corsOptions = {
  origin: process.env.NEXT_PUBLIC_APP_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

## 📝 Usage Examples

### JavaScript/TypeScript
```typescript
// Register a new user
const response = await fetch('/api/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(registrationData)
});

const result = await response.json();
```

### cURL
```bash
# Get registrations with filters
curl -X GET "http://localhost:8080/api/admin/registrations?status=approved&provinces=bangkok&page=1" \
  -H "Cookie: admin-email=admin@example.com"

# Approve a registration
curl -X POST "http://localhost:8080/api/admin/registrations/YEC-20250127-001/approve" \
  -H "Cookie: admin-email=admin@example.com"
```

### Python
```python
import requests

# Register new user
response = requests.post('http://localhost:8080/api/register', 
                        json=registration_data)
result = response.json()

# Get admin data
response = requests.get('http://localhost:8080/api/admin/registrations',
                       cookies={'admin-email': 'admin@example.com'})
registrations = response.json()
```

## 🔗 Related Documentation

- **[Project Overview](architecture/project-overview.md)** - System architecture
- **[Database Design](database/database-design.md)** - Database schema
- **[Security & Access Control](security/security-access.md)** - Security implementation
- **[Operational Configuration](ops/operational-config.md)** - Deployment guide
- **[Source Code Reference](code/source-code-reference.md)** - Code structure

## 🆕 Recent Updates

- **2025-01-27**: Added comprehensive admin API endpoints
- **2025-01-27**: Enhanced error handling and validation
- **2025-01-27**: Added development and testing endpoints
- **2025-01-27**: Improved TypeScript type definitions
- **2025-01-27**: Added rate limiting and security measures

---

*Last updated: 2025-01-27*
*API version: 2.0.0*

**Related Links:**
- [Project Overview](architecture/project-overview.md)
- [Database Design](database/database-design.md)
- [Security & Access Control](security/security-access.md)
- [Source Code Reference](code/source-code-reference.md) 