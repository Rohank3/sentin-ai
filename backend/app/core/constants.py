"""Centralized constant definitions for the application.

Import APP_NAME and other constants from here rather than hardcoding names.
"""

APP_NAME: str = "Sentin AI"
APP_DESCRIPTION: str = "Intelligent PayPal Dispute Resolution & Risk Operations Platform"
APP_VERSION: str = "0.1.0"

# Currency default
DEFAULT_CURRENCY: str = "USD"

# PayPal Dispute Lifecycle Statuses
DISPUTE_STATUS_OPEN: str = "OPEN"
DISPUTE_STATUS_UNDER_REVIEW: str = "UNDER_REVIEW"
DISPUTE_STATUS_WAITING_FOR_BUYER: str = "WAITING_FOR_BUYER_RESPONSE"
DISPUTE_STATUS_WAITING_FOR_SELLER: str = "WAITING_FOR_SELLER_RESPONSE"
DISPUTE_STATUS_RESOLVED: str = "RESOLVED"
DISPUTE_STATUS_CLOSED: str = "CLOSED"

# Resolution Actions
ACTION_CONTEST: str = "CONTEST"
ACTION_SETTLE: str = "SETTLE"
ACTION_REFUND: str = "REFUND"
