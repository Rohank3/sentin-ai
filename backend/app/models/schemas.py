from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

class AIDecision(BaseModel):
    recommended_action: Literal["CONTEST", "SETTLE", "REFUND"] = Field(
        description="Recommended course of action"
    )
    win_probability: float = Field(
        ge=0.0, le=1.0, description="Estimated probability of winning a contest (0.0 to 1.0)"
    )
    expected_value: float = Field(
        description="Net mathematical expected value of taking the recommended action"
    )
    reasoning: str = Field(
        description="Detailed policy and evidence-based justification for the decision"
    )
    auto_execute: bool = Field(
        description="Whether the AI recommends autonomous execution based on confidence & risk"
    )
    confidence_factors: List[str] = Field(
        default_factory=list,
        description="Key supporting facts: courier confirmation, policy clauses, buyer history"
    )

class EVResult(BaseModel):
    expected_value_contest: float
    expected_value_settle: float
    optimal_action: Literal["CONTEST", "SETTLE", "REFUND"]
    savings: float
    dispute_fee: float
    cost_to_contest: float

class DisputeSummary(BaseModel):
    id: str
    paypal_dispute_id: str
    seller_id: str
    seller_name: str
    customer_id: str
    customer_email: str
    amount: float
    currency: str
    reason: str
    status: str
    ai_decision: Optional[AIDecision] = None
    auto_executed: bool = False
    action_taken: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class EvidenceSnapshot(BaseModel):
    policies_found: List[str] = Field(default_factory=list)
    pod_records: List[Dict[str, Any]] = Field(default_factory=list)
    customer_history: Dict[str, Any] = Field(default_factory=dict)

class AuditLogItem(BaseModel):
    action: str
    details: str
    timestamp: datetime

class DisputeDetail(DisputeSummary):
    ev_breakdown: Optional[EVResult] = None
    evidence: EvidenceSnapshot = Field(default_factory=EvidenceSnapshot)
    audit_log: List[AuditLogItem] = Field(default_factory=list)

class DisputeListResponse(BaseModel):
    disputes: List[DisputeSummary]
    total: int
    limit: int
    offset: int

class DisputeExecuteRequest(BaseModel):
    action: Literal["CONTEST", "SETTLE", "REFUND"]
    notes: Optional[str] = None

class DisputeExecuteResponse(BaseModel):
    dispute_id: str
    action: str
    paypal_response: Dict[str, Any]
    status: str = "SUCCESS"

class StatsResponse(BaseModel):
    total_disputes: int
    open_disputes: int
    total_amount_at_risk: float
    total_amount_protected: float
    win_rate: float
    auto_executed_count: int
    avg_resolution_time_hours: float
    currency: str = "USD"

class SimulateRequest(BaseModel):
    scenario_type: Literal[
        "INR_WITH_TRACKING",
        "INR_NO_TRACKING",
        "SNAD_MINOR",
        "SNAD_MAJOR",
        "FRAUD_PATTERN",
        "HIGH_VALUE"
    ]
    amount: float = Field(gt=0, default=149.99)
    reason: str = "ITEM_NOT_RECEIVED"
    seller_id: Optional[str] = None
    customer_email: str = "buyer.sandbox@example.com"
    auto_triage: bool = True

class SimulateResponse(BaseModel):
    dispute_id: str
    paypal_dispute_id: str
    scenario_type: str
    status: str
    message: str

class SellerSummary(BaseModel):
    id: str
    name: str
    dispute_count: int
    win_rate: float
    total_amount_at_risk: float

class SellerListResponse(BaseModel):
    sellers: List[SellerSummary]

class WebhookResponse(BaseModel):
    status: str
    event_type: str
