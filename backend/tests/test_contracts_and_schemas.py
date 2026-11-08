"""Unit tests for Core Contracts, Schemas, and Mathematical EV Calculator.

Verifies strict typing, boundary logic, and contract integrity.
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.constants import APP_NAME
from app.models.schemas import (
    AIDecision,
    EVResult,
    DisputeSummary,
    DisputeDetail,
    EvidenceSnapshot,
    SellerSummary,
    SellerListResponse,
)
from app.engine.ev_calculator import calculate_ev
from seed.seed_data import (
    get_seed_policies,
    get_seed_carriers,
    get_seed_customers,
    get_seed_sellers,
)

def test_app_name_dynamic() -> None:
    """Ensure app name is defined, dynamically loaded, and non-empty."""
    assert APP_NAME is not None
    assert isinstance(APP_NAME, str)
    assert len(APP_NAME.strip()) > 0

def test_ev_calculator_high_win_probability() -> None:
    """Test EV calculation when carrier tracking proof is conclusive (95% win)."""
    amount = 150.00
    win_prob = 0.95
    res = calculate_ev(amount=amount, win_probability=win_prob, dispute_fee=15.00)

    assert isinstance(res, EVResult)
    assert res.optimal_action == "CONTEST"
    assert res.expected_value_contest > res.expected_value_settle
    assert res.savings > 0

def test_ev_calculator_low_win_probability() -> None:
    """Test EV calculation when tracking is absent and win probability is low (10%)."""
    amount = 25.00
    win_prob = 0.10
    res = calculate_ev(amount=amount, win_probability=win_prob, dispute_fee=15.00)

    assert isinstance(res, EVResult)
    assert res.optimal_action in ["REFUND", "SETTLE"]
    assert res.expected_value_settle > res.expected_value_contest

def test_ai_decision_pydantic_schema() -> None:
    """Test AIDecision validation, bounding, and serialization constraints."""
    decision = AIDecision(
        recommended_action="CONTEST",
        win_probability=0.88,
        expected_value=120.50,
        reasoning="Tracking shows delivery with signature",
        auto_execute=True,
        confidence_factors=["Signed delivery", "Zero dispute history"],
    )
    assert decision.recommended_action == "CONTEST"
    assert 0.0 <= decision.win_probability <= 1.0

def test_seed_fixtures_valid() -> None:
    """Ensure seed datasets exist, parse cleanly, and meet minimum fixture thresholds."""
    policies = get_seed_policies()
    carriers = get_seed_carriers()
    customers = get_seed_customers()
    sellers = get_seed_sellers()

    assert len(policies) >= 3
    assert len(carriers) >= 2
    assert len(customers) >= 3
    assert len(sellers) >= 2

def test_customer_fixtures_schema_alignment() -> None:
    """Ensure customers.json fixtures match schema definitions and database types."""
    customers = get_seed_customers()
    for cust in customers:
        assert "id" in cust and isinstance(cust["id"], str)
        assert "email" in cust and "@" in cust["email"]
        assert "full_name" in cust and len(cust["full_name"]) > 0
        assert "total_spend" in cust and isinstance(cust["total_spend"], (int, float))
        assert "total_orders" in cust and isinstance(cust["total_orders"], int)
        assert "dispute_count" in cust and isinstance(cust["dispute_count"], int)
        assert "risk_score" in cust and 0.0 <= cust["risk_score"] <= 1.0

def test_dispute_summary_and_detail_schemas() -> None:
    """Verify DisputeSummary and DisputeDetail model parsing against API contracts."""
    now = datetime.now(timezone.utc)
    summary = DisputeSummary(
        id="disp-test-1",
        paypal_dispute_id="PP-D-99999",
        seller_id="seller_acme",
        seller_name="Apex Electronics",
        customer_id="cust_john_doe",
        customer_email="johndoe.shopper@example.com",
        amount=199.99,
        currency="USD",
        reason="ITEM_NOT_RECEIVED",
        status="UNDER_REVIEW",
        ai_decision=AIDecision(
            recommended_action="CONTEST",
            win_probability=0.92,
            expected_value=175.50,
            reasoning="Valid tracking with signature",
            auto_execute=True,
            confidence_factors=["Delivered on time"],
        ),
        auto_executed=True,
        action_taken="EVIDENCE_SUBMITTED",
        created_at=now,
        updated_at=now,
    )
    assert summary.id == "disp-test-1"
    assert summary.amount == 199.99

    detail = DisputeDetail(
        **summary.model_dump(),
        evidence=EvidenceSnapshot(
            policies_found=["Delivery Protection Policy §1"],
            pod_records=[{"tracking_number": "1Z999", "carrier": "UPS"}],
            customer_history={"total_orders": 8, "risk_score": 0.05},
        ),
        audit_log=[],
    )
    assert detail.evidence.customer_history["total_orders"] == 8

def test_seller_summary_and_list_response() -> None:
    """Verify SellerSummary and SellerListResponse serialization."""
    sellers = [
        SellerSummary(
            id="seller_acme",
            name="Apex Electronics",
            dispute_count=2,
            win_rate=0.91,
            total_amount_at_risk=189.99,
        )
    ]
    resp = SellerListResponse(sellers=sellers)
    assert len(resp.sellers) == 1
    assert resp.sellers[0].id == "seller_acme"

if __name__ == "__main__":
    test_app_name_dynamic()
    test_ev_calculator_high_win_probability()
    test_ev_calculator_low_win_probability()
    test_ai_decision_pydantic_schema()
    test_seed_fixtures_valid()
    test_customer_fixtures_schema_alignment()
    test_dispute_summary_and_detail_schemas()
    test_seller_summary_and_list_response()
    print("[Tests] All 8 contract and schema tests passed successfully!")
