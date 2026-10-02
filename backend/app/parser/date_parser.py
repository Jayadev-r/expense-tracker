"""
Deterministic date parser for transaction inputs.
Supports: today, yesterday, tomorrow, and explicit date formats (DD/MM/YYYY, DD-MM-YYYY).
"""

import re
from datetime import date, timedelta
from dateutil import parser as dateutil_parser


# Date keyword mappings
DATE_KEYWORDS = {
    "today": 0,
    "yesterday": -1,
    "tomorrow": 1,
}

# Regex for explicit dates: DD/MM/YYYY or DD-MM-YYYY (2 or 4 digit year)
EXPLICIT_DATE_PATTERN = re.compile(
    r'\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b'
)

# Pattern to match "on <date>" prefix
ON_DATE_PATTERN = re.compile(
    r'\bon\s+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b',
    re.IGNORECASE
)


def parse_date(text: str, reference_date: date = None) -> tuple[date | None, str]:
    """
    Extract a date from the input text.

    Returns:
        (parsed_date, remaining_text) - The extracted date and the text with
        date references removed. Returns (None, original_text) if no date found.
    """
    if reference_date is None:
        reference_date = date.today()

    remaining = text
    parsed = None

    # 1. Check for "on DD/MM/YYYY" pattern first
    on_match = ON_DATE_PATTERN.search(remaining)
    if on_match:
        explicit_date = _parse_explicit_date(on_match.group(1))
        if explicit_date:
            parsed = explicit_date
            remaining = remaining[:on_match.start()] + remaining[on_match.end():]
            return parsed, remaining.strip()

    # 2. Check for date keywords (today, yesterday, tomorrow)
    lower_text = remaining.lower()
    for keyword, offset in DATE_KEYWORDS.items():
        # Match keyword as a whole word
        pattern = re.compile(r'\b' + re.escape(keyword) + r'\b', re.IGNORECASE)
        match = pattern.search(remaining)
        if match:
            parsed = reference_date + timedelta(days=offset)
            remaining = remaining[:match.start()] + remaining[match.end():]
            return parsed, remaining.strip()

    # 3. Check for explicit date patterns (DD/MM/YYYY, DD-MM-YYYY)
    explicit_match = EXPLICIT_DATE_PATTERN.search(remaining)
    if explicit_match:
        explicit_date = _parse_explicit_date(explicit_match.group(0))
        if explicit_date:
            parsed = explicit_date
            remaining = remaining[:explicit_match.start()] + remaining[explicit_match.end():]
            return parsed, remaining.strip()

    return None, text


def _parse_explicit_date(date_str: str) -> date | None:
    """Parse an explicit date string in DD/MM/YYYY or DD-MM-YYYY format."""
    try:
        # Normalize separator
        normalized = date_str.replace('-', '/')
        parts = normalized.split('/')

        if len(parts) != 3:
            return None

        day = int(parts[0])
        month = int(parts[1])
        year = int(parts[2])

        # Handle 2-digit year
        if year < 100:
            year += 2000

        return date(year, month, day)
    except (ValueError, IndexError):
        return None
