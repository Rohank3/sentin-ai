# API Contract

> **This is the source of truth for all backend API endpoints.**
> Frontend developers: reference this document when building fetch wrappers.
> Backend developers: update this document BEFORE changing any endpoint.

**Base URL:** `http://localhost:8000` (dev) | `https://<render-app>.onrender.com` (prod)

---

## Authentication

No authentication required for hackathon demo. PayPal OAuth2 is handled server-side in `paypal_client.py`.

---

## Endpoints

### Disputes

#### `GET /api/disputes`

List all disputes with optional filters.

**Query Parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `seller_id` | `string` | No | `null` | Filter by seller |
| `status` | `string` | No | `null` | Filter by status (`OPEN`, `UNDER_REVIEW`, `RESOLVED`, `CLOSED`) |
| `limit` | `int` | No | `50` | Max results |
| `offset` | `int` | No | `0` | Pagination offset |

**Response:** `200 OK`
```json
{
  "disputes": [
    {
      "id": "uuid",
      "paypal_dispute_id": "PP-D-xxxxx",
      "seller_id": "uuid",
      "seller_name": "Acme Store",
      "customer_id": "uuid",
      "customer_email": "buyer@example.com",
      "amount": 149.99,
      "currency": "USD",
      "reason": "ITEM_NOT_RECEIVED",
      "status": "OPEN",
      "ai_decision": null,
      "auto_executed": false,
      "created_at": "2026-10-25T12:00:00Z",
      "updated_at": "2026-10-25T12:00:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

#### `GET /api/disputes/{dispute_id}`

Get full dispute detail including AI decision and evidence.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "paypal_dispute_id": "PP-D-xxxxx",
  "seller_id": "uuid",
  "seller_name": "Acme Store",
  "customer_id": "uuid",
  "customer_email": "buyer@example.com",
  "amount": 149.99,
  "currency": "USD",
  "reason": "ITEM_NOT_RECEIVED",
  "status": "UNDER_REVIEW",
  "ai_decision": {
    "recommended_action": "CONTEST",
    "win_probability": 0.85,
    "expected_value": 127.49,
    "reasoning": "Strong PoD evidence with signature confirmation. Customer has 2 prior disputed claims.",
    "auto_execute": true,
    "confidence_factors": [
      "Tracking shows delivered with signature",
      "Customer has prior dispute history (2 claims in 6 months)",
      "Store policy clearly covers this scenario"
    ]
  },
  "ev_breakdown": {
    "expected_value_contest": 127.49,
    "expected_value_settle": -74.99,
    "optimal_action": "CONTEST",
    "savings": 202.48
  },
  "evidence": {
    "policies_found": ["Return policy §3.2: Items marked delivered are non-refundable"],
    "pod_records": [{"tracking": "1Z999AA10123456784", "carrier": "UPS", "status": "DELIVERED", "signature": true}],
    "customer_history": {"total_orders": 12, "total_spend": 1450.00, "prior_disputes": 2, "risk_score": 0.65}
  },
  "audit_log": [
    {"action": "DISPUTE_RECEIVED", "timestamp": "2026-10-25T12:00:00Z", "details": "Webhook received"},
    {"action": "AI_EVALUATION", "timestamp": "2026-10-25T12:00:01Z", "details": "Gemini 2.0 Flash evaluation complete"},
    {"action": "AUTO_EXECUTED", "timestamp": "2026-10-25T12:00:02Z", "details": "Evidence submitted to PayPal"}
  ],
  "created_at": "2026-10-25T12:00:00Z",
  "updated_at": "2026-10-25T12:00:02Z"
}
```

---

#### `POST /api/disputes/{dispute_id}/triage`

Trigger AI evaluation and optional auto-execution for a specific dispute.

**Request Body:** None

**Response:** `200 OK`
```json
{
  "dispute_id": "uuid",
  "ai_decision": {
    "recommended_action": "CONTEST",
    "win_probability": 0.85,
    "expected_value": 127.49,
    "reasoning": "...",
    "auto_execute": true,
    "confidence_factors": ["..."]
  },
  "action_taken": "EVIDENCE_SUBMITTED",
  "paypal_response": { "status": "SUCCESS" }
}
```

---

#### `POST /api/disputes/{dispute_id}/execute`

Manually execute a recommended action (for disputes where `auto_execute` was `false`).

**Request Body:**
```json
{
  "action": "CONTEST"
}
```

**Response:** `200 OK`
```json
{
  "dispute_id": "uuid",
  "action": "CONTEST",
  "paypal_response": { "status": "SUCCESS" }
}
```

---

### Statistics

#### `GET /api/stats`

Get dashboard-level aggregate statistics.

**Query Parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `seller_id` | `string` | No | `null` | Filter by seller (null = all sellers) |

