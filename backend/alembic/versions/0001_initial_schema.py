"""Initial schema migration: sellers, customers, disputes, audit_logs.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-10-25 23:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Create initial tables for sellers, customers, disputes, and audit logs."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # 1. Sellers table
    if 'sellers' not in existing_tables:
        op.create_table(
            'sellers',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('paypal_client_id', sa.String(length=255), nullable=True),
            sa.Column('paypal_client_secret', sa.String(length=255), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('email')
        )

    # 2. Customers table
    if 'customers' not in existing_tables:
        op.create_table(
            'customers',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('paypal_payer_id', sa.String(length=100), nullable=True),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('full_name', sa.String(length=255), nullable=False, server_default='Verified Buyer'),
            sa.Column('total_spend', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('total_orders', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('dispute_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('risk_score', sa.Float(), nullable=False, server_default='0.1'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('email')
        )
        op.create_index(op.f('ix_customers_paypal_payer_id'), 'customers', ['paypal_payer_id'], unique=True)
    else:
        existing_indices = [idx['name'] for idx in inspector.get_indexes('customers')]
        if 'ix_customers_paypal_payer_id' not in existing_indices:
            op.create_index(op.f('ix_customers_paypal_payer_id'), 'customers', ['paypal_payer_id'], unique=True)

    # 3. Disputes table
    if 'disputes' not in existing_tables:
        op.create_table(
            'disputes',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('paypal_dispute_id', sa.String(length=100), nullable=False),
            sa.Column('seller_id', sa.String(length=36), nullable=False),
            sa.Column('customer_id', sa.String(length=36), nullable=False),
            sa.Column('amount', sa.Float(), nullable=False),
            sa.Column('currency', sa.String(length=10), nullable=False),
            sa.Column('reason', sa.String(length=100), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=False),
            sa.Column('ai_decision', sa.JSON(), nullable=True),
            sa.Column('ev_breakdown', sa.JSON(), nullable=True),
            sa.Column('evidence_snapshot', sa.JSON(), nullable=True),
            sa.Column('auto_executed', sa.Boolean(), nullable=False),
            sa.Column('action_taken', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
            sa.ForeignKeyConstraint(['seller_id'], ['sellers.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_disputes_paypal_dispute_id'), 'disputes', ['paypal_dispute_id'], unique=True)
    else:
        existing_indices = [idx['name'] for idx in inspector.get_indexes('disputes')]
        if 'ix_disputes_paypal_dispute_id' not in existing_indices:
            op.create_index(op.f('ix_disputes_paypal_dispute_id'), 'disputes', ['paypal_dispute_id'], unique=True)

    # 4. Audit logs table
    if 'audit_logs' not in existing_tables:
        op.create_table(
            'audit_logs',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('dispute_id', sa.String(length=36), nullable=False),
            sa.Column('action', sa.String(length=100), nullable=False),
            sa.Column('details', sa.Text(), nullable=False),
            sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['dispute_id'], ['disputes.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

def downgrade() -> None:
    """Drop initial tables in reverse dependency order."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'audit_logs' in existing_tables:
        op.drop_table('audit_logs')
    if 'disputes' in existing_tables:
        existing_indices = [idx['name'] for idx in inspector.get_indexes('disputes')]
        if 'ix_disputes_paypal_dispute_id' in existing_indices:
            op.drop_index(op.f('ix_disputes_paypal_dispute_id'), table_name='disputes')
        op.drop_table('disputes')
    if 'customers' in existing_tables:
        existing_indices = [idx['name'] for idx in inspector.get_indexes('customers')]
        if 'ix_customers_paypal_payer_id' in existing_indices:
            op.drop_index(op.f('ix_customers_paypal_payer_id'), table_name='customers')
        op.drop_table('customers')
    if 'sellers' in existing_tables:
        op.drop_table('sellers')

