# Email System Enhancements

## Overview

This document describes the enhancements made to the YEC Registration email system to improve reliability, safety, and observability.

## Features Added

### 1. Throttle and Retry Logic

The email transport layer now includes intelligent throttling and retry mechanisms to handle rate limiting gracefully.

#### Environment Variables

```bash
# Throttle configuration
EMAIL_THROTTLE_MS=500          # Delay between sends (default: 500ms)
EMAIL_RETRY_ON_429=2           # Max retries on 429 errors (default: 2)
EMAIL_BASE_BACKOFF_MS=500      # Base backoff delay (default: 500ms)
```

#### Behavior

- **Throttling**: Enforces a minimum delay between email sends to prevent overwhelming the provider
- **Retry Logic**: Automatically retries on 429 rate limit errors with exponential backoff
- **Jitter**: Adds ±100ms random jitter to backoff delays to prevent thundering herd
- **Stats Tracking**: Tracks `rateLimited` and `retries` counters for observability

#### Example Flow

1. Send email → Provider returns 429
2. Wait `(attempt * baseBackoff) + jitter` ms
3. Retry up to `EMAIL_RETRY_ON_429` times
4. Track stats: `rateLimited++`, `retries++`

### 2. HTML Rendering Guarantee

The email system now guarantees that all HTML payloads are valid strings with comprehensive validation.

#### Safe Rendering Utility

```typescript
import { renderEmail } from './app/lib/emails/render';

// Guaranteed to return a valid HTML string or throw an error
const html = renderEmail(<EmailTemplate {...props} />);
```

#### Validation Features

- **Type Safety**: Ensures HTML output is a string
- **Content Validation**: Rejects empty or whitespace-only HTML
- **Structure Validation**: Ensures HTML contains valid markup
- **Error Handling**: Provides clear error messages for debugging

#### Email Payload Validation

```typescript
import { validateEmailPayload } from './app/lib/emails/render';

// Validates email address, subject, and HTML content
validateEmailPayload({
  to: 'user@example.com',
  subject: 'Test Subject',
  html: '<div>Content</div>'
});
```

### 3. Enhanced Statistics

The email dispatch system now provides comprehensive statistics including rate limiting and retry information.

#### Response Format

```json
{
  "ok": true,
  "dryRun": false,
  "sent": 5,
  "wouldSend": 0,
  "capped": 2,
  "blocked": 1,
  "errors": 0,
  "remaining": 0,
  "rateLimited": 1,
  "retries": 2,
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

#### New Fields

- `rateLimited`: Number of emails that hit rate limits
- `retries`: Total number of retry attempts made

## Testing

### Unit Tests

```bash
# Test HTML rendering and validation
npm run test:unit:email-render

# Test transport layer (throttle/retry)
npm run test:unit:email-transport

# Run all email unit tests
npm run test:unit:email
```

### E2E Tests

```bash
# Test capped mode with throttle/retry
npm run test:e2e:capped

# Test HTML validation specifically
npm run test:e2e:html-validation
```

### Test Configuration

The tests use a safe configuration that minimizes real provider calls:

```bash
EMAIL_MODE=CAPPED
EMAIL_CAP_MAX_PER_RUN=1
EMAIL_THROTTLE_MS=500
EMAIL_RETRY_ON_429=1
EMAIL_ALLOWLIST=you@example.com
BLOCK_NON_ALLOWLIST=true
```

## Configuration Examples

### Local Development

```bash
# .env.local
EMAIL_MODE=CAPPED
EMAIL_CAP_MAX_PER_RUN=1
EMAIL_THROTTLE_MS=500
EMAIL_RETRY_ON_429=2
EMAIL_ALLOWLIST=you@example.com
BLOCK_NON_ALLOWLIST=true
DISPATCH_DRY_RUN=false
```

### Production

```bash
# Production environment
EMAIL_MODE=FULL
EMAIL_THROTTLE_MS=1000
EMAIL_RETRY_ON_429=3
EMAIL_BASE_BACKOFF_MS=1000
```

## Error Handling

### Rate Limiting Errors

- **429 Response**: Automatically retried with backoff
- **Max Retries Exceeded**: Email marked as failed, stats tracked
- **Non-429 Errors**: Not retried, marked as provider error

### HTML Validation Errors

- **Invalid Type**: Throws `EMAIL_RENDER_INVALID_TYPE`
- **Empty Content**: Throws `EMAIL_RENDER_EMPTY`
- **Invalid HTML**: Throws `EMAIL_RENDER_INVALID_HTML`
- **Email Validation**: Throws `EMAIL_PAYLOAD_INVALID_*`

## Observability

### Logging

The system provides detailed logging for debugging:

```
[RESEND] Transport initialized with throttle=500ms, maxRetries=2, baseBackoff=500ms
[RESEND] Throttling: waiting 300ms before sending to user@example.com
[RESEND] Sending to user@example.com (attempt 1/3)
[RESEND] Rate limited (429), retrying in 650ms (attempt 1/3)
[RESEND] Email sent successfully via Resend to: user@example.com
```

### Statistics

Transport stats are available for monitoring:

```typescript
const stats = transport.getStats();
// {
//   sent: 10,
//   capped: 2,
//   blocked: 1,
//   errors: 0,
//   rateLimited: 3,
//   retries: 5
// }
```

## Migration Guide

### Existing Code

No changes required for existing code. The enhancements are backward compatible.

### New Features

To use the new features:

1. **HTML Validation**: Automatically applied in dispatcher
2. **Throttle/Retry**: Automatically applied in transport layer
3. **Enhanced Stats**: Automatically included in API responses

### Environment Variables

Add the new environment variables to your configuration:

```bash
# Required for new features
EMAIL_THROTTLE_MS=500
EMAIL_RETRY_ON_429=2
EMAIL_BASE_BACKOFF_MS=500
```

## Troubleshooting

### Common Issues

1. **High Rate Limiting**: Increase `EMAIL_THROTTLE_MS`
2. **Too Many Retries**: Decrease `EMAIL_RETRY_ON_429`
3. **HTML Validation Errors**: Check email template rendering
4. **Slow Performance**: Adjust throttle and backoff settings

### Debug Mode

Enable detailed logging:

```bash
NODE_ENV=development
```

This will show detailed transport logs including throttle delays and retry attempts.

## Performance Considerations

### Throttling Impact

- **Default 500ms**: Adds ~0.5s per email
- **Batch Processing**: Throttling applies per email, not per batch
- **Concurrent Sends**: Throttling prevents overwhelming provider

### Retry Impact

- **Backoff Delays**: Exponential backoff with jitter
- **Max Retries**: Configurable limit prevents infinite loops
- **Error Recovery**: Automatic recovery from transient rate limits

## Security

### Rate Limiting Protection

- **Automatic Throttling**: Prevents accidental rate limit violations
- **Retry Limits**: Prevents infinite retry loops
- **Error Isolation**: Rate limit errors don't affect other emails

### HTML Validation

- **Type Safety**: Prevents injection of non-string content
- **Content Validation**: Ensures emails have valid content
- **Error Handling**: Graceful failure with clear error messages
