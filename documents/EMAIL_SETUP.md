# Email Configuration Setup - Resend

## Overview
The YEC Registration System now includes automatic email functionality using Resend to send badges to users upon successful registration.

## Environment Variables Required

Create a `.env.local` file in your project root with the following variables:

```env
# Email Configuration - Resend
RESEND_API_KEY=your-resend-api-key-here
```

## Resend Setup

### 1. Create Resend Account
1. Go to [Resend.com](https://resend.com) and create an account
2. Verify your email address

### 2. Get API Key
1. Go to the [API Keys section](https://resend.com/api-keys)
2. Create a new API key
3. Copy the API key and add it to your `.env.local` file

### 3. Verify Domain (Optional)
1. Go to the [Domains section](https://resend.com/domains)
2. Add and verify your domain (e.g., yec.in.th)
3. Update the `from` email in `emailService.ts` to use your verified domain

### 4. Test Configuration
Use the test function to verify your setup:
```typescript
import { testEmailConnection } from './app/lib/emailService';

const isConnected = await testEmailConnection();
console.log('Resend connection:', isConnected ? 'Success' : 'Failed');
```

## Email Features

### Badge Email
- **Subject**: "Your YEC Day Badge"
- **Content**: 
  - Personalized greeting with user's name
  - Registration ID
  - Instructions to show badge at check-in
  - Contact information
- **Note**: Badge attachment functionality may require additional setup with cloud storage

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

## Testing Resend Configuration

You can test the Resend configuration by calling the test function:

```typescript
import { testEmailConnection } from './app/lib/emailService';

const isConnected = await testEmailConnection();
console.log('Resend connection:', isConnected ? 'Success' : 'Failed');
```

## Error Handling

The system includes comprehensive error handling:
- Email sending failures don't prevent registration completion
- Detailed logging for debugging
- Graceful fallback if email service is unavailable
- User feedback through API response

## Security Considerations

- Store API key in environment variables
- Never commit `.env.local` to version control
- Use verified domains for better deliverability
- Validate email addresses before sending
- Monitor email delivery rates in Resend dashboard

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify RESEND_API_KEY is correct
   - Check if API key has proper permissions
   - Ensure API key is not expired

2. **Domain Not Verified**
   - Verify your domain in Resend dashboard
   - Check DNS records for domain verification
   - Use a verified domain for better deliverability

3. **Email Not Received**
   - Check spam/junk folder
   - Verify recipient email address
   - Check Resend dashboard for delivery status

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will provide detailed SMTP communication logs.

## Production Deployment

For production deployment:

1. Use Resend's production API keys
2. Set up proper DNS records (SPF, DKIM, DMARC) for your domain
3. Monitor email delivery rates in Resend dashboard
4. Implement email queuing for high-volume scenarios
5. Set up email analytics and tracking through Resend 