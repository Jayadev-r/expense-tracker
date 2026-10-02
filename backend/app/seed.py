"""
Seed default categories and aliases into the database.
"""

from sqlalchemy.orm import Session
from .models import Category, CategoryAlias


# ── Default Expense Categories with aliases ──────────────

EXPENSE_CATEGORIES = {
    "food": {
        "name": "Food",
        "icon": "🍔",
        "color": "#FF6B6B",
        "aliases": ["food", "foods", "lunch", "dinner", "breakfast", "restaurant",
                     "cafe", "snack", "snacks", "meal", "meals", "eating", "brunch",
                     "takeout", "takeaway", "dine", "dining", "biryani", "pizza",
                     "burger", "coffee", "tea", "tiffin", "canteen", "mess",
                     "zomato", "swiggy"]
    },
    "groceries": {
        "name": "Groceries",
        "icon": "🛒",
        "color": "#51CF66",
        "aliases": ["grocery", "groceries", "supermarket", "vegetables", "fruits",
                     "provisions", "ration", "kirana", "bigbasket", "blinkit",
                     "zepto", "dmart", "reliance fresh"]
    },
    "shopping": {
        "name": "Shopping",
        "icon": "🛍️",
        "color": "#CC5DE8",
        "aliases": ["shopping", "clothes", "clothing", "purchase", "bought",
                     "amazon", "flipkart", "myntra", "online shopping", "mall",
                     "shoes", "accessories", "fashion"]
    },
    "transportation": {
        "name": "Transportation",
        "icon": "🚌",
        "color": "#339AF0",
        "aliases": ["transport", "transportation", "bus", "taxi", "uber", "ola",
                     "auto", "metro", "train", "railway", "cab", "ride",
                     "rapido", "rickshaw", "commute"]
    },
    "fuel": {
        "name": "Fuel",
        "icon": "⛽",
        "color": "#FF922B",
        "aliases": ["fuel", "petrol", "diesel", "gas", "gasoline", "cng",
                     "ev charge", "charging", "petroleum"]
    },
    "rent": {
        "name": "Rent",
        "icon": "🏠",
        "color": "#845EF7",
        "aliases": ["rent", "house rent", "room rent", "pg", "hostel",
                     "accommodation", "flat rent"]
    },
    "utilities": {
        "name": "Utilities",
        "icon": "💡",
        "color": "#20C997",
        "aliases": ["utilities", "utility", "water", "water bill",
                     "gas bill", "maintenance"]
    },
    "electricity": {
        "name": "Electricity",
        "icon": "⚡",
        "color": "#FCC419",
        "aliases": ["electricity", "electric", "power", "power bill",
                     "electricity bill", "eb bill", "current bill"]
    },
    "mobile": {
        "name": "Mobile",
        "icon": "📱",
        "color": "#22B8CF",
        "aliases": ["mobile", "phone", "recharge", "mobile recharge",
                     "phone bill", "airtel", "jio", "vi", "bsnl",
                     "phone recharge", "prepaid", "postpaid"]
    },
    "internet": {
        "name": "Internet",
        "icon": "🌐",
        "color": "#3BC9DB",
        "aliases": ["internet", "wifi", "broadband", "data pack",
                     "internet bill", "fiber", "hotspot"]
    },
    "health": {
        "name": "Health",
        "icon": "🏥",
        "color": "#F06595",
        "aliases": ["health", "medical", "medicine", "hospital", "doctor",
                     "clinic", "pharmacy", "medicines", "tablets", "checkup",
                     "lab test", "dental", "dentist", "eye care", "optician",
                     "healthcare"]
    },
    "education": {
        "name": "Education",
        "icon": "📚",
        "color": "#5C7CFA",
        "aliases": ["education", "school", "college", "university", "tuition",
                     "course", "books", "stationery", "fees", "coaching",
                     "training", "udemy", "coursera", "learning"]
    },
    "entertainment": {
        "name": "Entertainment",
        "icon": "🎬",
        "color": "#E64980",
        "aliases": ["entertainment", "movie", "movies", "cinema", "netflix",
                     "prime", "hotstar", "spotify", "youtube premium",
                     "gaming", "games", "concert", "show", "theatre", "fun",
                     "outing", "hangout", "party"]
    },
    "travel": {
        "name": "Travel",
        "icon": "✈️",
        "color": "#4DABF7",
        "aliases": ["travel", "trip", "vacation", "holiday", "flight",
                     "hotel", "booking", "airbnb", "tour", "oyo",
                     "makemytrip", "goibibo", "irctc"]
    },
    "subscriptions": {
        "name": "Subscriptions",
        "icon": "🔄",
        "color": "#9775FA",
        "aliases": ["subscription", "subscriptions", "membership", "premium",
                     "plan", "annual plan", "monthly plan"]
    },
    "bills": {
        "name": "Bills",
        "icon": "📄",
        "color": "#868E96",
        "aliases": ["bill", "bills", "payment", "due", "invoice"]
    },
    "personal_care": {
        "name": "Personal Care",
        "icon": "💇",
        "color": "#F783AC",
        "aliases": ["personal care", "haircut", "salon", "spa", "grooming",
                     "skincare", "cosmetics", "beauty", "parlour", "parlor",
                     "barber"]
    },
    "gifts": {
        "name": "Gifts",
        "icon": "🎁",
        "color": "#DA77F2",
        "aliases": ["gift", "gifts", "present", "presents", "donation",
                     "charity", "contribution"]
    },
    "family": {
        "name": "Family",
        "icon": "👨‍👩‍👧‍👦",
        "color": "#FF8787",
        "aliases": ["family", "parents", "kids", "children", "home",
                     "household", "family expense"]
    },
    "emi": {
        "name": "EMI",
        "icon": "🏦",
        "color": "#748FFC",
        "aliases": ["emi", "loan", "installment", "emi payment",
                     "car loan", "home loan", "personal loan",
                     "credit card", "credit card bill"]
    },
    "other_expense": {
        "name": "Other",
        "icon": "📌",
        "color": "#ADB5BD",
        "aliases": ["other", "misc", "miscellaneous", "general", "random"]
    },
}


