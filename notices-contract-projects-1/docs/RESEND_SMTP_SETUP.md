# Configuring Resend SMTP for Supabase Auth Emails

This guide explains how to configure Resend as a custom SMTP provider for Supabase Auth to send verification emails, password reset emails, and other authentication-related emails.

## Why Use Resend?

Supabase's built-in email service has limitations:
- **Rate limits**: Only 4 emails per hour on the free tier
- **Generic templates**: Limited customization options
- **Deliverability**: May end up in spam folders

Resend provides:
- **Higher limits**: 3,000 emails/month on the free tier
- **Better deliverability**: Proper SPF/DKIM configuration
- **Custom domains**: Send from your own domain
- **Analytics**: Track email opens and clicks

---

## Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

---

## Step 2: Get Your Resend API Key

1. In the Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Give it a name (e.g., "Supabase Auth")
4. Select **Full access** permission
5. Copy the API key (starts with `re_`)

> ⚠️ **Important**: Save this key securely. You won't be able to see it again!

---

## Step 3: Configure a Sending Domain (Recommended)

For production, configure a custom domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `mail.yourcompany.com`)
4. Add the DNS records Resend provides:
   - SPF record
   - DKIM records
   - Optional: DMARC record
5. Wait for verification (usually 5-15 minutes)

> For testing, you can use Resend's default `onboarding@resend.dev` sender.

---

## Step 4: Configure Supabase SMTP Settings

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings** (gear icon) → **Authentication**
4. Scroll down to **SMTP Settings**
5. Toggle **Enable Custom SMTP** to ON
6. Enter the following settings:

### SMTP Configuration

| Setting | Value |
|---------|-------|
| **Sender email** | `noreply@yourdomain.com` (or `onboarding@resend.dev` for testing) |
| **Sender name** | `LienClear` (or your app name) |
| **Host** | `smtp.resend.com` |
| **Port number** | `465` |
| **Minimum interval** | `60` (seconds between emails to same address) |
| **Username** | `resend` |
| **Password** | Your Resend API key (e.g., `re_123abc...`) |

### Screenshot Reference

```
┌─────────────────────────────────────────────────────────────┐
│  SMTP Settings                                              │
├─────────────────────────────────────────────────────────────┤
│  ☑ Enable Custom SMTP                                       │
│                                                             │
│  Sender email:     [noreply@yourdomain.com        ]        │
│  Sender name:      [LienClear                     ]        │
│  Host:             [smtp.resend.com               ]        │
│  Port number:      [465                           ]        │
│  Minimum interval: [60                            ]        │
│  Username:         [resend                        ]        │
│  Password:         [re_xxxxxxxxxxxxx              ]        │
│                                                             │
│  [Save]                                                     │
└─────────────────────────────────────────────────────────────┘
```

7. Click **Save**

---

## Step 5: Customize Email Templates (Optional)

In Supabase Dashboard → Authentication → Email Templates, you can customize:

### Confirmation Email
```html
<h2>Confirm your email</h2>
<p>Welcome to LienClear! Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email Address</a></p>
<p>This link will expire in 24 hours.</p>
```

### Password Reset Email
```html
<h2>Reset your password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

### Magic Link Email
```html
<h2>Your login link</h2>
<p>Click the link below to sign in to LienClear:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>This link will expire in 1 hour.</p>
```

---

## Step 6: Test the Configuration

1. In your app, try signing up with a new email address
2. Check your inbox for the verification email
3. Verify the email comes from your configured sender address
4. Click the verification link to confirm it works

### Troubleshooting

**Email not received?**
- Check spam/junk folder
- Verify SMTP settings are correct
- Check Resend dashboard for failed deliveries
- Ensure your domain DNS records are properly configured

**"Invalid credentials" error?**
- Make sure username is exactly `resend`
- Verify your API key is correct and has full access
- Check the API key hasn't been revoked

**"Connection refused" error?**
- Verify port is `465` for SSL
- Alternative: Try port `587` with STARTTLS

---

## Rate Limits

### Resend Free Tier
- 3,000 emails/month
- 100 emails/day
- 1 custom domain

### Resend Pro ($20/month)
- 50,000 emails/month
- Unlimited domains
- Priority support

---

## Security Best Practices

1. **Never expose your API key** in client-side code
2. **Use environment variables** for sensitive data
3. **Rotate API keys** periodically
4. **Monitor usage** in Resend dashboard for unusual activity
5. **Set up SPF/DKIM** for your domain to improve deliverability

---

## Environment Variables

For reference, your `.env` file should include:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Resend API Key (only needed for server-side email sending)
# Note: For Supabase Auth emails, configure in dashboard instead
RESEND_API_KEY=re_your_api_key
```

> **Note**: The RESEND_API_KEY in `.env` is for direct API calls from Edge Functions. For Supabase Auth emails, the API key is configured in the Supabase dashboard SMTP settings.

---

## Quick Reference

| Service | URL |
|---------|-----|
| Resend Dashboard | https://resend.com/dashboard |
| Supabase Dashboard | https://supabase.com/dashboard |
| Resend SMTP Docs | https://resend.com/docs/send-with-smtp |
| Supabase Auth Docs | https://supabase.com/docs/guides/auth |

---

## Support

If you encounter issues:
1. Check Resend status: https://status.resend.com
2. Check Supabase status: https://status.supabase.com
3. Review Resend logs in your dashboard
4. Contact support@resend.com for Resend issues
