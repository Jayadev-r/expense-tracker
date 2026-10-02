"""
Analytics API routes — weekly/monthly summaries and category breakdowns.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import PeriodSummary
from ..services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/weekly", response_model=PeriodSummary)
def get_weekly_summary(
    date: Optional[date] = Query(None, description="Any date within the desired week"),
    db: Session = Depends(get_db),
):
    """Get weekly summary (Mon–Sun) for the week containing the given date."""
    service = AnalyticsService(db)
    return service.get_weekly_summary(reference_date=date)


@router.get("/monthly", response_model=PeriodSummary)
def get_monthly_summary(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
):
    """Get monthly summary for the given year/month."""
    service = AnalyticsService(db)
    return service.get_monthly_summary(year=year, month=month)


@router.get("/category/{category_id}")
def get_category_analytics(
    category_id: str,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
):
    """Get detailed breakdown for a specific category."""
    service = AnalyticsService(db)
    return service.get_category_transactions(
        category_id=category_id,
        year=year,
        month=month,
    )
