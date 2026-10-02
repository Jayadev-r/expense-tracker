"""
Category resolver using deterministic alias matching.
Looks up categories by exact name or alias (case-insensitive).
"""

from sqlalchemy.orm import Session
from ..models import Category, CategoryAlias
from typing import Optional


class CategoryResolver:
    """Resolves input text to categories using alias matching."""

    def __init__(self, db: Session):
        self.db = db
        self._cache: dict[str, Category] | None = None

    def _build_cache(self) -> dict[str, Category]:
        """Build a lookup cache: alias (lowercase) → Category."""
        cache = {}

        # Load all active categories with their aliases
        categories = (
            self.db.query(Category)
            .filter(Category.is_active == True)
            .all()
        )

        for cat in categories:
            # Map category name (lowercase) to itself
            cache[cat.name.lower()] = cat
            # Map category id (lowercase) to itself
            cache[cat.id.lower()] = cat
            # Map all aliases
            for alias_obj in cat.aliases:
                cache[alias_obj.alias.lower()] = cat

        return cache

    def get_cache(self) -> dict[str, Category]:
        """Get or build the alias cache."""
        if self._cache is None:
            self._cache = self._build_cache()
        return self._cache

    def resolve(self, text: str) -> Optional[Category]:
        """
        Try to resolve a text string to a category.

        Matching strategy:
        1. Exact match against category name or alias (case-insensitive)
        2. Word-by-word matching against aliases

        Returns the matched Category or None.
        """
        cache = self.get_cache()
        text_lower = text.lower().strip()

        # 1. Direct match (full text)
        if text_lower in cache:
            return cache[text_lower]

        # 2. Try matching individual words
        words = text_lower.split()
        for word in words:
            if word in cache:
                return cache[word]

        return None

    def resolve_with_remaining(self, text: str) -> tuple[Optional[Category], str]:
        """
        Resolve category from text and return remaining text (for notes).

        Returns:
            (category, remaining_text)
        """
        cache = self.get_cache()
        text_lower = text.lower().strip()
        words = text.split()

        # 1. Direct match (full text)
        if text_lower in cache:
            return cache[text_lower], ""

        # 2. Try multi-word category matches (longest match first)
        for length in range(len(words), 0, -1):
            for i in range(len(words) - length + 1):
                candidate = " ".join(words[i:i + length]).lower()
                if candidate in cache:
                    # Remove matched words, rest becomes note
                    remaining_words = words[:i] + words[i + length:]
                    remaining = " ".join(remaining_words).strip()
                    return cache[candidate], remaining

        return None, text

    def get_frequent_categories(self, limit: int = 5, type_filter: str = None) -> list[Category]:
        """Get most frequently used categories."""
        query = (
            self.db.query(Category)
            .filter(Category.is_active == True)
            .filter(Category.usage_count > 0)
        )
        if type_filter:
            query = query.filter(Category.type == type_filter)

        return query.order_by(Category.usage_count.desc()).limit(limit).all()

    def get_recent_categories(self, limit: int = 6) -> list[Category]:
        """Get categories sorted by usage count for quick buttons."""
        return (
            self.db.query(Category)
            .filter(Category.is_active == True)
            .order_by(Category.usage_count.desc())
            .limit(limit)
            .all()
        )
