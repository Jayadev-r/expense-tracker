"""
Category API routes.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, CategoryAlias
from ..schemas import CategoryCreate, CategoryUpdate, CategoryResponse
from ..parser.category_resolver import CategoryResolver

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=List[CategoryResponse])
def get_categories(
    type: str = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    """Get all categories, optionally filtered by type."""
    query = db.query(Category)
    if type:
        query = query.filter(Category.type == type)
    if active_only:
        query = query.filter(Category.is_active == True)
    return query.order_by(Category.usage_count.desc(), Category.name).all()


@router.get("/frequent", response_model=List[CategoryResponse])
def get_frequent_categories(
    limit: int = 6,
    type: str = None,
    db: Session = Depends(get_db),
):
    """Get most frequently used categories for quick buttons."""
    resolver = CategoryResolver(db)
    if type:
        return resolver.get_frequent_categories(limit=limit, type_filter=type)
    return resolver.get_recent_categories(limit=limit)


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: str, db: Session = Depends(get_db)):
    """Get a single category by ID."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("", response_model=CategoryResponse, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    """Create a new custom category."""
    # Generate ID from name
    cat_id = data.name.lower().replace(" ", "_")

    # Check for duplicate
    existing = db.query(Category).filter(Category.id == cat_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    category = Category(
        id=cat_id,
        name=data.name,
        type=data.type.value,
        icon=data.icon,
        color=data.color or "#ADB5BD",
        is_default=False,
        is_active=True,
        usage_count=0,
    )
    db.add(category)
    db.flush()

    # Add aliases
    if data.aliases:
        for alias_text in data.aliases:
            alias_lower = alias_text.lower().strip()
            # Check for duplicate alias
            existing_alias = db.query(CategoryAlias).filter(
                CategoryAlias.alias == alias_lower
            ).first()
            if not existing_alias:
                alias = CategoryAlias(category_id=cat_id, alias=alias_lower)
                db.add(alias)

    # Always add the category name as an alias
    name_alias = data.name.lower()
    existing_name_alias = db.query(CategoryAlias).filter(
        CategoryAlias.alias == name_alias
    ).first()
    if not existing_name_alias:
        db.add(CategoryAlias(category_id=cat_id, alias=name_alias))

    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing category."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if data.name is not None:
        category.name = data.name
    if data.icon is not None:
        category.icon = data.icon
    if data.color is not None:
        category.color = data.color
    if data.is_active is not None:
        category.is_active = data.is_active

    # Update aliases if provided
    if data.aliases is not None:
        # Remove old aliases
        db.query(CategoryAlias).filter(
            CategoryAlias.category_id == category_id
        ).delete()
        # Add new aliases
        for alias_text in data.aliases:
            alias_lower = alias_text.lower().strip()
            db.add(CategoryAlias(category_id=category_id, alias=alias_lower))

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: str, db: Session = Depends(get_db)):
    """Delete a category (soft-delete by deactivating)."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default categories. Deactivate instead.")

    category.is_active = False
    db.commit()
