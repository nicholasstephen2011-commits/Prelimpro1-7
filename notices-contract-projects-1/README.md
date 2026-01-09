# Prelimpro - Preliminary Notice Management App

This is an [Expo](https://expo.dev) React Native project for managing preliminary notices for contractors.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

---

## Stripe Webhook Setup Guide

This application uses Stripe webhooks to handle payment events and keep subscription status in sync. Follow this guide to configure webhooks for your environment.

### Prerequisites

- A Stripe account (test or live mode)
- Access to the Stripe Dashboard
- Your Supabase project URL

### Step 1: Get Your Webhook Endpoint URL

Your webhook endpoint URL follows this format:

```
https://<your-supabase-project-ref>.supabase.co/functions/v1/stripe-webhook
```

Replace `<your-supabase-project-ref>` with your actual Supabase project reference ID.

### Step 2: Create Webhook Endpoint in Stripe Dashboard

1. Log in to the [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter your webhook URL from Step 1
5. Select the following events to listen to:

#### Required Webhook Events

| Event | Description |
|-------|-------------|
| `invoice.payment_succeeded` | Triggered when a subscription payment succeeds |
| `invoice.payment_failed` | Triggered when a subscription payment fails |
| `invoice.upcoming` | Triggered ~3 days before subscription renewal (for reminder emails) |
| `customer.subscription.created` | Triggered when a new subscription is created |
| `customer.subscription.updated` | Triggered when subscription status changes |
| `customer.subscription.deleted` | Triggered when a subscription is canceled |
| `payment_intent.succeeded` | Triggered when a one-time payment succeeds |
| `checkout.session.completed` | Triggered when a checkout session completes |

6. Click **Add endpoint**

### Step 3: Get Your Webhook Signing Secret

1. After creating the endpoint, click on it to view details
2. Click **Reveal** under "Signing secret"
3. Copy the secret (starts with `whsec_`)
4. Add this secret to your Supabase Edge Function environment variables:

```bash
# In your Supabase project settings or via CLI
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret_here
```

### Step 4: Configure Environment Variables

Ensure the following environment variables are set in your Supabase Edge Functions:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret

# Email Service (Resend)
RESEND_API_KEY=re_your_resend_api_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 5: Testing Webhooks Locally

Use the Stripe CLI to test webhooks in your local development environment:

#### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (Scoop)
scoop install stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases
```

#### Login and Forward Events

```bash
# Login to your Stripe account
stripe login

# Forward events to your local Supabase function
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# The CLI will display a webhook signing secret for testing
# Use this secret in your local environment
```

#### Trigger Test Events

```bash
# Trigger a successful payment event
stripe trigger payment_intent.succeeded

# Trigger a subscription created event
stripe trigger customer.subscription.created

# Trigger an invoice payment succeeded event
stripe trigger invoice.payment_succeeded

# Trigger a payment failed event
stripe trigger invoice.payment_failed
```

### Step 6: Verify Webhook Integration

1. Make a test payment in your application
2. Check the Stripe Dashboard → Developers → Webhooks → Your endpoint
3. View the "Webhook attempts" to see if events are being received
4. Check the `webhook_events` table in your database for logged events

### Webhook Event Handling

The `stripe-webhook` edge function handles the following:

| Event | Action |
|-------|--------|
| `invoice.payment_succeeded` | Updates `pro_until` date, resets `notices_used`, sends confirmation email |
| `invoice.payment_failed` | Marks subscription as `past_due`, sends alert email |
| `invoice.upcoming` | Sends renewal reminder email |
| `customer.subscription.created` | Activates Pro plan, sends welcome email |
| `customer.subscription.updated` | Updates subscription status |
| `customer.subscription.deleted` | Downgrades to free plan, sends cancellation email |
| `payment_intent.succeeded` | Adds purchased notice credits, sends receipt email |
| `checkout.session.completed` | Processes checkout completion |

### Troubleshooting

#### Webhook Not Receiving Events

1. Verify the endpoint URL is correct
2. Check that the webhook is enabled in Stripe Dashboard
3. Ensure all required events are selected
4. Check Supabase Edge Function logs for errors

#### Signature Verification Failed

1. Ensure `STRIPE_WEBHOOK_SECRET` matches the signing secret in Stripe Dashboard
2. Verify you're using the raw request body for verification
3. Check that no middleware is modifying the request body

#### Events Not Processing

1. Check the `webhook_events` table for logged events
2. Review Edge Function logs in Supabase Dashboard
3. Verify database permissions for the service role

### Test Card Numbers

Use these test card numbers in Stripe test mode:

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires authentication |
| `4000 0000 0000 9995` | Insufficient funds |

Use any future expiration date and any 3-digit CVC.

---

## PDF Invoice Generation

The application supports generating PDF invoices for payments.

### How It Works

1. Invoices are generated via the `generate-invoice` edge function
2. PDFs include company logo, itemized charges, payment details, and tax information
3. Generated invoices are stored in Supabase Storage for quick retrieval
4. Users can download invoices from the Payment History screen

### Invoice Contents

- Company information and logo
- Invoice number and date
- Customer billing details
- Itemized line items with descriptions
- Subtotal, tax, and total amounts
- Payment method used
- Transaction ID for reference

---

## Email Notifications

The application sends email notifications for payment events:

| Event | Email Type |
|-------|------------|
| Subscription created | Welcome/confirmation email |
| Payment succeeded | Receipt email |
| Payment failed | Alert email with retry instructions |
| Subscription renewal upcoming | Reminder email |
| Subscription canceled | Cancellation confirmation |
| Notice credits purchased | Purchase receipt |

### Email Configuration

Emails are sent via [Resend](https://resend.com). Configure your API key:

```env
RESEND_API_KEY=re_your_api_key
```

---

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

**Recommended Tools**

Install these tools to streamline development and deployment:

- VS Code extensions:
   - `GitHub Pull Requests and Issues` (ID: GitHub.vscode-pull-request-github)
   - `GitLens — Git supercharged` (ID: eamodio.gitlens)
   - `ESLint` (ID: dbaeumer.vscode-eslint)
   - `Prettier - Code formatter` (ID: esbenp.prettier-vscode)
   - `Expo` (ID: expo.vscode-expo)

- CLI tools (install on your machine):
   - `gh` (GitHub CLI) — for managing repos, creating secrets, and scripting CI tasks
   - `expo` / `npx expo` — for running the mobile app and `expo doctor`
   - `npm` or `pnpm`/`yarn` — package manager of your choice

These tools are optional but recommended for a smoother workflow.
