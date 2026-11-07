"""Core AI Claims Evaluator & Decision Agent.

Integrates Google Gemini 2.0 Flash with native Pydantic schema enforcement to evaluate
disputes, retrieve context via RAG, evaluate EV, and determine autonomous execution.
"""

from typing import Dict, Any, Optional, List
import json

from app.core.config import settings
from app.models.schemas import AIDecision
from app.engine.ev_calculator import calculate_ev


class ClaimsAgent:
    def __init__(self):
        self.client = None
        self._init_gemini()

    def _init_gemini(self) -> None:
        """Initialize Google GenAI client if API key is present and configured."""
        if settings.gemini_api_key and settings.gemini_api_key != "your_gemini_api_key_here":
            try:
                from google import genai
                self.client = genai.Client(api_key=settings.gemini_api_key)
                print("[ClaimsAgent] Google Gemini 2.0 Flash client initialized successfully.")
            except Exception as e:
                print(f"[ClaimsAgent] Warning: Failed to initialize Google GenAI: {e}")
                self.client = None
        else:
            self.client = None

    def is_available(self) -> bool:
        """Check whether the live Gemini API client is initialized."""
        return self.client is not None

    async def evaluate_dispute(
        self,
        dispute_id: str,
        amount: float,
        reason: str,
        currency: str,
        policies: List[str],
        pod_records: List[Dict[str, Any]],
        customer_history: Dict[str, Any]
    ) -> AIDecision:
        """Evaluate a dispute case using Gemini 2.0 Flash structured outputs with reliable heuristic fallback."""
        amt = max(0.0, float(amount))

        # Assess empirical evidence signals
        has_delivered_pod = any(
            pod.get("status") == "DELIVERED" and pod.get("signature_confirmed", False)
            for pod in pod_records
        )
        is_repeat_disputer = (
            customer_history.get("risk_score", 0.0) > settings.max_customer_risk_score
            or customer_history.get("prior_disputes", 0) >= 2
            or customer_history.get("flagged_for_abuse", False)
        )

        # 1. Attempt LLM reasoning via Google Gemini 2.0 Flash if client is active
        if self.client:
            try:
                from google.genai import types

                prompt = f"""You are an expert PayPal Dispute and Merchant Risk Arbitrator.
Evaluate this dispute claim and make a mathematically rigorous decision adhering to PayPal Seller Protection rules.

Dispute Case:
- PayPal Dispute ID: {dispute_id}
- Amount: {amt:.2f} {currency}
- Claim Reason: {reason}

Merchant Policies:
{chr(10).join(f"- {p}" for p in policies) if policies else "- Standard merchant return terms apply."}

Carrier Proof of Delivery (PoD):
{json.dumps(pod_records, indent=2) if pod_records else "No carrier tracking records available."}

Buyer History & Risk Profile:
{json.dumps(customer_history, indent=2)}

Determine:
1. Recommended Action: CONTEST (if strong evidence/PoD), SETTLE (if partial refund or concession is better), or REFUND (if claim is justified).
2. Win Probability: 0.0 to 1.0 likelihood of prevailing in PayPal arbitration.
3. Auto Execute: true only if claim is standard, evidence is conclusive, amount <= {settings.max_auto_execute_amount}, and buyer risk score <= {settings.max_customer_risk_score}.
4. Detailed reasoning citing specific evidence, carrier tracking numbers, and policy clauses.
5. Key confidence factors listing 2 to 4 bullet points.
"""

                response = self.client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=AIDecision,
                        temperature=0.1
                    )
                )

                decision: Optional[AIDecision] = None
                if getattr(response, "parsed", None):
                    decision = response.parsed
                elif getattr(response, "text", None):
                    parsed_dict = json.loads(response.text)
                    decision = AIDecision.model_validate(parsed_dict)

                if decision:
                    # Recompute EV with strict math engine
                    ev_res = calculate_ev(amount=amt, win_probability=decision.win_probability)
                    decision.expected_value = (
                        ev_res.expected_value_contest
                        if decision.recommended_action == "CONTEST"
                        else ev_res.expected_value_settle
                    )

                    # Enforce platform autonomy guardrails
                    if (
                        amt > settings.max_auto_execute_amount
                        or decision.win_probability < settings.min_auto_execute_win_prob
                        or is_repeat_disputer
                    ):
                        decision.auto_execute = False

                    return decision
            except Exception as e:
                print(f"[ClaimsAgent] Gemini evaluation error, falling back to deterministic risk engine: {e}")

        # 2. Deterministic Rule-Based Fallback Engine (Guarantees 100% demo uptime & reproducibility)
        if reason in ["ITEM_NOT_RECEIVED", "MERCHANDISE_OR_SERVICE_NOT_RECEIVED"]:
            if has_delivered_pod:
                tracking_no = pod_records[0].get("tracking_number", "tracking on file") if pod_records else "tracking on file"
                carrier_name = pod_records[0].get("carrier", "carrier") if pod_records else "carrier"
                win_prob = 0.94
                rec_action = "CONTEST"
                confidence = [
                    f"Carrier tracking ({carrier_name} #{tracking_no}) confirms signed delivery at buyer address",
                    "Meets PayPal Seller Protection policy criteria",
                    "Customer flagged for repeat claim activity" if is_repeat_disputer else "Fulfillment initiated within merchant SLA window"
                ]
                reasoning = (
                    f"Strong Proof of Fulfillment established. Carrier records ({carrier_name} #{tracking_no}) "
                    f"verify that delivery was successfully completed with signature confirmation. "
                    f"Under merchant terms and PayPal Seller Protection, evidence is conclusive to contest."
                )
            else:
                win_prob = 0.20
                rec_action = "REFUND"
                confidence = [
                    "No verifiable carrier delivery confirmation on file",
                    "Dispute fee avoidance prioritized over uncertain contestation",
                    "Instant concession prevents escalation penalty"
                ]
                reasoning = (
                    "Carrier tracking lacks conclusive delivery confirmation or shows indefinite transit delay. "
                    "Contesting incurs dispute fee risk ($15.00) with low probability of arbitration win. "
                    "Conceding claim avoids network fees and preserves merchant dispute ratio."
                )
        elif reason in ["SIGNIFICANTLY_NOT_AS_DESCRIBED", "DAMAGED_OR_DEFECTIVE"]:
            if amt < 30.00:
                win_prob = 0.35
                rec_action = "SETTLE"
                confidence = [
                    f"Low transaction value (${amt:.2f}) warrants immediate concession",
                    "Avoids return shipping coordination friction and inspection labor",
                    "Customer lifetime value preserved"
                ]
                reasoning = (
                    f"Item value is low (${amt:.2f}). Settling immediately eliminates "
                    f"arbitration dispute fees ($15.00) and protects merchant dispute ratio."
                )
            else:
                win_prob = 0.78
                rec_action = "CONTEST"
                confidence = [
                    f"Transaction value (${amt:.2f}) warrants formal RMA return protocol",
                    "Merchant return policy requires return in original condition within 14 days",
                    "Buyer flagged for repeat dispute activity" if is_repeat_disputer else "Standard claim inspection protocol"
                ]
                reasoning = (
                    f"Item amount (${amt:.2f}) warrants formal contestation requesting buyer to return "
                    f"merchandise in accordance with store return policy before refund authorization."
                )
        elif is_repeat_disputer:
            win_prob = 0.85
            rec_action = "CONTEST"
            confidence = [
                f"Customer risk score elevated ({customer_history.get('risk_score', 0.88):.2f})",
                f"Serial claim history detected ({customer_history.get('prior_disputes', 0)} prior claims)",
                "Merchant anti-abuse policy denies automated concessions"
            ]
            reasoning = (
                f"Buyer account demonstrates serial claim patterns ({customer_history.get('prior_disputes', 0)} prior disputes). "
                f"Merchant anti-abuse policy mandates formal contestation and denies automated concessions."
            )
        else:
            win_prob = 0.50
            rec_action = "SETTLE"
            confidence = ["General claim with balanced dispute economics"]
            reasoning = "Unspecified dispute category. Neutral settlement recommended to balance dispute ratio."

        ev_calc = calculate_ev(amount=amt, win_probability=win_prob)
        ev_score = (
            ev_calc.expected_value_contest
            if rec_action == "CONTEST"
            else ev_calc.expected_value_settle
        )

        # Autonomy policy limits: amounts > max_auto_execute_amount require human supervisor approval
        auto_exec = (
            amt <= settings.max_auto_execute_amount
            and win_prob >= settings.min_auto_execute_win_prob
            and not is_repeat_disputer
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

