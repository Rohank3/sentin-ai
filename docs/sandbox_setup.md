# PayPal Sandbox Setup & Live Scenario Guide

This guide walks you through connecting **Sentin AI** to a real PayPal Sandbox account, generating live disputes, and watching the autonomous AI Claims Engine triage and resolve them.

---

## 1. Quick Architecture Overview

Sentin AI operates in **two transparent modes**:
1. **Interactive Demo Mode (Default / Offline)**:
   - Zero configuration needed. The system generates high-fidelity synthetic dispute scenarios with simulated carrier tracking, policy embeddings, and mathematical Expected Value (EV).
2. **Live PayPal Sandbox Mode**:
   - Directly connects to `https://api-m.sandbox.paypal.com` to ingest live disputes (`GET /v1/customer/disputes`), verify webhooks (`POST /v1/notifications/verify-webhook-signature`), submit evidence (`POST /v1/customer/disputes/{id}/provide-evidence`), and issue refunds (`POST /v2/payments/captures/{id}/refund`).

---

## 2. Setting Up PayPal Sandbox Accounts

1. **Log in to PayPal Developer Portal**:
   - Go to [developer.paypal.com](https://developer.paypal.com) and log in with your PayPal developer credentials.
2. **Review Sandbox Accounts**:
   - Navigate to **Testing Tools** ➔ **Sandbox Accounts**.
   - By default, PayPal creates:
     - A **Business Account** (e.g. `sb-merchant123@business.example.com`)
     - A **Personal (Buyer) Account** (e.g. `sb-buyer456@personal.example.com`)
   - Click on each account ➔ **View/Edit Account** to find their system-generated passwords.
3. **Create a REST API App**:
   - Navigate to **Apps & Credentials** ➔ Select **Sandbox**.
   - Click **Create App**.
   - **App Name**: `Sentin AI Dispute Engine`
   - **App Type**: `Merchant`
   - **Sandbox Business Account**: Select your sandbox business account.
   - Click **Create App**.
   - Note the **Client ID** and **Secret**.

---

## 3. Configuring `backend/.env`

Create or edit `backend/.env` (never commit this file to Git):

```env
# Application Settings
DEBUG=true
LOG_LEVEL=INFO
APP_NAME=Sentin AI
APP_ENV=development

# Database Connection (PostgreSQL)
DATABASE_URL=postgresql+asyncpg://dev:dev@localhost:5432/sentin_ai

# Google Gemini API (For live LLM evaluation; has heuristic fallback if offline)
GEMINI_API_KEY=your_gemini_api_key_here

# PayPal Sandbox Configuration
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=<your-sandbox-client-id>
PAYPAL_CLIENT_SECRET=<your-sandbox-client-secret>
PAYPAL_WEBHOOK_ID=
PAYPAL_SELLER_ID=seller_acme

# Sandbox Test Accounts
PAYPAL_BUSINESS_ACCOUNT=<your-sandbox-business-account-email>
PAYPAL_BUYER_ACCOUNT=<your-sandbox-buyer-account-email>

# Automation Thresholds
AUTO_TRIAGE_ENABLED=true
MAX_AUTO_EXECUTE_AMOUNT=100.00
MIN_AUTO_EXECUTE_WIN_PROB=0.70
MAX_CUSTOMER_RISK_SCORE=0.50
```

Verify your setup at any time by running:
```bash
py -3.13 backend/scripts/setup_sandbox.py
```

---

## 4. Creating Live Dispute Scenarios in PayPal Sandbox

To test end-to-end autonomous resolution with live PayPal Sandbox disputes:

### Step A: Complete a Purchase
1. Open an incognito browser window and log in to [sandbox.paypal.com](https://sandbox.paypal.com) using your **Personal (Buyer) Account**.
2. Send a payment (e.g. `$45.00 USD`) to your **Business (Merchant) Account** email.
3. Note the **Transaction ID**.

### Step B: Open a Dispute as Buyer
1. In the Buyer sandbox account, go to **Activity** ➔ Find the payment ➔ Click **Report a Problem**.
2. Choose one of the standard archetypes:
   - **Item Not Received (INR)**: "I haven't received my item yet."
   - **Significantly Not As Described (SNAD)**: "Item arrived damaged or different."
3. Submit the claim. PayPal creates a dispute with ID `PP-D-XXXXX`.

### Step C: Ingest & Triage in Sentin AI
1. Open the Sentin AI Dashboard (`http://localhost:3000`).
2. Click the **"Sync Sandbox"** button in the top action bar (or trigger `POST /api/disputes/sync`).
3. Sentin AI pulls the live dispute directly from PayPal Sandbox, queries policies and carrier tracking, and calculates mathematical Expected Value.
4. Click on the dispute in the **AG Studio** command grid to inspect the full AI decision drawer!

---

## 5. Live Webhook Forwarding (Optional for Instant Sync)

If you wish to test real-time instant webhook delivery instead of manual sync:
1. In PayPal Developer Portal, go to your REST App ➔ **Webhooks** ➔ **Add Webhook**.
2. Use a webhook tunneling tool (e.g., `ngrok http 8000`).
3. Set Webhook URL to: `https://<your-ngrok-subdomain>.ngrok-free.app/api/webhooks/paypal`
4. Subscribe to dispute events:
   - `CUSTOMER.DISPUTE.CREATED`
   - `CUSTOMER.DISPUTE.UPDATED`
   - `CUSTOMER.DISPUTE.RESOLVED`
5. Copy the generated **Webhook ID** into `backend/.env` under `PAYPAL_WEBHOOK_ID`.