**Response:** `200 OK`
```json
{
  "total_disputes": 42,
  "open_disputes": 8,
  "total_amount_at_risk": 12450.00,
  "total_amount_protected": 9800.00,
  "win_rate": 0.82,
  "auto_executed_count": 28,
  "avg_resolution_time_hours": 2.4,
  "currency": "USD"
}
```

---

### Simulation

#### `POST /api/simulate`

Create a dispute in the PayPal sandbox for demo purposes.

**Request Body:**
```json
{
  "scenario_type": "INR_WITH_TRACKING",
  "amount": 149.99,
  "reason": "ITEM_NOT_RECEIVED",
  "seller_id": "uuid",
  "customer_email": "buyer@example.com",
  "auto_triage": true
}
```

**Scenario Types:**
- `INR_WITH_TRACKING` — Item Not Received, but tracking shows delivered
- `INR_NO_TRACKING` — Item Not Received, no tracking available
- `SNAD_MINOR` — Significantly Not As Described, low-value item
- `SNAD_MAJOR` — Significantly Not As Described, high-value item
- `FRAUD_PATTERN` — Suspicious customer with repeat dispute history
- `HIGH_VALUE` — High-value dispute requiring manual review

**Response:** `201 Created`
```json
{
  "dispute_id": "uuid",
  "paypal_dispute_id": "PP-D-xxxxx",
  "scenario_type": "INR_WITH_TRACKING",
  "status": "CREATED",
  "message": "Sandbox dispute created. Triage triggered automatically."
}
```

---

### Webhooks

#### `POST /api/webhooks/paypal`

Receive PayPal dispute event webhooks.

**Headers:**
- `PayPal-Transmission-Id`
- `PayPal-Transmission-Time`
- `PayPal-Transmission-Sig`
- `PayPal-Cert-Url`
- `PayPal-Auth-Algo`

**Request Body:** PayPal webhook event payload (see PayPal docs)

**Response:** `200 OK`
```json
{
  "status": "received",
  "event_type": "CUSTOMER.DISPUTE.CREATED"
}
```

---

### Sellers

#### `GET /api/sellers`

List all sellers in the marketplace.

**Response:** `200 OK`
```json
{
  "sellers": [
    {
      "id": "uuid",
      "name": "Acme Store",
      "dispute_count": 15,
      "win_rate": 0.80,
      "total_amount_at_risk": 3200.00
    }
  ]
}
```

### System

#### `GET /health`

System health check endpoint.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "app_name": "Sentin AI",
  "version": "0.1.0",
  "environment": "development"
}
```

#### `GET /`

API Welcome overview and documentation links.

---

## Database Entity Schemas

### `Customer`
Persisted shopper risk profile and historical dispute telemetry (`customers` table).

| Field | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `string(36)` | No | `generate_uuid()` | Primary Key (UUID v4 or deterministic fixture slug, e.g. `cust_john_doe`) |
| `paypal_payer_id` | `string(100)` | **Yes** | `null` | PayPal account Payer ID (indexed, unique if set) |
| `email` | `string(255)` | No | N/A | Customer email address (unique) |
| `full_name` | `string(255)` | No | `"Verified Buyer"` | Buyer full name |
| `total_spend` | `float` | No | `0.0` | Lifetime settled purchase volume in USD |
| `total_orders` | `int` | No | `0` | Total completed order count |
| `dispute_count` | `int` | No | `0` | Number of past dispute claims filed |
| `risk_score` | `float` | No | `0.1` | Risk factor score (0.00 lowest risk to 1.00 high risk) |
| `created_at` | `datetime` (UTC) | No | `utc_now()` | Record creation timestamp |

### `Seller`
Merchant account credentials and dispute configuration (`sellers` table).

| Field | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `string(36)` | No | `generate_uuid()` | Primary Key (UUID v4 or deterministic fixture slug, e.g. `seller_acme`) |
| `name` | `string(255)` | No | N/A | Merchant business name |
| `email` | `string(255)` | No | N/A | Merchant notification email (unique) |
| `paypal_client_id` | `string(255)` | **Yes** | `null` | Seller PayPal Sandbox OAuth2 Client ID |
| `paypal_client_secret` | `string(255)` | **Yes** | `null` | Seller PayPal Sandbox OAuth2 Secret |
| `created_at` | `datetime` (UTC) | No | `utc_now()` | Record creation timestamp |

### `Dispute`
PayPal dispute records and autonomous arbitration decisions (`disputes` table).

| Field | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `string(36)` | No | `generate_uuid()` | Primary Key (UUID v4 or deterministic fixture slug, e.g. `disp-101`) |
| `paypal_dispute_id` | `string(100)` | No | N/A | PayPal Dispute ID (e.g., `PP-D-849201`, unique index) |
| `seller_id` | `string(36)` | No | N/A | Foreign key to `sellers.id` |
| `customer_id` | `string(36)` | No | N/A | Foreign key to `customers.id` |
| `amount` | `float` | No | N/A | Dispute disputed value |
| `currency` | `string(10)` | No | `"USD"` | ISO 4217 Currency code |
| `reason` | `string(100)` | No | N/A | Dispute reason code (e.g., `ITEM_NOT_RECEIVED`) |
| `status` | `string(50)` | No | `"OPEN"` | Status (`OPEN`, `UNDER_REVIEW`, `RESOLVED`, `CLOSED`) |
| `ai_decision` | `json` | **Yes** | `null` | Serialized `AIDecision` from Gemini 2.0 Flash |
| `ev_breakdown` | `json` | **Yes** | `null` | Serialized `EVResult` mathematical breakdown |
| `evidence_snapshot` | `json` | **Yes** | `null` | Serialized `EvidenceSnapshot` (policies, PoD, buyer history) |
| `auto_executed` | `boolean` | No | `false` | Whether action was autonomously dispatched |
| `action_taken` | `string(50)` | **Yes** | `null` | Executed resolution action |
| `created_at` | `datetime` (UTC) | No | `utc_now()` | Ingestion timestamp |
| `updated_at` | `datetime` (UTC) | No | `utc_now()` | Last modification timestamp |

### `AuditLog`
Immutable dispute action audit trail (`audit_logs` table).

| Field | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `string(36)` | No | `generate_uuid()` | Primary Key (Standard UUID v4) |
| `dispute_id` | `string(36)` | No | N/A | Foreign key to `disputes.id` (`ondelete="CASCADE"`) |
| `action` | `string(100)` | No | N/A | Action identifier (e.g. `AI_EVALUATION_COMPLETED`) |
| `details` | `text` | No | N/A | Detailed execution log or PayPal API response |
| `timestamp` | `datetime` (UTC) | No | `utc_now()` | Event occurrence timestamp |

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Human-readable error message",
  "error_code": "DISPUTE_NOT_FOUND",
  "timestamp": "2026-10-25T12:00:00Z"
}
```

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `INVALID_REQUEST` | Bad request body or parameters |
| `404` | `DISPUTE_NOT_FOUND` | Dispute ID not found |
| `404` | `SELLER_NOT_FOUND` | Seller ID not found |
| `500` | `PAYPAL_API_ERROR` | PayPal API call failed |
| `500` | `AI_ENGINE_ERROR` | Gemini API call failed |
| `500` | `ELASTIC_ERROR` | Elasticsearch query failed |


