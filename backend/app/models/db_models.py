"""SQLAlchemy Database Models for Sentin AI.

Defines persistence schemas for sellers, disputes, customers, and audit trails.
"""

from datetime import datetime, timezone
import uuid
from typing import Optional, Dict, Any

from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Seller(Base):
    __tablename__ = "sellers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    paypal_client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    paypal_client_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    disputes: Mapped[list["Dispute"]] = relationship("Dispute", back_populates="seller")

class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    paypal_payer_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dispute_count: Mapped[int] = mapped_column(Integer, default=0)
    total_orders: Mapped[int] = mapped_column(Integer, default=1)
    risk_score: Mapped[float] = mapped_column(Float, default=0.1)  # 0.0 to 1.0
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    disputes: Mapped[list["Dispute"]] = relationship("Dispute", back_populates="customer")

class Dispute(Base):
    __tablename__ = "disputes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    paypal_dispute_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    seller_id: Mapped[str] = mapped_column(String(36), ForeignKey("sellers.id"), nullable=False)
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("customers.id"), nullable=False)
    
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    reason: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="OPEN")
    
    ai_decision: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    ev_breakdown: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    evidence_snapshot: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    auto_executed: Mapped[bool] = mapped_column(Boolean, default=False)
    action_taken: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    seller: Mapped["Seller"] = relationship("Seller", back_populates="disputes")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="disputes")
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog",
        back_populates="dispute",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dispute_id: Mapped[str] = mapped_column(String(36), ForeignKey("disputes.id", ondelete="CASCADE"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    dispute: Mapped["Dispute"] = relationship("Dispute", back_populates="audit_logs")
