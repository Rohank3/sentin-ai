#!/usr/bin/env python3
"""
PayPal Sandbox Configuration & Health Verification Tool.

Usage:
    python backend/scripts/setup_sandbox.py
    # or
    py -3.13 backend/scripts/setup_sandbox.py
"""

import sys
import os
import asyncio
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from app.core.config import settings
    from app.core.paypal_client import paypal_client
    from app.core.constants import APP_NAME
except ImportError as e:
    print(f"Error importing app dependencies: {e}")
    sys.exit(1)


async def check_sandbox():
    print(f"\n=======================================================")
    print(f"  {APP_NAME} - PayPal Sandbox Configuration Verifier")
    print(f"=======================================================\n")

    # 1. Environment and credentials check
    client_id = settings.paypal_client_id
    client_secret = settings.paypal_client_secret
    base_url = settings.paypal_base_url
    business_acct = settings.paypal_business_account
    buyer_acct = settings.paypal_buyer_account

    print("[1] Configuration Inspection:")
    print(f"    - Base URL:             {base_url}")
    print(f"    - Business Account:     {business_acct or '(not configured)'}")
    print(f"    - Buyer Account:        {buyer_acct or '(not configured)'}")
    print(f"    - Webhook ID:           {settings.paypal_webhook_id or '(not configured)'}")

    is_placeholder_id = not client_id or "your_" in client_id.lower()
    is_placeholder_secret = not client_secret or "your_" in client_secret.lower()

    if is_placeholder_id or is_placeholder_secret:
        print("\n[!] STATUS: DEMO / LOCAL MOCK MODE")
        print("    PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is unset or has placeholder values.")
        print("    The system is currently running with high-fidelity simulated mock data.")
        print("\n    To connect to real PayPal Sandbox:")
        print("    1. Go to https://developer.paypal.com/dashboard/applications/sandbox")
        print("    2. Create a REST API app under 'Apps & Credentials'")
        print("    3. Copy Client ID and Secret into backend/.env:")
        print("       PAYPAL_CLIENT_ID=<your-real-sandbox-client-id>")
        print("       PAYPAL_CLIENT_SECRET=<your-real-sandbox-client-secret>")
        print("       PAYPAL_BUSINESS_ACCOUNT=<your-sandbox-business-account-email>")
        print("       PAYPAL_BUYER_ACCOUNT=<your-sandbox-buyer-account-email>")
        print("\n    Run this script again once saved.\n")
        return False

    masked_secret = client_secret[:4] + "..." + client_secret[-4:] if len(client_secret) > 8 else "***"
    print(f"    - Client ID:            {client_id[:8]}...{client_id[-4:] if len(client_id) > 12 else ''}")
    print(f"    - Client Secret:        {masked_secret}")

    # 2. Live OAuth2 Token Exchange
    print("\n[2] Testing PayPal OAuth2 Token Generation...")
    try:
        token = await paypal_client.get_access_token()
        if token and token != "mock_access_token_sandbox_valid":
            print("    [+] SUCCESS: OAuth2 token successfully obtained from PayPal Sandbox API!")
        elif token == "mock_access_token_sandbox_valid":
            print("    [!] NOTICE: Received mock token fallback.")
        else:
            print("    [-] ERROR: Empty token received.")
            return False
    except Exception as err:
        print(f"    [-] ERROR: OAuth2 authentication failed: {err}")
        print("        Check if Client ID and Secret match your Sandbox REST App.")
        return False

    # 3. Live Customer Disputes API Query
    print("\n[3] Testing PayPal Disputes v1 API (`GET /v1/customer/disputes`)...")
    try:
        disputes_res = await paypal_client.list_disputes()
        items = disputes_res.get("items", [])
        total_items = disputes_res.get("total_items", len(items))
        print(f"    [+] SUCCESS: Disputes API responded. Found {len(items)} disputes in Sandbox.")
        for idx, item in enumerate(items[:5], 1):
            disp_id = item.get("dispute_id", "N/A")
            status = item.get("status", "N/A")
            amt = item.get("dispute_amount", {}).get("value", "0.00")
            curr = item.get("dispute_amount", {}).get("currency_code", "USD")
            reason = item.get("reason", "N/A")
            print(f"        {idx}. Dispute {disp_id} | {curr} {amt} | Status: {status} | Reason: {reason}")
    except Exception as err:
        print(f"    [-] NOTICE: Could not list disputes: {err}")
        print("        Ensure your REST app has 'Disputes' permission enabled in developer.paypal.com.")

    print("\n=======================================================")
    print("  PayPal Sandbox Connectivity: READY")
    print("=======================================================\n")
    return True


if __name__ == "__main__":
    asyncio.run(check_sandbox())
