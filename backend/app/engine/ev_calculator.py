"""Expected Value (EV) Calculator for Dispute Resolution.

Calculates the mathematically optimal strategy:
- CONTEST: Incur operational/dispute fee risk weighted by probability of victory.
- SETTLE/REFUND: Concede dispute amount but avoid dispute fees & protect seller metrics.
"""

from typing import Literal
from app.models.schemas import EVResult

DEFAULT_DISPUTE_FEE = 15.00  # Standard PayPal dispute fee in USD

def calculate_ev(
    amount: float,
    win_probability: float,
    dispute_fee: float = DEFAULT_DISPUTE_FEE,
    settlement_cost: float = None,
    estimated_labor_cost: float = 5.00
) -> EVResult:
    """Calculate the expected financial value of contesting vs. settling.

    EV(Contest) = WinProb * (Amount) - (1 - WinProb) * (Amount + DisputeFee) - LaborCost
    EV(Settle) = -Amount (or partial settlement cost)

    Args:
        amount: Disputed transaction amount.
        win_probability: Probability of winning contest (0.0 to 1.0).
        dispute_fee: Fixed dispute/chargeback fee charged by payment network on loss.
        settlement_cost: Direct cost if settled immediately (defaults to full refund).
        estimated_labor_cost: Internal evidence collection and review cost.

    Returns:
        EVResult with contest EV, settle EV, optimal action, and net savings.
    """
    if settlement_cost is None:
        settlement_cost = amount

    # Bound probability
    p = max(0.0, min(1.0, win_probability))

    # Contest outcome:
    # If win: keep amount, no dispute fee, pay labor
    # If loss: forfeit amount, pay dispute fee, pay labor
    ev_contest = (p * amount) - ((1.0 - p) * (amount + dispute_fee)) - estimated_labor_cost

    # Settle outcome:
    # Forfeit settlement cost, no dispute fee penalty if resolved early
    ev_settle = -abs(settlement_cost)

    if ev_contest > ev_settle:
        optimal: Literal["CONTEST", "SETTLE", "REFUND"] = "CONTEST"
        savings = round(ev_contest - ev_settle, 2)
    elif ev_settle > ev_contest:
        # If low probability but customer has high value or item has salvage value
        optimal = "SETTLE" if settlement_cost < amount else "REFUND"
        savings = round(ev_settle - ev_contest, 2)
    else:
        optimal = "SETTLE"
        savings = 0.0

    return EVResult(
        expected_value_contest=round(ev_contest, 2),
        expected_value_settle=round(ev_settle, 2),
        optimal_action=optimal,
        savings=savings,
        dispute_fee=dispute_fee,
        cost_to_contest=round(estimated_labor_cost + ((1.0 - p) * dispute_fee), 2)
    )
