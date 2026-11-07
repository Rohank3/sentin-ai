"""Comprehensive Unit & Integration Test Suite for AI Engine & RAG Specialist.

Tests:
1. EV Calculator mathematical precision, break-even probabilities, and edge cases.
2. Hybrid RAG Store embedding vectors, cosine similarity, policy search, PoD retrieval, and buyer history.
3. Claims Agent structured decision making, schema conformity, autonomy limits, and fallback heuristics.
"""

import unittest
import numpy as np
from unittest.mock import MagicMock, patch

from app.models.schemas import AIDecision, EVResult
from app.engine.ev_calculator import calculate_ev, break_even_probability
from app.engine.rag_store import RAGStore, generate_embedding, VECTOR_DIM
from app.engine.agent import ClaimsAgent


class TestEVCalculator(unittest.TestCase):
    """Test mathematical accuracy of Expected Value calculation."""

    def test_ev_contest_formula_exact(self):
        """Verify EV(Contest) = p * A - (1 - p) * (A + F) - L."""
        amount = 100.00
        p = 0.80
        fee = 15.00
        labor = 5.00

        # Expected: 0.80 * 100 - 0.20 * 115 - 5 = 80 - 23 - 5 = 52.00
        res = calculate_ev(amount=amount, win_probability=p, dispute_fee=fee, estimated_labor_cost=labor)
        self.assertEqual(res.expected_value_contest, 52.00)
        self.assertEqual(res.expected_value_settle, -100.00)
        self.assertEqual(res.optimal_action, "CONTEST")
        self.assertEqual(res.savings, 152.00)
        self.assertEqual(res.dispute_fee, 15.00)
        self.assertEqual(res.cost_to_contest, 8.00)  # 5 + (0.2 * 15) = 8.00

    def test_ev_refund_optimal_when_low_probability(self):
        """When win probability is low, conceding avoids dispute fees."""
        amount = 25.00
        p = 0.10
        fee = 15.00
        labor = 5.00

        # EV(Contest) = 0.10 * 25 - 0.90 * 40 - 5 = 2.5 - 36 - 5 = -38.50
        # EV(Settle) = -25.00
        res = calculate_ev(amount=amount, win_probability=p, dispute_fee=fee, estimated_labor_cost=labor)
        self.assertEqual(res.expected_value_contest, -38.50)
        self.assertEqual(res.expected_value_settle, -25.00)
        self.assertEqual(res.optimal_action, "REFUND")
        self.assertEqual(res.savings, 13.50)  # -25 - (-38.50) = 13.50

    def test_ev_partial_settlement(self):
        """Test partial settlement concession (e.g. 50% concession for minor defect)."""
        amount = 100.00
        settlement_cost = 40.00
        p = 0.20
        res = calculate_ev(amount=amount, win_probability=p, settlement_cost=settlement_cost)
        self.assertEqual(res.expected_value_settle, -40.00)
        self.assertEqual(res.optimal_action, "SETTLE")

    def test_ev_probability_clamping(self):
        """Probabilities outside [0.0, 1.0] must be clamped."""
        res_high = calculate_ev(amount=50.00, win_probability=1.5)
        res_one = calculate_ev(amount=50.00, win_probability=1.0)
        self.assertEqual(res_high.expected_value_contest, res_one.expected_value_contest)

        res_low = calculate_ev(amount=50.00, win_probability=-0.5)
        res_zero = calculate_ev(amount=50.00, win_probability=0.0)
        self.assertEqual(res_low.expected_value_contest, res_zero.expected_value_contest)

    def test_ev_zero_amount(self):
        """Zero amount should be handled gracefully without division by zero."""
        res = calculate_ev(amount=0.00, win_probability=0.5)
        self.assertIsInstance(res, EVResult)
        self.assertEqual(res.expected_value_settle, 0.0)

    def test_break_even_probability(self):
        """Verify break-even probability calculation p* = (F + L) / (2A + F)."""
        amount = 100.00
        fee = 15.00
        labor = 5.00
        # p* = (15 + 5) / (200 + 15) = 20 / 215 = 0.09302...
        be = break_even_probability(amount=amount, dispute_fee=fee, estimated_labor_cost=labor)
        self.assertAlmostEqual(be, 0.0930, places=3)

        # At p*, EV(Contest) should be approximately equal to EV(Settle)
        ev = calculate_ev(amount=amount, win_probability=be, dispute_fee=fee, estimated_labor_cost=labor)
        self.assertAlmostEqual(ev.expected_value_contest, ev.expected_value_settle, delta=0.50)

    def test_break_even_zero_amount(self):
        """When amount is zero and fee is zero, return 1.0."""
        be = break_even_probability(amount=0.0, dispute_fee=0.0, estimated_labor_cost=0.0)
        self.assertEqual(be, 1.0)


