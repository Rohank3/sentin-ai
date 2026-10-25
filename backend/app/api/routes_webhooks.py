"""PayPal Webhook Ingestion Routes.

Receives real-time PayPal Customer Dispute events:
- CUSTOMER.DISPUTE.CREATED
- CUSTOMER.DISPUTE.RESOLVED
- CUSTOMER.DISPUTE.UPDATED
"""

from fastapi import APIRouter, Request, Header
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from app.models.schemas import WebhookResponse
from app.api.routes_disputes import SEED_DISPUTES, triage_dispute
from app.core.config import settings

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

@router.post("/paypal", response_model=WebhookResponse)
async def paypal_webhook_handler(
    request: Request,
    paypal_transmission_id: Optional[str] = Header(None, alias="PayPal-Transmission-Id"),
    paypal_transmission_time: Optional[str] = Header(None, alias="PayPal-Transmission-Time")
):
    """Receive and process dispute notifications sent from PayPal Sandbox."""
    try:
        body: Dict[str, Any] = await request.json()
    except Exception:
        body = {}

    event_type = body.get("event_type", "CUSTOMER.DISPUTE.CREATED")
    resource = body.get("resource", {})

    pp_dispute_id = resource.get("dispute_id", f"PP-D-{uuid.uuid4().hex[:8].upper()}")
    dispute_amount_obj = resource.get("dispute_amount", {})
    amount = float(dispute_amount_obj.get("value", 120.00))
    currency = dispute_amount_obj.get("currency_code", "USD")
    reason = resource.get("reason", "MERCHANDISE_OR_SERVICE_NOT_RECEIVED")

    # Ingest if new dispute
    new_id = f"disp-{uuid.uuid4().hex[:6]}"
    dispute_record: Dict[str, Any] = {
        "id": new_id,
        "paypal_dispute_id": pp_dispute_id,
        "seller_id": "seller_acme",
        "seller_name": "Apex Electronics",
        "customer_id": f"cust_{uuid.uuid4().hex[:6]}",
        "customer_email": resource.get("buyer_email", "webhook.buyer@example.com"),
        "amount": amount,
        "currency": currency,
        "reason": reason,
        "status": "OPEN",
        "ai_decision": None,
        "ev_breakdown": None,
        "evidence": {
            "policies_found": [],
            "pod_records": [],
            "customer_history": {}
        },
        "auto_executed": False,
        "action_taken": None,
        "audit_log": [
            {
                "action": "WEBHOOK_INGESTED",
                "details": f"Received event {event_type} (transmission: {paypal_transmission_id or 'local'})",
                "timestamp": utc_now()
            }
        ],
        "created_at": utc_now(),
        "updated_at": utc_now()
    }

    SEED_DISPUTES[new_id] = dispute_record

    # Auto-triage if enabled in settings
    if settings.auto_triage_enabled and event_type in ["CUSTOMER.DISPUTE.CREATED", "CUSTOMER.DISPUTE.UPDATED"]:
        try:
            await triage_dispute(new_id)
        except Exception as e:
            print(f"[Webhook] Auto-triage failed: {e}")

    return WebhookResponse(
        status="received",
        event_type=event_type
    )
