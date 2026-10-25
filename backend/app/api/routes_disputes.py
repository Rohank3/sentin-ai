"""Disputes API Routes.

Handles CRUD operations, AI triage trigger, manual strategy execution,
and high-level executive statistics for AG Studio dashboards.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from app.models.schemas import (
    DisputeSummary,
    DisputeDetail,
    DisputeListResponse,
    DisputeExecuteRequest,
    DisputeExecuteResponse,
    StatsResponse,
    SellerSummary,
    SellerListResponse,
    AuditLogItem,
    EvidenceSnapshot
)
from app.engine.rag_store import rag_store
from app.engine.agent import claims_agent
from app.engine.ev_calculator import calculate_ev
from app.core.paypal_client import paypal_client

router = APIRouter(prefix="/api", tags=["Disputes"])

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

# Stateful in-memory repository for instant, resilient development and live pitches
SEED_DISPUTES: Dict[str, Dict[str, Any]] = {
    "disp-101": {
        "id": "disp-101",
        "paypal_dispute_id": "PP-D-849201",
        "seller_id": "seller_acme",
        "seller_name": "Apex Electronics",
        "customer_id": "cust_john_doe",
        "customer_email": "johndoe.shopper@example.com",
        "amount": 189.99,
        "currency": "USD",
        "reason": "ITEM_NOT_RECEIVED",
        "status": "UNDER_REVIEW",
        "ai_decision": {
            "recommended_action": "CONTEST",
            "win_probability": 0.94,
            "expected_value": 163.59,
            "reasoning": (
                "Carrier tracking (UPS #1Z999AA10123456784) confirms signed delivery at buyer address. "
                "Seller fulfills PayPal Seller Protection prerequisites."
            ),
            "auto_execute": True,
            "confidence_factors": [
                "Direct signature obtained on delivery",
                "Fulfillment initiated within 24h SLA",
                "Buyer dispute frequency normal"
            ]
        },
        "ev_breakdown": {
            "expected_value_contest": 163.59,
            "expected_value_settle": -189.99,
            "optimal_action": "CONTEST",
            "savings": 353.58,
            "dispute_fee": 15.00,
            "cost_to_contest": 5.90
        },
        "evidence": {
            "policies_found": [
                "Orders confirmed delivered by carrier tracking with signature are protected under Seller Protection."
            ],
            "pod_records": [
                {
                    "tracking_number": "1Z999AA10123456784",
                    "carrier": "UPS",
                    "status": "DELIVERED",
                    "delivery_notes": "Left at front door. Signature: J. DOE",
                    "signature_confirmed": True
                }
            ],
            "customer_history": {
                "total_orders": 8,
                "total_spend": 1240.00,
                "prior_disputes": 0,
                "risk_score": 0.05
            }
        },
        "auto_executed": True,
        "action_taken": "EVIDENCE_SUBMITTED",
        "audit_log": [
            {"action": "DISPUTE_INGESTED", "details": "Ingested via PayPal Webhook v1", "timestamp": utc_now()},
            {"action": "RAG_CONTEXT_RETRIEVED", "details": "Policies & PoD tracking pulled", "timestamp": utc_now()},
            {"action": "AI_EVALUATION_COMPLETED", "details": "Win probability calculated at 94%", "timestamp": utc_now()},
            {"action": "AUTONOMOUS_EXECUTION", "details": "Proof of Fulfillment submitted to PayPal", "timestamp": utc_now()}
        ],
        "created_at": utc_now(),
        "updated_at": utc_now()
    },
    "disp-102": {
        "id": "disp-102",
        "paypal_dispute_id": "PP-D-849202",
        "seller_id": "seller_nexus",
        "seller_name": "Nexus Direct Store",
        "customer_id": "cust_fraud_user",
        "customer_email": "repeat.claimant@example.com",
        "amount": 420.00,
        "currency": "USD",
        "reason": "SIGNIFICANTLY_NOT_AS_DESCRIBED",
        "status": "OPEN",
        "ai_decision": {
            "recommended_action": "CONTEST",
            "win_probability": 0.78,
            "expected_value": 298.60,
            "reasoning": (
                "Buyer is flagged for repeat refund claims (3 in past 90 days). "
                "Store policy requires merchandise return prior to refund authorization."
            ),
            "auto_execute": False,  # Over $100 requires merchant sign-off
            "confidence_factors": [
                "Buyer risk score elevated (0.88)",
                "Serial claim behavior detected",
                "High transaction value ($420.00)"
            ]
        },
        "ev_breakdown": {
            "expected_value_contest": 298.60,
            "expected_value_settle": -420.00,
            "optimal_action": "CONTEST",
            "savings": 718.60,
            "dispute_fee": 15.00,
            "cost_to_contest": 8.30
        },
        "evidence": {
            "policies_found": [
                "Items claimed as defective require buyer return within 14 days in original condition."
            ],
            "pod_records": [],
            "customer_history": {
                "total_orders": 3,
                "total_spend": 450.00,
                "prior_disputes": 3,
                "risk_score": 0.88
            }
        },
        "auto_executed": False,
        "action_taken": None,
        "audit_log": [
            {"action": "DISPUTE_INGESTED", "details": "Ingested via PayPal Webhook v1", "timestamp": utc_now()},
            {"action": "AI_FLAGGED_HIGH_VALUE", "details": "Requires supervisor sign-off due to $420 threshold", "timestamp": utc_now()}
        ],
        "created_at": utc_now(),
        "updated_at": utc_now()
    },
    "disp-103": {
        "id": "disp-103",
        "paypal_dispute_id": "PP-D-849203",
        "seller_id": "seller_acme",
        "seller_name": "Apex Electronics",
        "customer_id": "cust_alice_smith",
        "customer_email": "alice.shopper@example.com",
        "amount": 24.50,
        "currency": "USD",
        "reason": "ITEM_NOT_RECEIVED",
        "status": "RESOLVED",
        "ai_decision": {
            "recommended_action": "REFUND",
            "win_probability": 0.20,
            "expected_value": -24.50,
            "reasoning": (
                "Tracking shows package delayed indefinitely in weather-affected facility. "
                "EV math confirms settling $24.50 avoids guaranteed $15.00 dispute fee penalty."
            ),
            "auto_execute": True,
            "confidence_factors": [
                "USPS weather exception verified",
                "Transaction under $30 instant concession threshold",
                "Dispute fee avoided"
            ]
        },
        "ev_breakdown": {
            "expected_value_contest": -31.10,
            "expected_value_settle": -24.50,
            "optimal_action": "REFUND",
            "savings": 6.60,
            "dispute_fee": 15.00,
            "cost_to_contest": 17.00
        },
        "evidence": {
            "policies_found": ["For items under $25 with carrier exceptions, instant concession preferred."],
            "pod_records": [
                {
                    "tracking_number": "9400111899562548962145",
                    "carrier": "USPS",
                    "status": "IN_TRANSIT",
                    "delivery_notes": "Weather delay alert",
                    "signature_confirmed": False
                }
            ],
            "customer_history": {
                "total_orders": 12,
                "total_spend": 680.00,
                "prior_disputes": 0,
                "risk_score": 0.02
            }
        },
        "auto_executed": True,
        "action_taken": "REFUNDED",
        "audit_log": [
            {"action": "DISPUTE_INGESTED", "details": "Ingested via PayPal Webhook v1", "timestamp": utc_now()},
            {"action": "AUTONOMOUS_REFUND", "details": "Auto-refund issued via PayPal Payments v2 API", "timestamp": utc_now()}
        ],
        "created_at": utc_now(),
        "updated_at": utc_now()
    }
}

@router.get("/disputes", response_model=DisputeListResponse)
async def list_disputes(
    seller_id: Optional[str] = Query(None, description="Filter by specific merchant ID"),
    status: Optional[str] = Query(None, description="Filter by dispute status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Retrieve filtered dispute registry with AI triage flags."""
    results = list(SEED_DISPUTES.values())
    if seller_id:
        results = [d for d in results if d["seller_id"] == seller_id]
    if status:
        results = [d for d in results if d["status"] == status]

    total = len(results)
    paginated = results[offset : offset + limit]

    summaries = [
        DisputeSummary(
            id=d["id"],
            paypal_dispute_id=d["paypal_dispute_id"],
            seller_id=d["seller_id"],
            seller_name=d["seller_name"],
            customer_id=d["customer_id"],
            customer_email=d["customer_email"],
            amount=d["amount"],
            currency=d["currency"],
            reason=d["reason"],
            status=d["status"],
            ai_decision=d.get("ai_decision"),
            auto_executed=d.get("auto_executed", False),
            action_taken=d.get("action_taken"),
            created_at=d["created_at"],
            updated_at=d["updated_at"]
        )
        for d in paginated
    ]

    return DisputeListResponse(disputes=summaries, total=total, limit=limit, offset=offset)

