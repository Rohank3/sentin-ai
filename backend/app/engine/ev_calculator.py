"""Expected Value (EV) Calculator for Dispute Resolution.

Calculates the mathematically optimal strategy:
- CONTEST: Incur operational/dispute fee risk weighted by probability of victory.
- SETTLE/REFUND: Concede dispute amount but avoid dispute fees & protect seller metrics.
"""

from typing import Literal, Optional
from app.models.schemas import EVResult

DEFAULT_DISPUTE_FEE = 15.00  # Standard PayPal dispute fee in USD
DEFAULT_LABOR_COST = 5.00    # Estimated internal merchant handling cost in USD


def calculate_ev(
    amount: float,
    win_probability: float,
    dispute_fee: float = DEFAULT_DISPUTE_FEE,
    settlement_cost: Optional[float] = None,
    estimated_labor_cost: float = DEFAULT_LABOR_COST
) -> EVResult:
    """Calculate the expected financial value of contesting vs. settling.

    EV(Contest) = WinProb * (Amount) - (1 - WinProb) * (Amount + DisputeFee) - LaborCost
    EV(Settle) = -SettlementCost (defaults to full refund amount)

    Args:
        amount: Disputed transaction amount.
        win_probability: Probability of winning contest (0.0 to 1.0).
        dispute_fee: Fixed dispute/chargeback fee charged by payment network on loss.
        settlement_cost: Direct cost if settled immediately (defaults to full refund).
        estimated_labor_cost: Internal evidence collection and review cost.

    Returns:
        EVResult with contest EV, settle EV, optimal action, and net savings.
    """
    amt = max(0.0, float(amount))
    fee = max(0.0, float(dispute_fee))
    labor = max(0.0, float(estimated_labor_cost))

    if settlement_cost is None:
        settle_cost = amt
    else:
        settle_cost = max(0.0, float(settlement_cost))

    # Bound probability strictly to [0.0, 1.0]
    p = max(0.0, min(1.0, float(win_probability)))

    # Contest outcome:
    # If win (prob p): recover/retain amount, pay labor cost
    # If loss (prob 1-p): forfeit amount, pay dispute fee, pay labor cost
    ev_contest = (p * amt) - ((1.0 - p) * (amt + fee)) - labor

    # Settle outcome:
    # Forfeit settlement cost, no dispute fee penalty incurred
    ev_settle = -abs(settle_cost)

    diff = round(ev_contest - ev_settle, 2)

    if diff > 0.0:
        optimal: Literal["CONTEST", "SETTLE", "REFUND"] = "CONTEST"
        savings = diff
    elif diff < 0.0:
        # If settling is better, determine whether it's a partial settlement or full refund
        optimal = "SETTLE" if settle_cost < amt else "REFUND"
        savings = round(abs(diff), 2)
    else:
        optimal = "SETTLE" if settle_cost < amt else "REFUND"
        savings = 0.0

    return EVResult(
        expected_value_contest=round(ev_contest, 2),
        expected_value_settle=round(ev_settle, 2),
        optimal_action=optimal,
        savings=savings,
        dispute_fee=fee,
        cost_to_contest=round(labor + ((1.0 - p) * fee), 2)
    )


def break_even_probability(
    amount: float,
    dispute_fee: float = DEFAULT_DISPUTE_FEE,
    estimated_labor_cost: float = DEFAULT_LABOR_COST
) -> float:
    """Calculate the minimum win probability required for contesting to have higher EV than settling.

    Derived from EV(Contest) == EV(Settle) where settlement_cost == amount:
        p * A - (1 - p) * (A + F) - L == -A
        p * (2*A + F) == F + L
        p = (F + L) / (2*A + F)

    Args:
        amount: Disputed transaction amount.
        dispute_fee: Fixed dispute fee incurred on loss.
        estimated_labor_cost: Labor cost of gathering and submitting evidence.

    Returns:
        Break-even probability clamped to [0.0, 1.0] rounded to 4 decimals.
    """
    amt = max(0.0, float(amount))
    fee = max(0.0, float(dispute_fee))
    labor = max(0.0, float(estimated_labor_cost))

    denominator = (2.0 * amt) + fee
    if denominator <= 0.0:
        return 1.0

    be_prob = (fee + labor) / denominator
    return round(max(0.0, min(1.0, be_prob)), 4)

