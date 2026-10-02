import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Numeric, Date, Text, Boolean, Integer,
    DateTime, ForeignKey, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from .database import Base


def generate_uuid():
    return str(uuid.uuid4())


def utc_now():
    return datetime.now(timezone.utc)


class Category(Base):
    __tablename__ = "categories"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    type = Column(String(10), nullable=False)  # 'expense' or 'income'
    icon = Column(String(10), nullable=True)
    color = Column(String(20), nullable=True)
    is_default = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        CheckConstraint("type IN ('expense', 'income')", name="check_category_type"),
    )

    aliases = relationship("CategoryAlias", back_populates="category", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="category")


class CategoryAlias(Base):
    __tablename__ = "category_aliases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(String(50), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    alias = Column(String(100), nullable=False, unique=True)

    category = relationship("Category", back_populates="aliases")

    __table_args__ = (
        Index("idx_alias_lower", "alias"),
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(String(10), nullable=False)  # 'expense' or 'income'
    category_id = Column(String(50), ForeignKey("categories.id"), nullable=False)
    category_name = Column(String(100), nullable=False)  # snapshot at creation time
    transaction_date = Column(Date, nullable=False)
    note = Column(Text, nullable=True)
    original_input = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        CheckConstraint("type IN ('expense', 'income')", name="check_transaction_type"),
        CheckConstraint("amount > 0", name="check_positive_amount"),
        Index("idx_transaction_date", "transaction_date"),
        Index("idx_transaction_type", "type"),
        Index("idx_transaction_category", "category_id"),
    )

    category = relationship("Category", back_populates="transactions")
