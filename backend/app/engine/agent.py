"""Core AI Claims Evaluator & Decision Agent.

Integrates Google Gemini 2.0 Flash with native Pydantic schema enforcement to evaluate
disputes, retrieve context via RAG, evaluate EV, and determine autonomous execution.
"""

from typing import Dict, Any, Optional
import json
from app.core.config import settings
from app.models.schemas import AIDecision
from app.engine.ev_calculator import calculate_ev

class ClaimsAgent:
    def __init__(self):
        self.client = None
        self._init_gemini()

    def _init_gemini(self) -> None:
        """Initialize Google GenAI client if API key is present."""
        if settings.gemini_api_key and settings.gemini_api_key != "your_gemini_api_key_here":
            try:
                from google import genai
                self.client = genai.Client(api_key=settings.gemini_api_key)
                print("[ClaimsAgent] Google Gemini client initialized.")
            except Exception as e:
                print(f"[ClaimsAgent] Warning: Failed to initialize Google GenAI: {e}")
                self.client = None
        else:
            self.client = None

    async def evaluate_dispute(
        self,
        dispute_id: str,
        amount: float,
        reason: str,
        currency: str,
        policies: list[str],
        pod_records: list[Dict[str, Any]],
        customer_history: Dict[str, Any]
    ) -> AIDecision:
        """Evaluate a dispute case using Gemini 2.0 Flash structured outputs with reliable heuristic fallback."""

        # First compute baseline heuristic win probability from hard evidence
        has_delivered_pod = any(
            pod.get("status") == "DELIVERED" and pod.get("signature_confirmed", False)
            for pod in pod_records
        )
        is_repeat_disputer = customer_history.get("risk_score", 0.0) > 0.50

        # Attempt LLM reasoning if client is available
        if self.client:
            try:
                prompt = f"""You are an expert PayPal Dispute and Merchant Risk Arbitrator.
Evaluate this dispute claim and make a mathematically rigorous decision.

Dispute Case:
- PayPal Dispute ID: {dispute_id}
- Amount: {amount} {currency}
- Claim Reason: {reason}

Merchant Policies:
{chr(10).join(f"- {p}" for p in policies)}

Carrier Proof of Delivery (PoD):
{json.dumps(pod_records, indent=2)}

Buyer History & Risk Profile:
{json.dumps(customer_history, indent=2)}

Determine:
1. Recommended Action: CONTEST (if strong evidence), SETTLE (if partial refund or concession is better), or REFUND (if claim is justified).
2. Win Probability: 0.0 to 1.0 likelihood of prevailing in PayPal arbitration.
3. Auto Execute: true if claim is standard, evidence is conclusive, and amount < {settings.max_auto_execute_amount}.
4. Detailed reasoning citing the evidence and policies.
5. Key confidence factors.
"""

                response = self.client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": AIDecision,
                    }
                )

                if response.parsed:
                    decision: AIDecision = response.parsed
                    # Recompute EV with strict math
                    ev_res = calculate_ev(amount=amount, win_probability=decision.win_probability)
                    decision.expected_value = ev_res.expected_value_contest if decision.recommended_action == "CONTEST" else ev_res.expected_value_settle
                    return decision
            except Exception as e:
                print(f"[ClaimsAgent] Gemini evaluation error, falling back to heuristic engine: {e}")

        # Deterministic Rule-Based Fallback Engine (Guarantees 100% demo uptime)
        if reason in ["ITEM_NOT_RECEIVED", "MERCHANDISE_OR_SERVICE_NOT_RECEIVED"]:
            if has_delivered_pod:
                win_prob = 0.92
                rec_action = "CONTEST"
                confidence = [
                    "Carrier tracking confirms successful delivery with signature",
                    "Meets PayPal Seller Protection policy criteria",
                    "Customer flagged for repeat claim activity" if is_repeat_disputer else "Delivery completed within estimated arrival window"
                ]
                reasoning = (
                    f"Strong Proof of Fulfillment established. Carrier records show delivery was completed. "
                    f"Under merchant terms and PayPal Seller Protection, evidence is conclusive to contest."
                )
            else:
                win_prob = 0.25
                rec_action = "REFUND"
                confidence = [
                    "No verifiable carrier delivery confirmation on file",
                    "Dispute fee avoidance prioritized over uncertain contestation"
                ]
                reasoning = (
                    "Carrier tracking lacks conclusive delivery confirmation. Contesting incurs "
                    "dispute fee risk with low probability of arbitration win."
                )
        elif reason in ["SIGNIFICANTLY_NOT_AS_DESCRIBED", "DAMAGED_OR_DEFECTIVE"]:
            if amount < 30.00:
                win_prob = 0.40
                rec_action = "SETTLE"
                confidence = [
                    "Low transaction value allows immediate concession",
                    "Customer lifetime value preserved",
                    "Avoids return shipping coordination friction"
                ]
                reasoning = (
                    "Item value is low ($" + f"{amount:.2f}" + "). Settling immediately eliminates "
                    "escalation dispute fees and protects merchant dispute ratio."
                )
            else:
                win_prob = 0.75
                rec_action = "CONTEST"
                confidence = [
                    "High value claim requires formal inspection protocol",
                    "Merchant return policy requires RMA within 14 days"
                ]
                reasoning = (
                    f"Item amount (${amount:.2f}) warrants formal contestation requesting buyer to return "
                    "merchandise in accordance with store return policy."
                )
        else:
            win_prob = 0.50
            rec_action = "SETTLE"
            confidence = ["General claim with balanced dispute economics"]
            reasoning = "Unspecified dispute category. Neutral settlement recommended."

        ev_calc = calculate_ev(amount=amount, win_probability=win_prob)
        ev_score = ev_calc.expected_value_contest if rec_action == "CONTEST" else ev_calc.expected_value_settle

        # Evaluate auto_execute autonomy condition
        auto_exec = (
            amount <= settings.max_auto_execute_amount
            and win_prob >= settings.min_auto_execute_win_prob
            and customer_history.get("risk_score", 0.0) <= settings.max_customer_risk_score
        )

        return AIDecision(
            recommended_action=rec_action,
            win_probability=win_prob,
            expected_value=ev_score,
            reasoning=reasoning,
            auto_execute=auto_exec,
            confidence_factors=confidence
        )

claims_agent = ClaimsAgent()
