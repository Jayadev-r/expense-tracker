# 💸 Expense Tracker

A modern, mobile-first personal Expense and Income Tracker designed primarily for swift financial recording on mobile devices (e.g., iPhone) via a chat-style natural language interface.

> **Zero AI / Deterministic Parsing**: Transaction messages are parsed entirely using deterministic, rule-based regular expressions and Levenshtein similarity matching with smart date extraction. No external LLMs, AI APIs, or cloud models are used.

---

## ✨ Features

- **💬 Chat-First Quick Entry**:
  - Type natural messages like `150 for Food`, `shopping - 2000`, `₹500 petrol`, `salary 36000`, or `500 food yesterday`.
  - Instant parsing into amount, category, date, and type with real-time feedback.
  - Quick category selector for ambiguous entries (e.g. typing just `500`).
  - Undo support for recent transactions.
  - Live "Today's Summary" header card.

- **📅 Calendar View**:
  - Month navigation with daily expense badges.
  - Interactive daily breakdown (Income, Spent, Net).
  - Manual transaction entry modal (`+ Add`).
  - Transaction editing and deletion modal.
  - Search and filter by category, note, amount, and type (All, Expenses, Income).

- **📊 Visual Analytics**:
  - Weekly and Monthly period toggle.
  - High-level KPI cards (Total Income, Total Expenses, Net Savings, Savings Rate %).
  - Recharts Donut Chart for category breakdown.
  - Recharts Bar Chart for daily spending trends.
  - Category breakdown bars with percentage indicators.

- **⚙️ Custom Categories & Data Management**:
  - Create and manage custom categories with emoji icons and keyword aliases.
  - Export data to **CSV** and **JSON**.
  - Import backup data (**CSV** and **JSON**).
  - Database reset / clear all data with confirmation.
  - Theme switcher (Light, Dark, and System).

- **📱 Mobile & PWA Ready**:
  - Tailored for mobile screens with bottom navigation bar and iOS safe-area insets.
  - Offline app-shell caching with Service Worker (`sw.js`).
  - Web App Manifest (`manifest.webmanifest`) for home-screen installation.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, SQLite, Pydantic, Uvicorn
- **Frontend**: React 18, Vite, React Router DOM, Recharts, Vanilla CSS Design System

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Navigate to project root
cd e:\Expense-Tracker

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies (if needed)
pip install -r backend/requirements.txt

# Run FastAPI backend
.\venv\Scripts\uvicorn backend.app.main:app --reload --port 8000
```
Backend API will be running at [http://localhost:8000](http://localhost:8000) (Interactive Swagger Docs at `/docs`).

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Frontend application will be accessible at [http://localhost:5173](http://localhost:5173).

---

## 📁 Project Structure

```
Expense-Tracker/
├── backend/
│   ├── app/
│   │   ├── database.py             # SQLite database configuration
│   │   ├── models.py               # SQLAlchemy ORM models
│   │   ├── schemas.py              # Pydantic schemas
│   │   ├── seed.py                 # Initial category seed data
│   │   ├── main.py                 # FastAPI application root
│   │   ├── parser/
│   │   │   ├── transaction_parser.py # Rule-based regex parser
│   │   │   ├── date_parser.py        # Relative date parsing
│   │   │   └── category_resolver.py  # Alias and fuzzy matching
│   │   ├── routes/                 # API endpoints (chat, transactions, categories, analytics)
│   │   └── services/               # Transaction & Analytics services
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   ├── manifest.webmanifest    # PWA configuration
│   │   ├── sw.js                   # Service worker for offline caching
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/             # BottomNav, ChatMessage, DaySummary
│   │   ├── pages/                  # ChatPage, CalendarPage, AnalyticsPage, SettingsPage
│   │   ├── services/api.js         # API client
│   │   ├── utils/formatCurrency.js # INR currency & date formatting
│   │   └── index.css               # Comprehensive mobile design system
│   ├── package.json
│   └── vite.config.js
└── README.md
```
