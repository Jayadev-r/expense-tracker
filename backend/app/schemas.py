from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


# ── Enums ──────────────────────────────────────────────────

class TransactionType(str, Enum):
    expense = "expense"
    income = "income"


class ParserConfidence(str, Enum):
    high = "high"
    medium = "medium"
    ambiguous = "ambiguous"
    invalid = "invalid"


# ── Parser Schemas ─────────────────────────────────────────

class ParsedTransaction(BaseModel):
    """Output from the deterministic transaction parser."""
    amount: Optional[Decimal] = None
    type: Optional[TransactionType] = None
    category: Optional[str] = None
    category_id: Optional[str] = None
    transaction_date: Optional[date] = None
    note: Optional[str] = None
    confidence: ParserConfidence = ParserConfidence.invalid
    original_input: str = ""
    error_message: Optional[str] = None


# ── Transaction Schemas ────────────────────────────────────

class TransactionCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    type: TransactionType
    category_id: str
    transaction_date: date
    note: Optional[str] = None
    original_input: Optional[str] = None


class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, max_digits=12, decimal_places=2)
    type: Optional[TransactionType] = None
    category_id: Optional[str] = None
    transaction_date: Optional[date] = None
    note: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    amount: Decimal
    type: TransactionType
    category_id: str
    category_name: str
    transaction_date: date
    note: Optional[str]
    original_input: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Category Schemas ───────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: TransactionType
    icon: Optional[str] = None
    color: Optional[str] = None
    aliases: Optional[List[str]] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    aliases: Optional[List[str]] = None


class CategoryAliasResponse(BaseModel):
    id: int
    alias: str

    model_config = {"from_attributes": True}


class CategoryResponse(BaseModel):
    id: str
    name: str
    type: TransactionType
    icon: Optional[str]
    color: Optional[str]
    is_default: bool
    is_active: bool
    usage_count: int
    aliases: List[CategoryAliasResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Analytics Schemas ──────────────────────────────────────

class CategoryBreakdown(BaseModel):
    category_id: str
    category_name: str
    color: Optional[str]
    total: Decimal
    percentage: float
    count: int


class DailySummary(BaseModel):
    date: date
    income: Decimal
    expenses: Decimal
    net: Decimal


class PeriodSummary(BaseModel):
    period_start: date
    period_end: date
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    savings_rate: float
    transaction_count: int
    expense_breakdown: List[CategoryBreakdown] = []
    income_breakdown: List[CategoryBreakdown] = []
    daily_summaries: List[DailySummary] = []
    largest_expense: Optional[TransactionResponse] = None
    highest_spending_day: Optional[DailySummary] = None


class TodaySummary(BaseModel):
    date: date
    income: Decimal
    expenses: Decimal
    net: Decimal
    transaction_count: int


# ── Chat Schemas ───────────────────────────────────────────

class ChatInput(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)


class ChatResponse(BaseModel):
    success: bool
    message: str
    transaction: Optional[TransactionResponse] = None
    parsed: Optional[ParsedTransaction] = None
    needs_category: bool = False
    suggested_categories: Optional[List[CategoryResponse]] = None