class TestRAGStore(unittest.IsolatedAsyncioTestCase):
    """Test dense vector embedding and hybrid retrieval functionality."""

    def test_generate_embedding_properties(self):
        """Generated embeddings must have correct dimension and unit L2 norm."""
        text = "Orders confirmed delivered by carrier tracking"
        vec = generate_embedding(text)

        self.assertEqual(vec.shape, (VECTOR_DIM,))
        self.assertEqual(vec.dtype, np.float32)
        norm = np.linalg.norm(vec)
        self.assertAlmostEqual(norm, 1.0, places=5)

    def test_generate_embedding_empty_text(self):
        """Empty text must produce a zero vector without error."""
        vec = generate_embedding("")
        self.assertEqual(vec.shape, (VECTOR_DIM,))
        self.assertEqual(np.linalg.norm(vec), 0.0)

    def test_vector_similarity_semantic_relevance(self):
        """Semantically related texts should have higher cosine similarity than unrelated texts."""
        v_anchor = generate_embedding("Item Not Received carrier delivery tracking")
        v_similar = generate_embedding("Proof of fulfillment tracking shows delivered with signature")
        v_unrelated = generate_embedding("Weather alert sorting facility canceled payment invoice")

        sim_related = float(np.dot(v_anchor, v_similar))
        sim_unrelated = float(np.dot(v_anchor, v_unrelated))
        self.assertGreater(sim_related, sim_unrelated)

    async def test_search_policies_local_fallback(self):
        """Policy search must return relevant policies from seed fixtures."""
        store = RAGStore()
        # Force offline fallback for test determinism
        store.elastic_client = None

        results = await store.search_policies("ITEM_NOT_RECEIVED delivery proof")
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)
        self.assertTrue(any("delivery" in p.lower() or "received" in p.lower() for p in results))

    async def test_search_policies_seller_filter(self):
        """Policy search should respect seller_id filtering."""
        store = RAGStore()
        store.elastic_client = None

        results = await store.search_policies("SNAD defective return", seller_id="seller_acme")
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)

    async def test_get_pod_evidence_match(self):
        """Should retrieve PoD record by exact tracking number."""
        store = RAGStore()
        store.elastic_client = None

        records = await store.get_pod_evidence(tracking_number="1Z999AA10123456784")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["carrier"], "UPS")
        self.assertEqual(records[0]["status"], "DELIVERED")
        self.assertTrue(records[0]["signature_confirmed"])

    async def test_get_customer_history_fixture_match(self):
        """Should retrieve real buyer profile from customers.json fixture."""
        store = RAGStore()
        profile = await store.get_customer_history("repeat.claimant@example.com")
        self.assertEqual(profile["customer_email"], "repeat.claimant@example.com")
        self.assertEqual(profile["prior_disputes"], 3)
        self.assertTrue(profile["flagged_for_abuse"])

    async def test_get_customer_history_clean_buyer(self):
        """Should retrieve clean buyer profile for low-risk user."""
        store = RAGStore()
        profile = await store.get_customer_history("johndoe.shopper@example.com")
        self.assertEqual(profile["customer_email"], "johndoe.shopper@example.com")
        self.assertEqual(profile["prior_disputes"], 0)
        self.assertFalse(profile["flagged_for_abuse"])


