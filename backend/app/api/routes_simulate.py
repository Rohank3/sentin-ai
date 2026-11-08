"""Dispute Scenario Injector for pitch demos & sandbox integration.

Provides 1-click test scenarios enabling reliable, instantaneous demo pitches
with full autonomous triage, EV calculation, and PayPal integration.
"""

from fastapi import APIRouter, HTTPException
import math
import logging
from typing import Dict, Any
from datetime import datetime, timezone
import uuid

from app.models.schemas import SimulateRequest, SimulateResponse
# Consumes STUB: routes_disputes repository and triage pipeline.
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
    
    amount = req.amount if "amount" in req.model_fields_set else scenario_cfg["amount"]
    reason = req.reason if "reason" in req.model_fields_set else scenario_cfg["reason"]
    customer_email = req.customer_email if "customer_email" in req.model_fields_set else scenario_cfg["customer_email"]
    if not math.isfinite(amount):
        raise HTTPException(400, "Simulation amount must be finite.")

    new_id = f"disp-{uuid.uuid4().hex}"
    pp_dispute_id = f"SIM-{uuid.uuid4().hex.upper()}"

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
    triage_status = "Triage not requested."
    if req.auto_triage:
        try:
            await triage_dispute(new_id)
            triage_status = "Triage completed."
        except Exception:
            logging.getLogger(__name__).warning("Simulation triage failed for %s", new_id)
            dispute_record.update(auto_executed=False, action_taken=None, status="OPEN")
            dispute_record["audit_log"].append({
                "action": "TRIAGE_FAILED", "details": "Demo created; triage unavailable. Retry triage from the dashboard.",
                "timestamp": utc_now()
            })
            triage_status = "Triage unavailable; retry from the dashboard."

    return SimulateResponse(
        dispute_id=new_id,
        paypal_dispute_id=pp_dispute_id,
        scenario_type=req.scenario_type,
        status="CREATED",
        message=f"Local simulation created. {triage_status} No PayPal case was created."
    )
