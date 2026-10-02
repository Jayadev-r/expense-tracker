"""
Deterministic transaction parser.

Parses natural-language-like input into structured transaction data
using regex, keyword matching, and category alias resolution.

NO AI, ML, LLM, or external APIs are used.

Parsing priority:
1. Explicit transaction sign (+/-)
2. Amount detection (₹, Rs, commas, decimals, Indian number format)
3. Date detection (today, yesterday, tomorrow, explicit dates)
4. Transaction type keywords (salary, income, received, etc.)
5. Category matching (alias lookup)
6. Remaining text → note
"""

import re
from decimal import Decimal, InvalidOperation
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from ..schemas import ParsedTransaction, ParserConfidence, TransactionType
from .date_parser import parse_date
from .category_resolver import CategoryResolver


# ── Income keywords ──────────────────────────────────────

INCOME_KEYWORDS = {
    "salary", "income", "received", "earning", "earnings",
    "freelance", "bonus", "refund", "cashback", "interest",
    "dividend", "reimbursement", "gift received",
}

# ── Amount extraction patterns ───────────────────────────

# Matches currency symbols/prefixes + number with optional commas/decimals
# Supports: ₹500, Rs 500, rs.500, 500 rs, 1,500, 1,50,000, 125.50
AMOUNT_PATTERNS = [
    # ₹1,500.50 or Rs 1,500 or rs.500
    re.compile(
        r'(?:₹|rs\.?|rupees?)\s*([\d,]+\.?\d*)',
        re.IGNORECASE
    ),
    # 1,500 rs or 500 rupees
    re.compile(
        r'([\d,]+\.?\d*)\s*(?:₹|rs\.?|rupees?)',
        re.IGNORECASE
    ),
    # Plain number (at least 1 digit) — captured later with context
    re.compile(
        r'(?:^|(?<=\s))([\d,]+\.?\d*)(?:$|(?=\s))',
    ),
]

# Words to strip from input before category matching
NOISE_WORDS = {"for", "on", "at", "in", "to", "the", "a", "an", "of", "with", "and"}

# Separator between category and amount
SEPARATOR_PATTERN = re.compile(r'\s*[-–—]\s*')


def parse_transaction(text: str, db: Session, reference_date: date = None) -> ParsedTransaction:
    """
    Parse a user input string into a structured transaction.

    Args:
        text: Raw user input (e.g., "₹500 food yesterday")
        db: Database session for category resolution
        reference_date: Reference date for relative dates (defaults to today)

    Returns:
        ParsedTransaction with amount, type, category, date, note, and confidence
    """
    if reference_date is None:
        reference_date = date.today()

    original_input = text.strip()

    # Basic validation
    if not original_input:
        return ParsedTransaction(
            original_input=original_input,
            confidence=ParserConfidence.invalid,
            error_message="Please enter a transaction. Try something like: ₹500 food"
        )

    working_text = original_input

    # ── Step 1: Detect explicit sign (+/-) ─────────────
    explicit_type = None
    if working_text.startswith('+'):
        explicit_type = TransactionType.income
        working_text = working_text[1:].strip()
    elif working_text.startswith('-'):
        explicit_type = TransactionType.expense
        working_text = working_text[1:].strip()

    # ── Step 2: Handle separator pattern (e.g., "shopping - 2000") ──
    working_text = SEPARATOR_PATTERN.sub(' ', working_text)

    # ── Step 3: Extract amount ─────────────────────────
    amount, working_text = _extract_amount(working_text)

    if amount is None:
        return ParsedTransaction(
            original_input=original_input,
            confidence=ParserConfidence.invalid,
            error_message="I couldn't understand that transaction. Try something like:\n₹500 food"
        )

    # ── Step 4: Extract date ───────────────────────────
    parsed_date, working_text = parse_date(working_text, reference_date)
    transaction_date = parsed_date if parsed_date else reference_date

    # ── Step 5: Clean remaining text ───────────────────
    remaining = _clean_text(working_text)

    # ── Step 6: Resolve category ───────────────────────
    resolver = CategoryResolver(db)
    category, note_text = resolver.resolve_with_remaining(remaining)

    # ── Step 7: Determine transaction type ─────────────
    if explicit_type:
        txn_type = explicit_type
    elif category:
        txn_type = TransactionType(category.type)
    else:
        # Check if any remaining word is an income keyword
        remaining_lower = remaining.lower()
        if any(kw in remaining_lower for kw in INCOME_KEYWORDS):
            txn_type = TransactionType.income
        else:
            txn_type = TransactionType.expense  # default

    # ── Step 8: Determine confidence ───────────────────
    if category is None and remaining.strip():
        # We have text but couldn't match a category
        confidence = ParserConfidence.ambiguous
    elif category is None:
        # Amount only, no category text at all
        confidence = ParserConfidence.ambiguous
    else:
        confidence = ParserConfidence.high

    # Clean up note
    note = note_text.strip() if note_text and note_text.strip() else None
    # Remove noise words from beginning of note
    if note:
        note_words = note.split()
        while note_words and note_words[0].lower() in NOISE_WORDS:
            note_words.pop(0)
        note = " ".join(note_words) if note_words else None

    return ParsedTransaction(
        amount=amount,
        type=txn_type,
        category=category.name if category else None,
        category_id=category.id if category else None,
        transaction_date=transaction_date,
        note=note,
        confidence=confidence,
        original_input=original_input,
    )


def _extract_amount(text: str) -> tuple[Optional[Decimal], str]:
    """
    Extract a monetary amount from the text.

    Returns:
        (amount, remaining_text) — The extracted Decimal amount and
        the text with the amount removed.
    """
    # Try each pattern in priority order
    for pattern in AMOUNT_PATTERNS:
        match = pattern.search(text)
        if match:
            raw_number = match.group(1) if match.lastindex else match.group(0)
            amount = _parse_number(raw_number)
            if amount is not None and amount > 0:
                # Remove the matched portion from text
                remaining = text[:match.start()] + text[match.end():]
                return amount, remaining.strip()

    return None, text


def _parse_number(raw: str) -> Optional[Decimal]:
    """
    Parse a number string that may contain Indian-style commas.

    Supports:
        1500, 1,500, 15,000, 1,50,000, 125.50, 1,500.50
    """
    try:
        # Remove commas
        cleaned = raw.replace(',', '')
        if not cleaned or cleaned == '.':
            return None
        amount = Decimal(cleaned)
        # Round to 2 decimal places
        return amount.quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError):
        return None


def _clean_text(text: str) -> str:
    """Remove noise characters and extra whitespace from text."""
    # Remove currency symbols that might remain
    text = re.sub(r'[₹]', '', text)
    # Remove "rs" / "rupees" that might remain
    text = re.sub(r'\b(?:rs\.?|rupees?)\b', '', text, flags=re.IGNORECASE)
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text
