"""
Analytics service — weekly/monthly summaries and category breakdowns.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import Transaction, Category
from ..schemas import (
    PeriodSummary, CategoryBreakdown, DailySummary,
    TransactionResponse
)


class AnalyticsService:
    """Handles analytics calculations."""

    def __init__(self, db: Session):
        self.db = db

    def get_weekly_summary(self, reference_date: date = None) -> PeriodSummary:
        """Get summary for the week containing the reference date (Mon–Sun)."""
        if reference_date is None:
            reference_date = date.today()

        # Find Monday of the current week
        weekday = reference_date.weekday()  # Monday = 0
        week_start = reference_date - timedelta(days=weekday)
        week_end = week_start + timedelta(days=6)

        return self._get_period_summary(week_start, week_end)

    def get_monthly_summary(self, year: int = None, month: int = None) -> PeriodSummary:
        """Get summary for a specific month."""
        if year is None or month is None:
            today = date.today()
            year = today.year
            month = today.month

        month_start = date(year, month, 1)
        # Find last day of month
        if month == 12:
            month_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(year, month + 1, 1) - timedelta(days=1)

        return self._get_period_summary(month_start, month_end)

    def _get_period_summary(self, period_start: date, period_end: date) -> PeriodSummary:
        """Calculate summary for a date range."""
        transactions = (
            self.db.query(Transaction)
            .filter(
                Transaction.transaction_date >= period_start,
                Transaction.transaction_date <= period_end,
            )
            .all()
        )

        total_income = Decimal("0")
        total_expenses = Decimal("0")
        expense_by_cat: dict[str, dict] = {}
        income_by_cat: dict[str, dict] = {}
        daily: dict[date, dict] = {}
        largest_expense: Optional[Transaction] = None
        count = 0

        for txn in transactions:
            amount = Decimal(str(txn.amount))
            count += 1

            if txn.type == "income":
                total_income += amount
                bucket = income_by_cat
            else:
                total_expenses += amount
                bucket = expense_by_cat

                # Track largest expense
                if largest_expense is None or amount > Decimal(str(largest_expense.amount)):
                    largest_expense = txn

            # Category breakdown
            cat_key = txn.category_id
            if cat_key not in bucket:
                cat = self.db.query(Category).filter(Category.id == txn.category_id).first()
                bucket[cat_key] = {
                    "category_id": txn.category_id,
                    "category_name": txn.category_name,
                    "color": cat.color if cat else None,
                    "total": Decimal("0"),
                    "count": 0,
                }
            bucket[cat_key]["total"] += amount
            bucket[cat_key]["count"] += 1

            # Daily breakdown
            d = txn.transaction_date
            if d not in daily:
                daily[d] = {"income": Decimal("0"), "expenses": Decimal("0")}
            if txn.type == "income":
                daily[d]["income"] += amount
            else:
                daily[d]["expenses"] += amount

        net_balance = total_income - total_expenses
        savings_rate = float(net_balance / total_income * 100) if total_income > 0 else 0.0

        # Build category breakdowns with percentages
        def build_breakdown(bucket: dict, total: Decimal) -> list[CategoryBreakdown]:
            items = []
            for data in bucket.values():
                pct = float(data["total"] / total * 100) if total > 0 else 0.0
                items.append(CategoryBreakdown(
                    category_id=data["category_id"],
                    category_name=data["category_name"],
                    color=data["color"],
                    total=data["total"],
                    percentage=round(pct, 2),
                    count=data["count"],
                ))
            return sorted(items, key=lambda x: x.total, reverse=True)

        # Build daily summaries
        daily_summaries = []
        current = period_start
        while current <= period_end:
            d_data = daily.get(current, {"income": Decimal("0"), "expenses": Decimal("0")})
            daily_summaries.append(DailySummary(
                date=current,
                income=d_data["income"],
                expenses=d_data["expenses"],
                net=d_data["income"] - d_data["expenses"],
            ))
            current += timedelta(days=1)

        # Find highest spending day
        highest_day = None
        if daily_summaries:
            spending_days = [d for d in daily_summaries if d.expenses > 0]
            if spending_days:
                highest_day = max(spending_days, key=lambda d: d.expenses)

        return PeriodSummary(
            period_start=period_start,
            period_end=period_end,
            total_income=total_income,
            total_expenses=total_expenses,
            net_balance=net_balance,
            savings_rate=round(savings_rate, 2),
            transaction_count=count,
            expense_breakdown=build_breakdown(expense_by_cat, total_expenses),
            income_breakdown=build_breakdown(income_by_cat, total_income),
            daily_summaries=daily_summaries,
            largest_expense=(
                TransactionResponse.model_validate(largest_expense)
                if largest_expense else None
            ),
            highest_spending_day=highest_day,
        )

    def get_category_transactions(
        self,
        category_id: str,
        year: int = None,
        month: int = None,
    ) -> dict:
        """Get detailed breakdown for a specific category in a month."""
        if year is None or month is None:
            today = date.today()
            year = today.year
            month = today.month

        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(year, month + 1, 1) - timedelta(days=1)

        transactions = (
            self.db.query(Transaction)
            .filter(
                Transaction.category_id == category_id,
                Transaction.transaction_date >= month_start,
                Transaction.transaction_date <= month_end,
            )
            .order_by(Transaction.transaction_date.desc())
            .all()
        )

        total = sum(Decimal(str(t.amount)) for t in transactions)

        return {
            "category_id": category_id,
            "period_start": month_start,
            "period_end": month_end,
            "total": total,
            "count": len(transactions),
            "transactions": [
                TransactionResponse.model_validate(t) for t in transactions
            ],
        }
