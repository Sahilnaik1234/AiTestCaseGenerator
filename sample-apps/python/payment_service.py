"""
payment_service.py – processes payments, refunds, and fraud detection.
"""

import re
from decimal import Decimal

CARD_PATTERN = re.compile(r'^\d{16}$')

# ── Covered by tests ──────────────────────────────────────────────────────────

def format_currency(amount: Decimal, currency: str = "USD") -> str:
    """Returns a formatted currency string."""
    return f"{currency} {amount:.2f}"


def is_valid_card_number(card_number: str) -> bool:
    """Luhn-lite check – covered in tests."""
    if not card_number:
        return False
    return bool(CARD_PATTERN.match(card_number))


# ── NOT covered by tests (gaps) ────────────────────────────────────────────────

def process_payment(user_id: int, amount: Decimal, card_number: str) -> dict:
    """Processes a payment – NOT tested."""
    if user_id <= 0:
        raise ValueError("Invalid user_id")
    if amount <= 0:
        raise ValueError("Amount must be positive")
    if not is_valid_card_number(card_number):
        raise ValueError("Invalid card number")
    # Simulated gateway call
    return {"status": "success", "transaction_id": "txn_abc123"}


def refund_payment(transaction_id: str, amount: Decimal) -> dict:
    """Refunds a transaction – NOT tested."""
    if not transaction_id:
        raise ValueError("transaction_id is required")
    if amount <= 0:
        raise ValueError("Refund amount must be positive")
    return {"status": "refunded", "transaction_id": transaction_id}


def detect_fraud(user_id: int, amount: Decimal, country_code: str) -> bool:
    """Simple fraud flag – NOT tested."""
    high_risk_countries = {"XX", "YY", "ZZ"}
    if country_code in high_risk_countries and amount > Decimal("500"):
        return True
    return False
