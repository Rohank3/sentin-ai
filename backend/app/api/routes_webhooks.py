"""Verified, replay-aware PayPal dispute & payment ingestion with automated triage handoff."""
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Literal
import uuid
import logging

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, Field, ValidationError, AwareDatetime

from app.models.schemas import WebhookResponse
from app.api.routes_disputes import SEED_DISPUTES, _save_dispute_to_db, _triage_dispute
from app.core.config import settings
from app.core.paypal_client import paypal_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])
_received_events: OrderedDict[str, None] = OrderedDict()

_DISPUTE_EVENTS = {
    "CUSTOMER.DISPUTE.CREATED",
    "CUSTOMER.DISPUTE.UPDATED",
    "CUSTOMER.DISPUTE.RESOLVED",
}
_PAYMENT_EVENTS = {
    "PAYMENT.CAPTURE.REFUNDED",
    "PAYMENT.SALE.REVERSED",
}
_SUPPORTED = _DISPUTE_EVENTS | _PAYMENT_EVENTS


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


async def _execute_webhook_triage(dispute_id: str):
    """Background worker executing autonomous AI RAG triage and EV arbitration."""
    dispute = SEED_DISPUTES.get(dispute_id)
    if not dispute:
        logger.warning("Background triage aborted: dispute %s not in memory", dispute_id)
        return

    if dispute.get("_triage_in_progress"):
        logger.debug("Dispute %s triage already running; skipping", dispute_id)
        return

    dispute["_triage_in_progress"] = True
    try:
        logger.info("Executing background AI triage for dispute %s", dispute_id)
        updated = await _triage_dispute(dispute)
        SEED_DISPUTES[dispute_id] = updated
        await _save_dispute_to_db(updated)
        logger.info("Completed background AI triage for dispute %s", dispute_id)
    except Exception as exc:
        logger.warning("Background webhook triage notice for %s: %s", dispute_id, exc)
        dispute["audit_log"].append({
            "action": "TRIAGE_NOTICE",
            "timestamp": utc_now(),
            "details": f"Autonomous triage encountered notice: {str(exc)}"
        })
        await _save_dispute_to_db(dispute)
    finally:
        dispute.pop("_triage_in_progress", None)


@router.post("/paypal", response_model=WebhookResponse)
async def paypal_webhook_handler(request: Request, background_tasks: BackgroundTasks):
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
    if event.id in _received_events:
        return WebhookResponse(status="duplicate", event_type=event.event_type)

    # Immediately record event ID to guard concurrent retries atomically in the event loop
    _remember(event.id)
    now = utc_now()

    # Handle Payment Lifecycle Events (Refunds & Reversals)
    if event.event_type in _PAYMENT_EVENTS:
        resource = event.resource or {}
        resource_id = str(resource.get("id") or "")
        parent_payment = str(resource.get("parent_payment") or "")
        capture_id = str(resource.get("capture_id") or "")

        # Find matching dispute in local cache
        record = next(
            (
                d for d in SEED_DISPUTES.values()
                if (d.get("paypal_transaction_id") and d.get("paypal_transaction_id") in {resource_id, parent_payment, capture_id})
                or (d.get("paypal_refund_id") and d.get("paypal_refund_id") == resource_id)
                or (d.get("paypal_dispute_id") and d.get("paypal_dispute_id") in {resource_id, parent_payment})
            ),
            None,
        )

        if record:
            if event.event_type == "PAYMENT.CAPTURE.REFUNDED":
                record["status"] = "RESOLVED"
                record["action_taken"] = "REFUND"
                record["updated_at"] = now
                record["audit_log"].append({
                    "action": "PAYMENT_REFUNDED_WEBHOOK",
                    "timestamp": now,
                    "details": f"PayPal confirmed capture refund {resource_id}. Dispute case marked RESOLVED."
                })
            elif event.event_type == "PAYMENT.SALE.REVERSED":
                record["status"] = "UNDER_REVIEW"
                record["updated_at"] = now
                record["audit_log"].append({
                    "action": "PAYMENT_REVERSED_WEBHOOK",
                    "timestamp": now,
                    "details": f"PayPal confirmed payment reversal for transaction {resource_id}."
                })
            SEED_DISPUTES[record["id"]] = record
            await _save_dispute_to_db(record)
        else:
            logger.info("Ingested %s event %s without matching active dispute record", event.event_type, event.id)

        return WebhookResponse(status="received", event_type=event.event_type)

    # Handle Customer Dispute Events
    try:
        resource = _Resource.model_validate(event.resource)
    except ValidationError:
        raise HTTPException(400, "Invalid PayPal dispute resource.") from None

    # Lookup and mutate process-local and database state
    record = next((d for d in SEED_DISPUTES.values()
                   if d["paypal_dispute_id"] == resource.dispute_id), None)
    if record and record["seller_id"] != settings.paypal_seller_id:
        raise HTTPException(409, "Dispute belongs to a different seller.")
    timestamp = resource.update_time or event.create_time
    if record and (timestamp < record.get("paypal_updated_at", datetime.min.replace(tzinfo=timezone.utc))
                   or (record["status"] in {"RESOLVED", "CLOSED"} and event.event_type != "CUSTOMER.DISPUTE.RESOLVED")):
        return WebhookResponse(status="ignored", event_type=event.event_type)

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
        record["paypal_transaction_id"] = transaction.get("seller_transaction_id")
    record.update(updated_at=now, paypal_updated_at=timestamp)
    record["audit_log"].append({
        "action": "WEBHOOK_VERIFIED",
        "timestamp": now,
        "details": f"Verified {event.event_type}; event {event.id}."
    })

    if settings.auto_triage_enabled and record["status"] not in {"RESOLVED", "CLOSED"}:
        record["audit_log"].append({
            "action": "TRIAGE_QUEUED",
            "timestamp": now,
            "details": "Verified case ingested. AI triage dispatched to background worker."
        })
        background_tasks.add_task(_execute_webhook_triage, record["id"])

    SEED_DISPUTES[record["id"]] = record
    await _save_dispute_to_db(record)
    return WebhookResponse(status="received", event_type=event.event_type)


def _remember(event_id):
    _received_events[event_id] = None
    if len(_received_events) > 10000:
        _received_events.popitem(last=False)