# ── Default Income Categories with aliases ───────────────

INCOME_CATEGORIES = {
    "salary": {
        "name": "Salary",
        "icon": "💰",
        "color": "#51CF66",
        "aliases": ["salary", "pay", "wages", "paycheck", "monthly salary",
                     "stipend"]
    },
    "freelance": {
        "name": "Freelance",
        "icon": "💻",
        "color": "#339AF0",
        "aliases": ["freelance", "freelancing", "contract", "gig",
                     "side hustle", "project payment", "consulting"]
    },
    "business": {
        "name": "Business",
        "icon": "🏢",
        "color": "#845EF7",
        "aliases": ["business", "business income", "profit", "revenue",
                     "sales", "commission"]
    },
    "bonus": {
        "name": "Bonus",
        "icon": "🎉",
        "color": "#FCC419",
        "aliases": ["bonus", "incentive", "reward", "performance bonus",
                     "annual bonus"]
    },
    "interest": {
        "name": "Interest",
        "icon": "🏦",
        "color": "#20C997",
        "aliases": ["interest", "bank interest", "fd interest",
                     "savings interest", "deposit interest"]
    },
    "cashback": {
        "name": "Cashback",
        "icon": "💸",
        "color": "#FF922B",
        "aliases": ["cashback", "cash back", "reward points", "points"]
    },
    "refund": {
        "name": "Refund",
        "icon": "↩️",
        "color": "#22B8CF",
        "aliases": ["refund", "return", "refunded", "money back",
                     "reimbursement", "reimbursed"]
    },
    "gift_income": {
        "name": "Gift",
        "icon": "🎁",
        "color": "#DA77F2",
        "aliases": ["gift received", "gift money", "received gift",
                     "monetary gift", "pocket money"]
    },
    "other_income": {
        "name": "Other",
        "icon": "📌",
        "color": "#ADB5BD",
        "aliases": ["other income", "misc income", "miscellaneous income"]
    },
}


def seed_categories(db: Session):
    """Seed default categories and aliases if they don't already exist."""

    existing_count = db.query(Category).count()
    if existing_count > 0:
        return  # Already seeded

    # Seed expense categories
    for cat_id, data in EXPENSE_CATEGORIES.items():
        category = Category(
            id=cat_id,
            name=data["name"],
            type="expense",
            icon=data["icon"],
            color=data["color"],
            is_default=True,
            is_active=True,
            usage_count=0,
        )
        db.add(category)
        db.flush()

        for alias_text in data["aliases"]:
            alias = CategoryAlias(
                category_id=cat_id,
                alias=alias_text.lower(),
            )
            db.add(alias)

    # Seed income categories
    for cat_id, data in INCOME_CATEGORIES.items():
        category = Category(
            id=cat_id,
            name=data["name"],
            type="income",
            icon=data["icon"],
            color=data["color"],
            is_default=True,
            is_active=True,
            usage_count=0,
        )
        db.add(category)
        db.flush()

        for alias_text in data["aliases"]:
            alias = CategoryAlias(
                category_id=cat_id,
                alias=alias_text.lower(),
            )
            db.add(alias)

    db.commit()