class TestClaimsAgent(unittest.IsolatedAsyncioTestCase):
    """Test Claims Decision Agent evaluation across dispute scenarios."""

    async def test_inr_with_delivered_pod_contests(self):
        """INR claim with valid carrier signature must recommend CONTEST."""
        agent = ClaimsAgent()
        agent.client = None  # Test heuristic engine

        pod = [{
            "carrier": "UPS",
            "tracking_number": "1Z999AA10123456784",
            "status": "DELIVERED",
            "signature_confirmed": True
        }]
        cust = {"risk_score": 0.05, "prior_disputes": 0, "flagged_for_abuse": False}
        policies = ["Orders confirmed delivered are protected under Seller Protection."]

        decision = await agent.evaluate_dispute(
            dispute_id="PP-TEST-01",
            amount=85.00,
            reason="ITEM_NOT_RECEIVED",
            currency="USD",
            policies=policies,
            pod_records=pod,
            customer_history=cust
        )

        self.assertIsInstance(decision, AIDecision)
        self.assertEqual(decision.recommended_action, "CONTEST")
        self.assertGreaterEqual(decision.win_probability, 0.90)
        self.assertTrue(decision.auto_execute)  # Under $100 threshold
        self.assertGreater(len(decision.confidence_factors), 1)

    async def test_inr_exceeding_auto_execute_ceiling(self):
        """Dispute amount > $100 must require human supervisor execution."""
        agent = ClaimsAgent()
        agent.client = None

        pod = [{
            "carrier": "UPS",
            "tracking_number": "1Z999AA10123456784",
            "status": "DELIVERED",
            "signature_confirmed": True
        }]
        cust = {"risk_score": 0.05, "prior_disputes": 0, "flagged_for_abuse": False}

        decision = await agent.evaluate_dispute(
            dispute_id="PP-TEST-02",
            amount=250.00,  # Exceeds max_auto_execute_amount
            reason="ITEM_NOT_RECEIVED",
            currency="USD",
            policies=[],
            pod_records=pod,
            customer_history=cust
        )

        self.assertEqual(decision.recommended_action, "CONTEST")
        self.assertFalse(decision.auto_execute)  # Supervisor sign-off required

    async def test_inr_without_pod_refunds(self):
        """INR claim lacking delivery confirmation should recommend REFUND."""
        agent = ClaimsAgent()
        agent.client = None

        cust = {"risk_score": 0.05, "prior_disputes": 0, "flagged_for_abuse": False}

        decision = await agent.evaluate_dispute(
            dispute_id="PP-TEST-03",
            amount=35.00,
            reason="ITEM_NOT_RECEIVED",
            currency="USD",
            policies=[],
            pod_records=[],
            customer_history=cust
        )

        self.assertEqual(decision.recommended_action, "REFUND")
        self.assertLessEqual(decision.win_probability, 0.30)

    async def test_snad_minor_settles(self):
        """Low-value SNAD claim (< $30) should recommend instant SETTLE."""
        agent = ClaimsAgent()
        agent.client = None

        cust = {"risk_score": 0.05, "prior_disputes": 0, "flagged_for_abuse": False}

        decision = await agent.evaluate_dispute(
            dispute_id="PP-TEST-04",
            amount=19.99,
            reason="SIGNIFICANTLY_NOT_AS_DESCRIBED",
            currency="USD",
            policies=[],
            pod_records=[],
            customer_history=cust
        )

        self.assertEqual(decision.recommended_action, "SETTLE")

    async def test_repeat_disputer_blocks_auto_execute(self):
        """Repeat claimants must never be auto-executed."""
        agent = ClaimsAgent()
        agent.client = None

        cust = {"risk_score": 0.88, "prior_disputes": 3, "flagged_for_abuse": True}

        decision = await agent.evaluate_dispute(
            dispute_id="PP-TEST-05",
            amount=45.00,
            reason="SIGNIFICANTLY_NOT_AS_DESCRIBED",
            currency="USD",
            policies=[],
            pod_records=[],
            customer_history=cust
        )

        self.assertEqual(decision.recommended_action, "CONTEST")
        self.assertFalse(decision.auto_execute)

    async def test_mocked_gemini_client_structured_output(self):
        """Mock Gemini 2.0 Flash generate_content call to verify SDK response parsing."""
        agent = ClaimsAgent()
        mock_client = MagicMock()
        mock_response = MagicMock()

        expected_llm_decision = AIDecision(
            recommended_action="CONTEST",
            win_probability=0.91,
            expected_value=72.50,
            reasoning="Carrier confirms delivery with recipient signature.",
            auto_execute=True,
            confidence_factors=["Signature on delivery", "Policy compliance"]
        )
        mock_response.parsed = expected_llm_decision
        mock_response.text = None
        mock_client.models.generate_content.return_value = mock_response
        agent.client = mock_client

        decision = await agent.evaluate_dispute(
            dispute_id="PP-MOCK-01",
            amount=80.00,
            reason="ITEM_NOT_RECEIVED",
            currency="USD",
            policies=["Policy terms"],
            pod_records=[{"status": "DELIVERED", "signature_confirmed": True}],
            customer_history={"risk_score": 0.05}
        )

        self.assertEqual(decision.recommended_action, "CONTEST")
        self.assertEqual(decision.win_probability, 0.91)
        # Verify EV was recomputed strictly with calculate_ev
        ev_expected = calculate_ev(amount=80.00, win_probability=0.91)
        self.assertEqual(decision.expected_value, ev_expected.expected_value_contest)


if __name__ == "__main__":
    unittest.main()
