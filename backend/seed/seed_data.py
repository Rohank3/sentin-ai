"""Database & Local Fallback Seed Loader.

Provides pre-validated seed fixtures for carrier tracking, merchant policies,
and buyer profiles.
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

if __name__ == "__main__":
    policies = get_seed_policies()
    carriers = get_seed_carriers()
    customers = get_seed_customers()
    print(f"[Seed] Successfully validated {len(policies)} policies, {len(carriers)} carrier records, {len(customers)} customer profiles.")
