"""
Transaction service — business logic layer for transaction operations.
"""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from ..models import Transaction, Category
from ..schemas import (
    TransactionCreate, TransactionUpdate, TransactionResponse,
    TodaySummary, ChatInput, ChatResponse, ParsedTransaction,
    ParserConfidence, TransactionType, CategoryResponse
)
from ..parser import parse_transaction, CategoryResolver


class TransactionService:
    """Handles all transaction-related business logic."""

    def __init__(self, db: Session):
        self.db = db

    def create_transaction(self, data: TransactionCreate) -> Transaction:
        """Create a new transaction."""
        # Validate category exists
        category = self.db.query(Category).filter(Category.id == data.category_id).first()
        if not category:
            raise ValueError(f"Category '{data.category_id}' not found")

        transaction = Transaction(
            id=str(uuid.uuid4()),
            amount=data.amount,
            type=data.type.value,
            category_id=data.category_id,
            category_name=category.name,
            transaction_date=data.transaction_date,
            note=data.note,
            original_input=data.original_input,
        )
        self.db.add(transaction)

        # Increment category usage count
        category.usage_count = (category.usage_count or 0) + 1
        self.db.commit()
        self.db.refresh(transaction)

        return transaction

    def get_transaction(self, transaction_id: str) -> Optional[Transaction]:
        """Get a single transaction by ID."""
        return self.db.query(Transaction).filter(Transaction.id == transaction_id).first()

    def update_transaction(self, transaction_id: str, data: TransactionUpdate) -> Optional[Transaction]:
        """Update an existing transaction."""
        transaction = self.get_transaction(transaction_id)
        if not transaction:
            return None

        if data.amount is not None:
            transaction.amount = data.amount
        if data.type is not None:
            transaction.type = data.type.value
        if data.category_id is not None:
            category = self.db.query(Category).filter(Category.id == data.category_id).first()
            if not category:
                raise ValueError(f"Category '{data.category_id}' not found")
            transaction.category_id = data.category_id
            transaction.category_name = category.name
        if data.transaction_date is not None:
            transaction.transaction_date = data.transaction_date
        if data.note is not None:
            transaction.note = data.note

        transaction.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(transaction)

        return transaction

    def delete_transaction(self, transaction_id: str) -> bool:
        """Delete a transaction."""
        transaction = self.get_transaction(transaction_id)
        if not transaction:
            return False

        # Decrement category usage count
        category = self.db.query(Category).filter(Category.id == transaction.category_id).first()
        if category and category.usage_count and category.usage_count > 0:
            category.usage_count -= 1

        self.db.delete(transaction)
        self.db.commit()
        return True

    def get_transactions(
        self,
        date_filter: Optional[date] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        type_filter: Optional[str] = None,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Transaction]:
        """Get transactions with optional filters."""
        query = self.db.query(Transaction)

        if date_filter:
            query = query.filter(Transaction.transaction_date == date_filter)
        if date_from:
            query = query.filter(Transaction.transaction_date >= date_from)
        if date_to:
            query = query.filter(Transaction.transaction_date <= date_to)
        if type_filter:
            query = query.filter(Transaction.type == type_filter)
        if category_id:
            query = query.filter(Transaction.category_id == category_id)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Transaction.category_name.ilike(search_term)) |
                (Transaction.note.ilike(search_term)) |
                (Transaction.original_input.ilike(search_term))
            )

        return (
            query
            .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    def get_today_summary(self, today: date = None) -> TodaySummary:
        """Get today's income/expense summary."""
        if today is None:
            today = date.today()

        results = (
            self.db.query(
                Transaction.type,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count"),
            )
            .filter(Transaction.transaction_date == today)
            .group_by(Transaction.type)
            .all()
        )

        income = Decimal("0")
        expenses = Decimal("0")
        count = 0

        for row in results:
            total = Decimal(str(row.total)) if row.total else Decimal("0")
            if row.type == "income":
                income = total
            else:
                expenses = total
            count += row.count

        return TodaySummary(
            date=today,
            income=income,
            expenses=expenses,
            net=income - expenses,
            transaction_count=count,
        )

    def process_chat_input(self, message: str) -> ChatResponse:
        """
        Process a chat message: parse → validate → save.

        Returns a ChatResponse with the result.
        """
        parsed = parse_transaction(message, self.db)

        # Invalid input
        if parsed.confidence == ParserConfidence.invalid:
            return ChatResponse(
                success=False,
                message=parsed.error_message or "I couldn't understand that transaction. Try something like:\n₹500 food",
                parsed=parsed,
            )

        # Ambiguous — needs category selection
        if parsed.confidence == ParserConfidence.ambiguous:
            # Get top categories for selection
            resolver = CategoryResolver(self.db)
            frequent = resolver.get_recent_categories(limit=8)

            # If we have amount but no category
            if parsed.amount is not None:
                return ChatResponse(
                    success=False,
                    message=f"How should I categorize ₹{parsed.amount:,.2f}?",
                    parsed=parsed,
                    needs_category=True,
                    suggested_categories=[
                        CategoryResponse.model_validate(c) for c in frequent
                    ],
                )

            return ChatResponse(
                success=False,
                message=parsed.error_message or "I couldn't understand that transaction. Try something like:\n₹500 food",
                parsed=parsed,
            )

        # High confidence — save the transaction
        try:
            txn_data = TransactionCreate(
                amount=parsed.amount,
                type=parsed.type,
                category_id=parsed.category_id,
                transaction_date=parsed.transaction_date,
                note=parsed.note,
                original_input=parsed.original_input,
            )
            transaction = self.create_transaction(txn_data)

            amount_formatted = f"₹{parsed.amount:,.2f}"
            return ChatResponse(
                success=True,
                message=f"Added {amount_formatted} to {transaction.category_name}",
                transaction=TransactionResponse.model_validate(transaction),
                parsed=parsed,
            )
        except Exception as e:
            return ChatResponse(
                success=False,
                message="Couldn't save the transaction. Please try again.",
                parsed=parsed,
            )

    def process_chat_with_category(self, message: str, category_id: str) -> ChatResponse:
        """
        Process a previously ambiguous chat input with a user-selected category.
        """
        parsed = parse_transaction(message, self.db)

        if parsed.amount is None:
            return ChatResponse(
                success=False,
                message="I couldn't understand that transaction. Try something like:\n₹500 food",
                parsed=parsed,
            )

        # Look up the selected category
        category = self.db.query(Category).filter(Category.id == category_id).first()
        if not category:
            return ChatResponse(
                success=False,
                message="Selected category not found.",
                parsed=parsed,
            )

        try:
            txn_data = TransactionCreate(
                amount=parsed.amount,
                type=TransactionType(category.type),
                category_id=category.id,
                transaction_date=parsed.transaction_date or date.today(),
                note=parsed.note,
                original_input=parsed.original_input,
            )
            transaction = self.create_transaction(txn_data)

            amount_formatted = f"₹{parsed.amount:,.2f}"
            return ChatResponse(
                success=True,
                message=f"Added {amount_formatted} to {transaction.category_name}",
                transaction=TransactionResponse.model_validate(transaction),
                parsed=parsed,
            )
        except Exception as e:
            return ChatResponse(
                success=False,
                message="Couldn't save the transaction. Please try again.",
                parsed=parsed,
            )
