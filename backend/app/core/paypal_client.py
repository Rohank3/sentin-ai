"""PayPal Sandbox API Client.

Handles OAuth2 token caching, Customer Disputes API v1, and Payments Captures API v2.
Supports multi-seller credential routing with resilient mock fallback for offline demos.
"""

from typing import Dict, Any, Optional
import httpx
import base64
import time
from app.core.config import settings

class PayPalClient:
    def __init__(self):
        self.base_url = settings.paypal_base_url.rstrip("/")
        # Cache structure: seller_id -> {"token": str, "expires_at": float}
        self._token_cache: Dict[str, Dict[str, Any]] = {}

    def _get_credentials(self, seller_client_id: Optional[str] = None, seller_client_secret: Optional[str] = None) -> tuple[Optional[str], Optional[str]]:
        client_id = seller_client_id or settings.paypal_client_id
        client_secret = seller_client_secret or settings.paypal_client_secret
        return client_id, client_secret

    async def get_access_token(
        self,
        seller_id: str = "default",
        seller_client_id: Optional[str] = None,
        seller_client_secret: Optional[str] = None
    ) -> str:
        """Retrieve and cache OAuth2 access token for the given seller or default credentials."""
        now = time.time()
        cached = self._token_cache.get(seller_id)
        if cached and cached["expires_at"] > (now + 60):
            return cached["token"]

        client_id, client_secret = self._get_credentials(seller_client_id, seller_client_secret)
        if not client_id or not client_secret or client_id.startswith("your_"):
            # Return synthetic mock token for offline zero-config demonstration
            return "mock_sandbox_access_token"

        auth_str = f"{client_id}:{client_secret}"
        b64_auth = base64.b64encode(auth_str.encode()).decode()

        headers = {
            "Authorization": f"Basic {b64_auth}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {"grant_type": "client_credentials"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{self.base_url}/v1/oauth2/token", headers=headers, data=data)
            resp.raise_for_status()
            res_json = resp.json()
            access_token = res_json["access_token"]
            expires_in = res_json.get("expires_in", 3600)

            self._token_cache[seller_id] = {
                "token": access_token,
                "expires_at": now + expires_in
            }
            return access_token

    async def get_dispute(self, dispute_id: str, seller_id: str = "default") -> Dict[str, Any]:
        """Fetch dispute details from PayPal Sandbox Disputes v1."""
        token = await self.get_access_token(seller_id=seller_id)
        if token == "mock_sandbox_access_token":
            return {
                "dispute_id": dispute_id,
                "status": "UNDER_REVIEW",
                "dispute_amount": {"value": "149.99", "currency_code": "USD"},
                "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
                "dispute_lifecycle_stage": "CHARGEBACK",
                "simulated": True
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/v1/customer/disputes/{dispute_id}", headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def provide_evidence(
        self,
        dispute_id: str,
        carrier: str,
        tracking_number: str,
        notes: str,
        evidence_type: str = "PROOF_OF_FULFILLMENT",
        seller_id: str = "default"
    ) -> Dict[str, Any]:
        """Submit fulfillment tracking proof to PayPal Disputes v1."""
        token = await self.get_access_token(seller_id=seller_id)
        if token == "mock_sandbox_access_token":
            return {
                "status": "SUCCESS",
                "dispute_id": dispute_id,
                "evidence_type": evidence_type,
                "acknowledged": True,
                "simulated": True
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {
            "evidences": [
                {
                    "evidence_type": evidence_type,
                    "evidence_info": {
                        "tracking_info": [
                            {
                                "carrier_name": carrier,
                                "tracking_number": tracking_number
                            }
                        ]
                    },
                    "notes": notes
                }
            ]
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/v1/customer/disputes/{dispute_id}/provide-evidence",
                headers=headers,
                json=payload
            )
            resp.raise_for_status()
            return resp.json() if resp.content else {"status": "SUCCESS"}

    async def accept_claim(self, dispute_id: str, notes: str, seller_id: str = "default") -> Dict[str, Any]:
        """Accept dispute claim and issue refund to buyer via PayPal Disputes v1."""
        token = await self.get_access_token(seller_id=seller_id)
        if token == "mock_sandbox_access_token":
            return {
                "status": "ACCEPTED",
                "dispute_id": dispute_id,
                "notes": notes,
                "simulated": True
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {"note": notes}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/v1/customer/disputes/{dispute_id}/accept-claim",
                headers=headers,
                json=payload
            )
            resp.raise_for_status()
            return resp.json() if resp.content else {"status": "ACCEPTED"}

    async def create_refund(
        self,
        capture_id: str,
        amount: float,
        currency: str = "USD",
        note: str = "Resolved via AI Dispute Management",
        seller_id: str = "default"
    ) -> Dict[str, Any]:
        """Issue refund against payment capture using PayPal Payments v2 API."""
        token = await self.get_access_token(seller_id=seller_id)
        if token == "mock_sandbox_access_token":
            return {
                "id": f"REFUND-{capture_id}",
                "status": "COMPLETED",
                "amount": {"value": f"{amount:.2f}", "currency_code": currency},
                "simulated": True
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {
            "amount": {
                "value": f"{amount:.2f}",
                "currency_code": currency
            },
            "note_to_payer": note
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/v2/payments/captures/{capture_id}/refund",
                headers=headers,
                json=payload
            )
            resp.raise_for_status()
            return resp.json()

paypal_client = PayPalClient()
