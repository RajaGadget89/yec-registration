# Email Configuration Setup

## Overview
The YEC Registration System now includes automatic email functionality to send badges to users upon successful registration.

## Environment Variables Required

Create a `.env.local` file in your project root with the following variables:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Email Provider Setup

### Gmail Setup
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the generated password as `SMTP_PASS`

### Outlook/Hotmail Setup
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo Setup
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### Custom SMTP Server
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
```

## Email Features

### Badge Email
- **Subject**: "Your YEC Day Badge"
- **Content**: 
  - Personalized greeting with user's name
  - Registration ID
  - Instructions to show badge at check-in
  - Contact information
- **Attachment**: `badge.png` - The generated YEC badge

### Email Template
The email includes both plain text and HTML versions:

**Plain Text:**
```
Dear [User Name],

Please find attached your official badge for YEC Day. Show this at the check-in gate.

Registration ID: [Registration ID]

Best regards,
YEC Day Team
```

**HTML Version:**
- Professional styling with YEC brand colors
- Responsive design
- Clear call-to-action
- Contact information

## Testing Email Configuration

You can test the email configuration by calling the test function:

```typescript
import { testEmailConnection } from './app/lib/emailService';

const isConnected = await testEmailConnection();
console.log('Email connection:', isConnected ? 'Success' : 'Failed');
```

## Error Handling

The system includes comprehensive error handling:
- Email sending failures don't prevent registration completion
- Detailed logging for debugging
- Graceful fallback if email service is unavailable
- User feedback through API response

## Security Considerations

- Use App Passwords instead of regular passwords
- Store credentials in environment variables
- Never commit `.env.local` to version control
- Use secure SMTP connections (TLS/SSL)
- Validate email addresses before sending

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify SMTP credentials
   - Check if 2FA is enabled (for Gmail)
   - Use App Password instead of regular password

2. **Connection Timeout**
   - Check SMTP host and port
   - Verify firewall settings
   - Test with different email providers

3. **Email Not Received**
   - Check spam/junk folder
   - Verify recipient email address
   - Check email provider settings

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will provide detailed SMTP communication logs.

## Production Deployment

For production deployment:

1. Use a reliable email service (SendGrid, Mailgun, etc.)
2. Set up proper DNS records (SPF, DKIM, DMARC)
3. Monitor email delivery rates
4. Implement email queuing for high-volume scenarios
5. Set up email analytics and tracking 