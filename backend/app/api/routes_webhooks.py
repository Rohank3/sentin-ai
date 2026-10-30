"""Verified, replay-aware PayPal dispute ingestion for the demo repository."""
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Literal
import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError, AwareDatetime

from app.models.schemas import WebhookResponse
# Consumes STUB: routes_disputes repository. Persistence belongs to the Tech Lead.
from app.api.routes_disputes import SEED_DISPUTES
from app.core.config import settings
from app.core.paypal_client import paypal_client

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])
_received_events: OrderedDict[str, None] = OrderedDict()
_SUPPORTED = {"CUSTOMER.DISPUTE.CREATED", "CUSTOMER.DISPUTE.UPDATED", "CUSTOMER.DISPUTE.RESOLVED"}


class _Event(BaseModel):
    id: str = Field(min_length=1, max_length=255)
    event_type: str = Field(min_length=1, max_length=255)
    create_time: AwareDatetime
    resource: dict


class _Money(BaseModel):
    value: float = Field(gt=0, allow_inf_nan=False)
    currency_code: str = Field(pattern=r"^[A-Z]{3}$")


class _Resource(BaseModel):
    dispute_id: str = Field(pattern=r"^PP-[A-Za-z0-9-]+$", max_length=255)
    dispute_amount: _Money | None = None
    reason: str | None = Field(default=None, min_length=1, max_length=255)
    status: Literal["OPEN", "WAITING_FOR_SELLER_RESPONSE", "WAITING_FOR_BUYER_RESPONSE", "UNDER_REVIEW", "RESOLVED"] | None = None
    update_time: AwareDatetime | None = None
    disputed_transactions: list[dict] = Field(default_factory=list)


def utc_now():
    return datetime.now(timezone.utc)


@router.post("/paypal", response_model=WebhookResponse)
async def paypal_webhook_handler(request: Request):
    """Reject unverified events before touching state; acknowledge retries safely."""
    try:
        body = await request.json()
        event = _Event.model_validate(body)
    except (ValueError, ValidationError):
        raise HTTPException(400, "Invalid PayPal webhook event.") from None
    if not await paypal_client.verify_webhook_signature(request.headers, body):
        raise HTTPException(401, "PayPal webhook signature verification failed.")
    if event.event_type not in _SUPPORTED:
        return WebhookResponse(status="ignored", event_type=event.event_type)
    try:
        resource = _Resource.model_validate(event.resource)
    except ValidationError:
        raise HTTPException(400, "Invalid PayPal dispute resource.") from None
    if event.id in _received_events:
        return WebhookResponse(status="duplicate", event_type=event.event_type)

    # No await between lookup and mutation: atomic in the single-process demo server.
    record = next((d for d in SEED_DISPUTES.values()
                   if d["paypal_dispute_id"] == resource.dispute_id), None)
    if record and record["seller_id"] != settings.paypal_seller_id:
        raise HTTPException(409, "Dispute belongs to a different seller.")
    timestamp = resource.update_time or event.create_time
    if record and (timestamp < record.get("paypal_updated_at", datetime.min.replace(tzinfo=timezone.utc))
                   or (record["status"] in {"RESOLVED", "CLOSED"} and event.event_type != "CUSTOMER.DISPUTE.RESOLVED")):
        _remember(event.id)
        return WebhookResponse(status="ignored", event_type=event.event_type)
    now = utc_now()
    if record is None:
        if resource.dispute_amount is None or resource.reason is None:
            raise HTTPException(400, "A new dispute requires amount, currency and reason.")
        record = {
            "id": str(uuid.uuid4()), "paypal_dispute_id": resource.dispute_id,
            "seller_id": settings.paypal_seller_id, "seller_name": settings.paypal_seller_id,
            "customer_id": str(uuid.uuid4()), "customer_email": "",
            "ai_decision": None, "ev_breakdown": None, "auto_executed": False,
            "action_taken": None, "evidence": {"policies_found": [], "pod_records": [], "customer_history": {}},
            "audit_log": [], "created_at": now, "status": "OPEN",
        }
    if resource.dispute_amount:
        record.update(amount=resource.dispute_amount.value, currency=resource.dispute_amount.currency_code)
    if resource.reason:
        record["reason"] = {"MERCHANDISE_OR_SERVICE_NOT_RECEIVED": "ITEM_NOT_RECEIVED",
                            "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED": "SIGNIFICANTLY_NOT_AS_DESCRIBED"}.get(resource.reason, resource.reason)
    if resource.status:
        record["status"] = {"WAITING_FOR_SELLER_RESPONSE": "OPEN", "WAITING_FOR_BUYER_RESPONSE": "UNDER_REVIEW"}.get(resource.status, resource.status)
    if event.event_type == "CUSTOMER.DISPUTE.RESOLVED":
        record["status"] = "RESOLVED"
    if resource.disputed_transactions:
        transaction = resource.disputed_transactions[0]
        buyer = transaction.get("buyer")
        if isinstance(buyer, dict) and isinstance(buyer.get("email"), str):
            record["customer_email"] = buyer["email"]
        # Keep the seller transaction reference; it is NOT assumed to be a v2 capture ID.
        record["paypal_transaction_id"] = transaction.get("seller_transaction_id")
    record.update(updated_at=now, paypal_updated_at=timestamp)
    record["audit_log"].append({"action": "WEBHOOK_VERIFIED", "timestamp": now,
                                "details": f"Verified {event.event_type}; event {event.id}."})
    if settings.auto_triage_enabled and record["status"] not in {"RESOLVED", "CLOSED"}:
        # REQUEST: Tech Lead must connect real evidence in routes_disputes
        # before automatic execution of real webhooks can safely use that stub.
        record["audit_log"].append({"action": "TRIAGE_PENDING_INTEGRATION", "timestamp": now,
                                    "details": "Verified case ingested. Real evidence requires integration before automatic execution."})
    SEED_DISPUTES[record["id"]] = record
    _remember(event.id)
    return WebhookResponse(status="received", event_type=event.event_type)


def _remember(event_id):
    _received_events[event_id] = None
    if len(_received_events) > 10000:
        _received_events.popitem(last=False)
