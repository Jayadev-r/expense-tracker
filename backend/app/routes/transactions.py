"""
Transaction API routes.
"""

from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    TransactionCreate, TransactionUpdate, TransactionResponse,
    TodaySummary, ChatInput, ChatResponse
)
from ..services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    """Create a new transaction directly."""
    service = TransactionService(db)
    try:
        transaction = service.create_transaction(data)
        return transaction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    date: Optional[date] = Query(None, alias="date"),
    date_from: Optional[date] = Query(None, alias="from"),
    date_to: Optional[date] = Query(None, alias="to"),
    type: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Get transactions with optional filters."""
    service = TransactionService(db)
    return service.get_transactions(
        date_filter=date,
        date_from=date_from,
        date_to=date_to,
        type_filter=type,
        category_id=category_id,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/today", response_model=TodaySummary)
def get_today_summary(db: Session = Depends(get_db)):
    """Get today's income/expense summary."""
    service = TransactionService(db)
    return service.get_today_summary()


@router.post("/import", response_model=dict)
def import_transactions(items: List[TransactionCreate], db: Session = Depends(get_db)):
    """Import multiple transactions in a batch."""
    service = TransactionService(db)
    created = 0
    errors = []
    for idx, item in enumerate(items):
        try:
            service.create_transaction(item)
            created += 1
        except Exception as e:
            errors.append(f"Item {idx + 1}: {str(e)}")
    return {"imported": created, "total": len(items), "errors": errors}


@router.post("/clear-all", response_model=dict)
def clear_all_transactions(db: Session = Depends(get_db)):
    """Delete all transactions from the database."""
    from ..models import Transaction
    deleted_count = db.query(Transaction).delete()
    db.commit()
    return {"deleted": deleted_count}


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """Get a single transaction by ID."""
    service = TransactionService(db)
    transaction = service.get_transaction(transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing transaction."""
    service = TransactionService(db)
    try:
        transaction = service.update_transaction(transaction_id, data)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return transaction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """Delete a transaction."""
    service = TransactionService(db)
    if not service.delete_transaction(transaction_id):
        raise HTTPException(status_code=404, detail="Transaction not found")

