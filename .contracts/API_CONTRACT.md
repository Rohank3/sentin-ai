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

Create a local, explicitly simulated dispute for demo purposes. This endpoint does
not create a PayPal case. IDs start with `SIM-`; all subsequent PayPal operations
on those IDs stay simulated even when sandbox credentials are configured.

Only `scenario_type` is required. Omitted `amount`, `reason`, and `customer_email`
use scenario defaults; explicitly supplied values are preserved. `auto_triage`
defaults to `true`. The record is stored in the existing in-memory repository.
Scenario labels do not guarantee distinct AI outcomes while AI/RAG dependencies
remain stubs.

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
  "dispute_id": "disp-0123456789abcdef0123456789abcdef",
  "paypal_dispute_id": "SIM-0123456789ABCDEF0123456789ABCDEF",
  "scenario_type": "INR_WITH_TRACKING",
  "status": "CREATED",
  "message": "Local simulation created. Triage completed. No PayPal case was created."
}
```

`status: CREATED` acknowledges local record creation, not successful PayPal
execution. The message reports `Triage completed.`, `Triage not requested.`, or
`Triage unavailable; retry from the dashboard.`. Triage failure still returns
201, records `TRIAGE_FAILED`, and leaves the record OPEN without an executed action.

---

### Webhooks

#### `POST /api/webhooks/paypal`

Receive and verify `CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.UPDATED`, and
`CUSTOMER.DISPUTE.RESOLVED` events. Requires the configured app's credentials and
`PAYPAL_WEBHOOK_ID`; offline demos must use `/api/simulate`.

**Headers:**
- `PayPal-Transmission-Id`
- `PayPal-Transmission-Time`
- `PayPal-Transmission-Sig`
- `PayPal-Cert-Url`
- `PayPal-Auth-Algo`

**Request Body:** PayPal webhook event payload. Required envelope fields are
`id`, `event_type`, timezone-aware `create_time`, and object `resource`.
Supported events require `resource.dispute_id` beginning with `PP-`. A new record
also requires `resource.reason` and `resource.dispute_amount` containing a finite,
positive `value` and a three-uppercase-letter `currency_code`. Existing records
can receive partial updates. `resource.update_time`, when present, must include
a timezone and is used instead of the event timestamp for ordering.

**Response:** `200 OK`
```json
{
  "status": "received",
  "event_type": "CUSTOMER.DISPUTE.CREATED"
}
```

`status` is `received` for an applied event, `duplicate` for a remembered event ID,
or `ignored` for unsupported event types, stale updates, and attempts to reopen
terminal records. Signature verification precedes these acknowledgements.

State is upserted by PayPal dispute ID and scoped to `PAYPAL_SELLER_ID`.
`WAITING_FOR_SELLER_RESPONSE` maps to OPEN; `WAITING_FOR_BUYER_RESPONSE` maps to
UNDER_REVIEW; a RESOLVED event sets RESOLVED. INR/SNAD PayPal reason names map to
the application's reason names. Other reason strings are retained.

The first disputed transaction can supply the buyer email and seller transaction
reference. That reference is not assumed to be a Payments v2 capture ID.
Ingestion records `WEBHOOK_VERIFIED`. With auto-triage enabled, non-terminal cases
also record `TRIAGE_PENDING_INTEGRATION`; real webhook ingestion does not invoke
the existing stub triage pipeline.

Replay protection remembers at most 10,000 event IDs in this process. Disputes,
ordering metadata, and event IDs are not persisted across restarts or shared
between workers. This is a single-worker demo implementation, not durable delivery.

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

## PayPal Client Integration (implementation as of 2026-10-30)

The following are internal async Python methods, not additional application HTTP
endpoints. Each operation returns a dictionary except token retrieval and capture
ID resolution (`str`), and signature verification (`bool`).

| Method | PayPal endpoint / behavior |
|---|---|
| `get_access_token(seller_id="default", seller_client_id=None, seller_client_secret=None)` | `POST /v1/oauth2/token`; Basic authentication and form grant; token cache keyed by seller and credential fingerprint, with expiry margin and a refresh lock |
| `get_dispute(dispute_id, seller_id="default")` | `GET /v1/customer/disputes/{id}` |
| `resolve_capture_id(dispute_id, seller_id="default")` | Returns a capture ID (`str`): reads the dispute's single seller transaction and verifies it with `GET /v2/payments/captures/{id}`; refuses absent/ambiguous/unverified mappings; SIM- disputes return a synthetic SIM-CAPTURE- ID without HTTP |
| `provide_evidence(dispute_id, carrier, tracking_number, notes, evidence_type="PROOF_OF_FULFILLMENT", seller_id="default")` | `POST /v1/customer/disputes/{id}/provide-evidence`; multipart `input` containing JSON fulfillment tracking evidence; other evidence types are not implemented |
| `accept_claim(dispute_id, notes, seller_id="default")` | `POST /v1/customer/disputes/{id}/accept-claim`; JSON `note` |
| `create_refund(capture_id, amount, currency="USD", note="Resolved via AI Dispute Management", seller_id="default", request_id=None)` | `POST /v2/payments/captures/{id}/refund`; JSON amount and payer note; `PayPal-Request-Id` header |
| `get_refund(refund_id, seller_id="default")` | `GET /v2/payments/refunds/{id}`; requires a matching real refund ID in the response; mock responses cannot authorize retries |
| `verify_webhook_signature(headers, event)` | `POST /v1/notifications/verify-webhook-signature`; five transmission headers, webhook registration ID, and original parsed event |

Successful nonempty upstream object responses are returned unchanged. An empty
success body becomes `{"status":"SUCCESS"}`. This acknowledgement is not proof
that a capture refund completed: callers must inspect the refund's actual status
and confirm COMPLETED before marking it refunded. Missing credentials produce
explicit `simulated: true` results only for eligible demo/default operations;
webhook verification never accepts mock success.

- Existing client method signatures remain supported. `create_refund` additionally
  accepts optional `request_id: str | None` for caller-controlled idempotency.
  Without it, one deterministic key per seller/capture/amount/currency is used;
  distinct intentional partial refunds of the same amount need distinct keys.
- `verify_webhook_signature(headers: Mapping[str, str], event: dict) -> bool`
  verifies with PayPal using `PAYPAL_WEBHOOK_ID`. Verification never uses mock success.
- `PAYPAL_SELLER_ID` (default `seller_acme`) maps the configured default app/webhook
  to a local seller. Per DEC-014, named sellers use their complete database
  credential pair first; when both fields are absent, platform credentials apply.
  `default` uses platform credentials directly. Unknown sellers return 404;
  incomplete pairs and database failures return 503 rather than silently falling back.
- `PAYPAL_WEBHOOK_ID` (default unset) is required for the webhook endpoint.
  Missing configuration returns 503; missing/invalid signatures return 401;
  invalid payloads return 400; unavailable PayPal returns 502/503. These use
  FastAPI's `{"detail": "..."}` error envelope, as do the existing routes.
- Valid unsupported event types return `status: ignored`. Recognized events return
  `received`; duplicate event IDs return `duplicate`. CREATED/UPDATED upsert by
  PayPal dispute ID; RESOLVED closes the existing record. Stale timestamps cannot
  reopen resolved records. Replay protection/storage is process-local, matching
  the existing dispute repository; persistent ingestion is a scaffold follow-up.
- Webhook ingestion does not call the current stub triage automatically: it uses
  fabricated tracking. It records a pending
  integration audit entry until the owner connects verified transaction evidence.
- Missing default credentials enable clearly marked offline client responses.
  Configured API failures return controlled errors, never simulated success.
  The simulator continues offline regardless of external credentials.
- Refunds require a capture ID, never a PayPal dispute ID. Monetary values must
  be finite, positive and use the supported currency's precision.

On an upstream 401 the client invalidates the seller's cached token and retries
once. It does not automatically replay timeouts or other rejected mutations.
Callers must reconcile uncertain outcomes before retrying. Separate intentional
same-amount partial refunds need distinct request IDs; a retry of one operation
must reuse its ID. Idempotency is subject to PayPal's retention window.

Triage REFUND now resolves and verifies the seller transaction as a Payments v2
capture before issuing the refund. Missing or multiple transactions, simulated
upstream data for a real dispute, or a mismatched capture response return 409
without issuing a refund. Non-capture seller transactions are not converted by
guessing: failed Payments lookup returns the existing upstream error.

Triage rejects already RESOLVED/REFUNDED records with 409 before capture lookup.
It records refund request ID, refund ID (when returned), and outcome in the
process-local dispute record. Triage bounds the payer-facing refund note to 255
characters before recording UNKNOWN, while retaining full AI reasoning in the
decision and audit log. Before issuing a refund it records UNKNOWN; a
timeout or missing response therefore cannot silently permit a second attempt.
The initial request ID is deterministic per seller/dispute; a new key is allocated
only after a reconciled terminal failure. This supplements, but does not replace,
durable attempt storage or extend PayPal's idempotency retention window.
On subsequent triage, any recorded refund attempt is reconciled via `get_refund`:
COMPLETED marks the dispute refunded and rejects repeat execution; only confirmed
FAILED/CANCELLED permits a new attempt with a new request ID. PENDING, unknown
status, missing refund ID, mismatched/mock data, and lookup errors block retry.
Missing refund IDs require manual reconciliation; there is no automatic guessing
from capture totals. Concurrent triage of one record is rejected with 409.
These guards share the existing single-process storage limitation; durable refund
attempt records and cross-worker locking remain required before production use.

Credential precedence now follows upstream DEC-014; no decision is superseded.
Shared configuration merge conflicts remain a Tech Lead handoff. See
[handoff status](MODULES.md#paypal-delivery-and-acceptance-status-2026-10-30).

## Error Responses

### Implemented PayPal and simulation errors

Explicit errors use FastAPI's `{"detail": "Human-readable message"}` envelope.
Request-model validation errors use FastAPI's normal 422 `detail` array.

| HTTP status | Condition |
|---|---|
| 400 | Invalid identifiers, refund/evidence inputs, webhook body/resource, or non-finite simulation amount |
| 401 | Missing or invalid webhook signature when verification is configured |
| 404 | Requested non-default seller not found |
| 409 | Webhook seller mismatch; missing/ambiguous/unverified capture mapping; completed refund, concurrent triage, or refund outcome not safe to retry |
| 422 | Simulation request fails Pydantic validation |
| 502 | PayPal authentication failure, rejected API operation, or malformed upstream response |
| 503 | Missing/incomplete required credentials or webhook ID, unavailable seller store, or PayPal request transport failure |

### Planned shared error envelope

The following shared error format/codes are a target for cross-module integration;
they are not currently emitted by the PayPal implementation. Consumers must not
require `error_code` or `timestamp` on its current responses:

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
