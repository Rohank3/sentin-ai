"""Dispute Scenario Injector for pitch demos & sandbox integration.

Provides 1-click test scenarios enabling reliable, instantaneous demo pitches
with full autonomous triage, EV calculation, and PayPal integration.
"""

from fastapi import APIRouter
from typing import Dict, Any
from datetime import datetime, timezone
import uuid

from app.models.schemas import SimulateRequest, SimulateResponse
from app.api.routes_disputes import SEED_DISPUTES, triage_dispute

router = APIRouter(prefix="/api", tags=["Simulation"])

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

SCENARIO_CONFIGS = {
    "INR_WITH_TRACKING": {
        "amount": 149.99,
        "reason": "ITEM_NOT_RECEIVED",
        "customer_email": "honest.buyer@example.com",
        "description": "Buyer claims package never arrived. Tracking shows signed delivery."
    },
    "INR_NO_TRACKING": {
        "amount": 34.00,
        "reason": "ITEM_NOT_RECEIVED",
        "customer_email": "regular.buyer@example.com",
        "description": "Item lost in sorting depot with carrier weather delay."
    },
    "SNAD_MINOR": {
        "amount": 19.50,
        "reason": "SIGNIFICANTLY_NOT_AS_DESCRIBED",
        "customer_email": "small.order@example.com",
        "description": "Buyer states color slightly differs from photo on $19.50 item."
    },
    "SNAD_MAJOR": {
        "amount": 899.00,
        "reason": "SIGNIFICANTLY_NOT_AS_DESCRIBED",
        "customer_email": "enterprise.client@example.com",
        "description": "High value laptop claimed damaged. Exceeds auto-execution threshold."
    },
    "FRAUD_PATTERN": {
        "amount": 250.00,
        "reason": "ITEM_NOT_RECEIVED",
        "customer_email": "fraud.pattern.buyer@example.com",
        "description": "Repeat claimant with 3 prior disputes in 60 days."
    },
    "HIGH_VALUE": {
        "amount": 1250.00,
        "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
        "customer_email": "vip.customer@example.com",
        "description": "Enterprise purchase requiring mandatory supervisor authorization."
    }
}

@router.post("/simulate", response_model=SimulateResponse, status_code=201)
async def simulate_dispute_scenario(req: SimulateRequest):
    """Instantly inject a dispute scenario into the risk command center."""
    scenario_cfg = SCENARIO_CONFIGS.get(req.scenario_type, SCENARIO_CONFIGS["INR_WITH_TRACKING"])
    
    amount = req.amount if req.amount and req.amount != 149.99 else scenario_cfg["amount"]
    reason = req.reason if req.reason and req.reason != "ITEM_NOT_RECEIVED" else scenario_cfg["reason"]
    customer_email = req.customer_email if req.customer_email and req.customer_email != "buyer.sandbox@example.com" else scenario_cfg["customer_email"]

    new_id = f"disp-{uuid.uuid4().hex[:6]}"
    pp_dispute_id = f"PP-D-{uuid.uuid4().hex[:8].upper()}"

    dispute_record: Dict[str, Any] = {
        "id": new_id,
        "paypal_dispute_id": pp_dispute_id,
        "seller_id": req.seller_id or "seller_acme",
        "seller_name": "Apex Electronics" if (req.seller_id or "seller_acme") == "seller_acme" else "Nexus Direct Store",
        "customer_id": f"cust_{uuid.uuid4().hex[:6]}",
        "customer_email": customer_email,
        "amount": float(amount),
        "currency": "USD",
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
                "action": "SCENARIO_INJECTED",
                "details": f"Scenario {req.scenario_type} simulated for pitch demonstration: {scenario_cfg['description']}",
                "timestamp": utc_now()
            }
        ],
        "created_at": utc_now(),
        "updated_at": utc_now()
    }

    # Store in memory repository
    SEED_DISPUTES[new_id] = dispute_record

    # If auto_triage is requested, evaluate immediately
    if req.auto_triage:
        await triage_dispute(new_id)

    return SimulateResponse(
        dispute_id=new_id,
        paypal_dispute_id=pp_dispute_id,
        scenario_type=req.scenario_type,
        status="CREATED",
        message=f"Dispute scenario '{req.scenario_type}' injected and evaluated successfully."
    )
