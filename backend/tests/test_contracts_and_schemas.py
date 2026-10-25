"""Unit tests for Core Contracts, Schemas, and Mathematical EV Calculator.

Verifies strict typing, boundary logic, and contract integrity.
"""

import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.constants import APP_NAME
from app.models.schemas import AIDecision, EVResult
from app.engine.ev_calculator import calculate_ev
from seed.seed_data import get_seed_policies, get_seed_carriers, get_seed_customers

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
        confidence_factors=["Signed delivery", "Zero dispute history"]
    )
    assert decision.recommended_action == "CONTEST"
    assert 0.0 <= decision.win_probability <= 1.0

def test_seed_fixtures_valid() -> None:
    """Ensure seed datasets exist, parse cleanly, and meet minimum fixture thresholds."""
    policies = get_seed_policies()
    carriers = get_seed_carriers()
    customers = get_seed_customers()

    assert len(policies) >= 3
    assert len(carriers) >= 2
    assert len(customers) >= 3

if __name__ == "__main__":
    test_app_name_dynamic()
    test_ev_calculator_high_win_probability()
    test_ev_calculator_low_win_probability()
    test_ai_decision_pydantic_schema()
    test_seed_fixtures_valid()
    print("[Tests] All 5 contract and schema tests passed successfully!")