---

## PayPal Sandbox Integration Specification

### 1. Environments & Base URLs
- **Sandbox Base URL:** `https://api-m.sandbox.paypal.com`
- **Merchant Sandbox Portal:** `https://sandbox.paypal.com` (Login using business test account)
- **Buyer Sandbox Portal:** `https://sandbox.paypal.com` (Login using personal test account)

### 2. Test Account Topology
| Account Role | Type | Env Variable | Purpose |
|---|---|---|---|
| Merchant / Seller | Business | `PAYPAL_BUSINESS_ACCOUNT` | Store protected by Sentin AI. Associated with REST App credentials (`PAYPAL_CLIENT_ID`). |
| Buyer / Shopper | Personal | `PAYPAL_BUYER_ACCOUNT` | Customer filing INR/SNAD dispute claims against the merchant. |

### 3. Server-Side PayPal Endpoints Handled by `paypal_client.py`

#### `POST /v1/oauth2/token`
Retrieves an OAuth2 bearer token for sandbox API interactions.
- **Headers:** `Authorization: Basic base64(PAYPAL_CLIENT_ID:PAYPAL_CLIENT_SECRET)`
- **Body:** `grant_type=client_credentials`

#### `GET /v1/customer/disputes/{dispute_id}`
Retrieves dispute state, customer claim details, and evidence deadlines.
- **Note on Deadlines:** Evidence deadline fields (`response_due_date`) are conditional and present only when merchant action is actively required. In resolved disputes, closed states, or local mock fallback responses, deadline fields are optional or omitted.

#### `POST /v1/customer/disputes/{dispute_id}/provide-evidence`
Submits carrier Proof-of-Delivery tracking and store policy documentation.
- **Defense Notes Content:** The `notes` field represents the synthesized merchant defense narrative incorporating cited store policy clauses alongside courier delivery verification.
- **Request Schema:**
```json
{
  "evidences": [
    {
      "evidence_type": "PROOF_OF_FULFILLMENT",
      "evidence_info": {
        "tracking_info": [
          {
            "carrier_name": "FEDEX",
            "tracking_number": "TRK-98234-FDX"
          }
        ]
      },
      "notes": "Delivered with signature confirmation under merchant return policy terms."
    }
  ]
}
```

#### `POST /v1/customer/disputes/{dispute_id}/accept-claim`
Accepts customer dispute claim. Programmatically dispatched when settling is mathematically optimal (`EV(Settle) > EV(Contest)` within autonomy thresholds), or manually authorized as an advisory executive override by a human supervisor via the AG Studio command center.

#### `POST /v2/payments/captures/{capture_id}/refund`
Executes an immediate payment refund to the customer.
