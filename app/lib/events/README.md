# Registration Event System

This directory contains the centralized domain event system for the YEC Registration application. The system centralizes all side-effects of registration status changes into dedicated event handlers, ensuring deterministic and auditable flows.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Routes    │    │   Event Bus     │    │   Event Handlers│
│                 │    │                 │    │                 │
│ • Emit Events   │───►│ • Route Events  │───►│ • Status Update │
│ • Thin Logic    │    │ • Idempotency   │    │ • Email Notify  │
│ • No Side-Effects│   │ • Error Handling│    │ • Telegram Notify│
└─────────────────┘    └─────────────────┘    │ • Audit Logging │
                                              └─────────────────┘
```

## Event Types

The system supports the following domain events:

- `registration.submitted` - New registration submitted
- `registration.batch_upserted` - Batch registration updates
- `admin.request_update` - Admin requests registration update
- `admin.approved` - Admin approves registration
- `admin.rejected` - Admin rejects registration

## Status Transitions

Based on the Master Context, events trigger the following status changes:

- `registration.submitted` → `waiting_for_review`
- `registration.batch_upserted` → `waiting_for_review`
- `admin.request_update` → `pending`
- `admin.approved` → `approved`
- `admin.rejected` → `rejected`

## Event Handlers

Each event is processed by four handlers:

1. **StatusUpdateHandler** - Updates registration status in database
2. **EmailNotificationHandler** - Sends appropriate email notifications
3. **TelegramNotificationHandler** - Sends Telegram notifications
4. **AuditLogHandler** - Logs admin actions to audit table

## Usage

### Emitting Events

```typescript
import { EventService } from './lib/events/eventService';

// Emit registration submitted event
await EventService.emitRegistrationSubmitted(registration);

// Emit admin approval event
await EventService.emitAdminApproved(registration, adminEmail);

// Emit admin rejection event
await EventService.emitAdminRejected(registration, adminEmail, reason);
```

### Configuration

The system uses centralized configuration from `app/lib/config.ts`:

- **Required**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Optional**: `RESEND_API_KEY`, `FROM_EMAIL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

Missing optional configurations result in warnings and skipped functionality.

## Idempotency

The event system ensures idempotency by tracking processed event IDs. Re-emitting the same event will not cause duplicate side-effects.

## Error Handling

- Event handlers run concurrently and independently
- Handler failures don't prevent other handlers from executing
- Failed handlers are logged but don't break the event flow
- API routes can continue even if event emission fails

## Testing

Run the event system tests:

```bash
npm test tests/api/event-system.spec.ts
```

## Migration from Direct Side-Effects

The system replaces direct side-effect code in API routes:

**Before:**
```typescript
// In API route
await supabase.update({ status: 'approved' });
await sendEmail(user.email, subject, html);
await sendTelegram(message);
await logAudit(action);
```

**After:**
```typescript
// In API route
await EventService.emitAdminApproved(registration, adminEmail);
```

All side-effects are now centralized in event handlers, making the system more maintainable and auditable.
