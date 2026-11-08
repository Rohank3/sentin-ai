"""Database & Local Fallback Seed Loader.

Provides pre-validated seed fixtures for carrier tracking, merchant policies,
buyer profiles, and marketplace sellers.
"""

import json
import uuid
from pathlib import Path
from typing import List, Dict, Any

SEED_DIR = Path(__file__).parent

def load_json_fixture(filename: str) -> List[Dict[str, Any]]:
    """Load and parse a JSON seed fixture file from the seed directory.

    Args:
        filename: Name of the JSON fixture file.

    Returns:
        List of parsed dictionary records.

    Raises:
        FileNotFoundError: If the specified fixture file does not exist.
    """
    file_path = SEED_DIR / filename
    if not file_path.exists():
        raise FileNotFoundError(f"Required seed fixture not found: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_seed_policies() -> List[Dict[str, Any]]:
    """Retrieve default merchant dispute and return policy fixtures."""
    return load_json_fixture("policies.json")

def get_seed_carriers() -> List[Dict[str, Any]]:
    """Retrieve proof-of-delivery (PoD) carrier tracking fixtures."""
    return load_json_fixture("carriers.json")

def get_seed_customers() -> List[Dict[str, Any]]:
    """Retrieve buyer risk history and reputation profile fixtures."""
    return load_json_fixture("customers.json")

def get_seed_sellers() -> List[Dict[str, Any]]:
    """Retrieve merchant seller account fixtures."""
    return load_json_fixture("sellers.json")

async def seed_database(session: Any) -> Dict[str, int]:
    """Populate database with default seed entities idempotently.

    Checks seller, customer, and dispute fixtures independently using stable primary keys,
    inserting only records that are currently missing.

    Args:
        session: SQLAlchemy AsyncSession instance.

    Returns:
        Dictionary reporting count of newly seeded sellers, customers, and disputes.
    """
    from app.models.db_models import Seller, Customer, Dispute, AuditLog
    from app.api.routes_disputes import SEED_DISPUTES

    stats = {"sellers": 0, "customers": 0, "disputes": 0}
    try:
        for s_data in get_seed_sellers():
            existing_seller = await session.get(Seller, s_data["id"])
            if not existing_seller:
                seller = Seller(
                    id=s_data["id"],
                    name=s_data["name"],
                    email=s_data["email"],
                    paypal_client_id=s_data.get("paypal_client_id"),
                    paypal_client_secret=s_data.get("paypal_client_secret"),
                )
                session.add(seller)
                stats["sellers"] += 1

        for c_data in get_seed_customers():
            existing_customer = await session.get(Customer, c_data["id"])
            if not existing_customer:
                customer = Customer(
                    id=c_data["id"],
                    email=c_data["email"],
                    full_name=c_data.get("full_name", "Verified Buyer"),
                    paypal_payer_id=c_data.get("paypal_payer_id"),
                    total_spend=c_data.get("total_spend", 0.0),
                    total_orders=c_data.get("total_orders", 0),
                    dispute_count=c_data.get("dispute_count", 0),
                    risk_score=c_data.get("risk_score", 0.1),
                )
                session.add(customer)
                stats["customers"] += 1

        # Flush sellers and customers so foreign keys are satisfied
        await session.flush()

        for d_id, d_data in SEED_DISPUTES.items():
            existing_dispute = await session.get(Dispute, d_id)
            if not existing_dispute:
                dispute = Dispute(
                    id=d_data["id"],
                    paypal_dispute_id=d_data["paypal_dispute_id"],
                    seller_id=d_data["seller_id"],
                    customer_id=d_data["customer_id"],
                    amount=d_data["amount"],
                    currency=d_data.get("currency", "USD"),
                    reason=d_data["reason"],
                    status=d_data.get("status", "OPEN"),
                    ai_decision=d_data.get("ai_decision"),
                    ev_breakdown=d_data.get("ev_breakdown"),
                    evidence_snapshot=d_data.get("evidence"),
                    auto_executed=d_data.get("auto_executed", False),
                    action_taken=d_data.get("action_taken"),
                    created_at=d_data.get("created_at"),
                    updated_at=d_data.get("updated_at"),
                )
                session.add(dispute)
                for log_item in d_data.get("audit_log", []):
                    audit = AuditLog(
                        id=str(uuid.uuid4()),
                        dispute_id=d_data["id"],
                        action=log_item["action"],
                        details=log_item["details"],
                        timestamp=log_item.get("timestamp"),
                    )
                    session.add(audit)
                stats["disputes"] += 1

        if any(v > 0 for v in stats.values()):
            await session.commit()
    except Exception:
        await session.rollback()
        raise
    return stats

if __name__ == "__main__":
    policies = get_seed_policies()
    carriers = get_seed_carriers()
    customers = get_seed_customers()
    sellers = get_seed_sellers()
    print(
        f"[Seed] Successfully validated {len(policies)} policies, "
        f"{len(carriers)} carrier records, {len(customers)} customer profiles, "
        f"and {len(sellers)} seller accounts."
    )