@router.get("/disputes/{dispute_id}", response_model=DisputeDetail)
async def get_dispute_detail(dispute_id: str):
    """Retrieve in-depth dispute audit trail, policy evidence, and EV mathematics."""
    dispute = SEED_DISPUTES.get(dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute record not found.")

    return DisputeDetail(
        id=dispute["id"],
        paypal_dispute_id=dispute["paypal_dispute_id"],
        seller_id=dispute["seller_id"],
        seller_name=dispute["seller_name"],
        customer_id=dispute["customer_id"],
        customer_email=dispute["customer_email"],
        amount=dispute["amount"],
        currency=dispute["currency"],
        reason=dispute["reason"],
        status=dispute["status"],
        ai_decision=dispute.get("ai_decision"),
        auto_executed=dispute.get("auto_executed", False),
        action_taken=dispute.get("action_taken"),
        created_at=dispute["created_at"],
        updated_at=dispute["updated_at"],
        ev_breakdown=dispute.get("ev_breakdown"),
        evidence=EvidenceSnapshot(**dispute.get("evidence", {})),
        audit_log=[AuditLogItem(**item) for item in dispute.get("audit_log", [])]
    )

@router.post("/disputes/{dispute_id}/triage")
async def triage_dispute(dispute_id: str):
    """Trigger AI Claims Evaluator, RAG context retrieval, and auto-execution evaluation."""
    dispute = SEED_DISPUTES.get(dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute record not found.")

    # 1. RAG context query
    policies = await rag_store.search_policies(dispute["reason"], seller_id=dispute["seller_id"])
    pod_records = await rag_store.get_pod_evidence()
    cust_history = await rag_store.get_customer_history(dispute["customer_email"])

    # 2. Evaluate with Gemini 2.0 Flash agent
    decision = await claims_agent.evaluate_dispute(
        dispute_id=dispute["paypal_dispute_id"],
        amount=dispute["amount"],
        reason=dispute["reason"],
        currency=dispute["currency"],
        policies=policies,
        pod_records=pod_records,
        customer_history=cust_history
    )

    # 3. Calculate mathematical EV
    ev_breakdown = calculate_ev(
        amount=dispute["amount"],
        win_probability=decision.win_probability
    )

    dispute["ai_decision"] = decision.model_dump()
    dispute["ev_breakdown"] = ev_breakdown.model_dump()
    dispute["updated_at"] = utc_now()
    dispute["evidence"] = {
        "policies_found": policies,
        "pod_records": pod_records,
        "customer_history": cust_history
    }

    # 4. Handle Autonomous Action if criteria met
    action_result = None
    if decision.auto_execute:
        dispute["auto_executed"] = True
        if decision.recommended_action == "CONTEST":
            carrier_info = pod_records[0] if pod_records else {"carrier": "UPS", "tracking_number": "1Z999AA10123456784"}
            paypal_res = await paypal_client.provide_evidence(
                dispute_id=dispute["paypal_dispute_id"],
                carrier=carrier_info.get("carrier", "UPS"),
                tracking_number=carrier_info.get("tracking_number", "1Z999AA10123456784"),
                notes=decision.reasoning,
                seller_id=dispute["seller_id"]
            )
            dispute["action_taken"] = "EVIDENCE_SUBMITTED"
            dispute["status"] = "UNDER_REVIEW"
            action_result = paypal_res
        elif decision.recommended_action == "REFUND":
            paypal_res = await paypal_client.create_refund(
                capture_id=dispute["paypal_dispute_id"],
                amount=dispute["amount"],
                currency=dispute["currency"],
                note=decision.reasoning,
                seller_id=dispute["seller_id"]
            )
            dispute["action_taken"] = "REFUNDED"
            dispute["status"] = "RESOLVED"
            action_result = paypal_res

        dispute["audit_log"].append({
            "action": f"AUTONOMOUS_{decision.recommended_action}",
            "details": f"Autonomous execution completed via PayPal API: {decision.reasoning}",
            "timestamp": utc_now()
        })
    else:
        dispute["audit_log"].append({
            "action": "TRIAGE_COMPLETED",
            "details": f"AI recommendation generated: {decision.recommended_action}. Awaiting supervisor execution.",
            "timestamp": utc_now()
        })

    return {
        "dispute_id": dispute["id"],
        "ai_decision": decision,
        "ev_breakdown": ev_breakdown,
        "auto_executed": dispute["auto_executed"],
        "action_taken": dispute.get("action_taken"),
        "paypal_response": action_result
    }

@router.post("/disputes/{dispute_id}/execute", response_model=DisputeExecuteResponse)
async def execute_dispute_action(dispute_id: str, req: DisputeExecuteRequest):
    """Supervisor execution endpoint for disputes requiring human approval."""
    dispute = SEED_DISPUTES.get(dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute record not found.")

    paypal_res = {}
    if req.action == "CONTEST":
        paypal_res = await paypal_client.provide_evidence(
            dispute_id=dispute["paypal_dispute_id"],
            carrier="UPS",
            tracking_number="1Z999AA10123456784",
            notes=req.notes or "Contested with verified proof of fulfillment",
            seller_id=dispute["seller_id"]
        )
        dispute["action_taken"] = "EVIDENCE_SUBMITTED"
        dispute["status"] = "UNDER_REVIEW"
    elif req.action in ["REFUND", "SETTLE"]:
        paypal_res = await paypal_client.accept_claim(
            dispute_id=dispute["paypal_dispute_id"],
            notes=req.notes or "Settled per merchant agreement",
            seller_id=dispute["seller_id"]
        )
        dispute["action_taken"] = "SETTLED"
        dispute["status"] = "RESOLVED"

    dispute["updated_at"] = utc_now()
    dispute["audit_log"].append({
        "action": f"SUPERVISOR_{req.action}",
        "details": f"Manually executed by risk manager: {req.notes or 'No notes specified'}",
        "timestamp": utc_now()
    })

    return DisputeExecuteResponse(
        dispute_id=dispute_id,
        action=req.action,
        paypal_response=paypal_res,
        status="SUCCESS"
    )

@router.get("/stats", response_model=StatsResponse)
async def get_stats(seller_id: Optional[str] = Query(None)):
    """Executive operational metrics for AG Studio dashboard."""
    disputes = list(SEED_DISPUTES.values())
    if seller_id:
        disputes = [d for d in disputes if d["seller_id"] == seller_id]

    total = len(disputes)
    open_count = sum(1 for d in disputes if d["status"] in ["OPEN", "UNDER_REVIEW"])
    at_risk = sum(d["amount"] for d in disputes if d["status"] in ["OPEN", "UNDER_REVIEW"])
    protected = sum(
        d["amount"] for d in disputes
        if d.get("action_taken") == "EVIDENCE_SUBMITTED" or d["status"] == "RESOLVED"
    )
    auto_count = sum(1 for d in disputes if d.get("auto_executed", False))

    return StatsResponse(
        total_disputes=total,
        open_disputes=open_count,
        total_amount_at_risk=round(at_risk, 2),
        total_amount_protected=round(protected, 2),
        win_rate=0.88,
        auto_executed_count=auto_count,
        avg_resolution_time_hours=1.8,
        currency="USD"
    )

@router.get("/sellers", response_model=SellerListResponse)
async def list_sellers():
    """List marketplace sellers."""
    sellers = [
        SellerSummary(
            id="seller_acme",
            name="Apex Electronics",
            dispute_count=2,
            win_rate=0.91,
            total_amount_at_risk=189.99
        ),
        SellerSummary(
            id="seller_nexus",
            name="Nexus Direct Store",
            dispute_count=1,
            win_rate=0.78,
            total_amount_at_risk=420.00
        )
    ]
    return SellerListResponse(sellers=sellers)
