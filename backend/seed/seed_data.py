"""Database & Local Fallback Seed Loader.

Provides pre-validated seed fixtures for carrier tracking, merchant policies,
buyer profiles, and marketplace sellers.
"""

import json
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
    """Populate database with default seed entities if empty.

    Args:
        session: SQLAlchemy AsyncSession instance.

    Returns:
        Dictionary reporting count of seeded sellers and customers.
    """
    from sqlalchemy import select, func
    from app.models.db_models import Seller, Customer

    stats = {"sellers": 0, "customers": 0}
    try:
        seller_count = await session.scalar(select(func.count(Seller.id)))
        if seller_count == 0:
            for s_data in get_seed_sellers():
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
