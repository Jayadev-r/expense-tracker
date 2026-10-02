import { useState, useEffect } from 'react';
import { getTransactions, deleteTransaction, createTransaction, updateTransaction, getCategories } from '../services/api';
import { formatCurrency, getLocalDateStr } from '../utils/formatCurrency';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  });
  const [monthTransactions, setMonthTransactions] = useState([]);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'expense' | 'income'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category_id: '',
    transaction_date: '',
    note: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Load categories
  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  // Load month transactions
  useEffect(() => {
    loadMonthTransactions();
  }, [year, month]);

  useEffect(() => {
    loadSelectedDayTransactions();
  }, [selectedDate, monthTransactions]);

  async function loadMonthTransactions() {
    try {
      const lastDay = new Date(year, month + 1, 0);
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const txns = await getTransactions({ from, to, limit: 300 });
      setMonthTransactions(txns);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  }

  function loadSelectedDayTransactions() {
    const selStr = getLocalDateStr(selectedDate);
    const filtered = monthTransactions.filter((t) => t.transaction_date === selStr);
    setSelectedTransactions(filtered);
  }

  // Calculate daily totals for calendar indicators
  const dailyTotals = {};
  monthTransactions.forEach((t) => {
    if (!dailyTotals[t.transaction_date]) {
      dailyTotals[t.transaction_date] = { income: 0, expenses: 0 };
    }
    const amount = Number(t.amount);
    if (t.type === 'income') {
      dailyTotals[t.transaction_date].income += amount;
    } else {
      dailyTotals[t.transaction_date].expenses += amount;
    }
  });

  const calendarDays = generateCalendarDays(year, month);
  const todayStr = getLocalDateStr(new Date());
  const selectedStr = getLocalDateStr(selectedDate);

  // Selected day totals
  const selDayIncome = selectedTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const selDayExpenses = selectedTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const selDayNet = selDayIncome - selDayExpenses;

  const selectedDateLabel = selectedDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function handleDayClick(day) {
    if (day.otherMonth) {
      setCurrentDate(new Date(day.year, day.month, 1));
    }
    // Set to local noon (12:00:00) to prevent any midnight UTC/DST boundary shift
    setSelectedDate(new Date(day.year, day.month, day.day, 12, 0, 0));
  }

  // Filtered transactions for selected day
  const filteredTransactions = selectedTransactions.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = t.category_name?.toLowerCase().includes(q);
      const matchNote = t.note?.toLowerCase().includes(q);
      const matchAmt = String(t.amount).includes(q);
      return matchCat || matchNote || matchAmt;
    }
    return true;
  });

  // Open Add Modal
  function handleOpenAdd() {
    const selStr = getLocalDateStr(selectedDate);
    const defaultCat = categories.find((c) => c.type === 'expense');
    setFormData({
      type: 'expense',
      amount: '',
      category_id: defaultCat ? defaultCat.id : '',
      transaction_date: selStr,
      note: '',
    });
    setFormError('');
    setShowAddModal(true);
  }

  // Open Edit Modal
  function handleOpenEdit(txn) {
    setEditingTxn(txn);
    setFormData({
      type: txn.type,
      amount: String(txn.amount),
      category_id: txn.category_id,
      transaction_date: txn.transaction_date,
      note: txn.note || '',
    });
    setFormError('');
  }

  // Submit Add
  async function handleAddSubmit(e) {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      setFormError('Please enter a valid amount');
      return;
    }
    if (!formData.category_id) {
      setFormError('Please select a category');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await createTransaction({
        type: formData.type,
        amount: Number(formData.amount),
        category_id: formData.category_id,
        transaction_date: formData.transaction_date,
        note: formData.note.trim() || null,
        original_input: `Manual: ${formData.type} ${formData.amount}`,
      });
      setShowAddModal(false);
      await loadMonthTransactions();
    } catch (err) {
      setFormError(err.message || 'Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  }

  // Submit Edit
  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      setFormError('Please enter a valid amount');
      return;
    }
    if (!formData.category_id) {
      setFormError('Please select a category');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await updateTransaction(editingTxn.id, {
        type: formData.type,
        amount: Number(formData.amount),
        category_id: formData.category_id,
        transaction_date: formData.transaction_date,
        note: formData.note.trim() || null,
      });
      setEditingTxn(null);
      await loadMonthTransactions();
    } catch (err) {
      setFormError(err.message || 'Failed to update transaction');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Delete
  async function handleDelete(id) {
    try {
      await deleteTransaction(id);
      setDeleteConfirmId(null);
      setEditingTxn(null);
      await loadMonthTransactions();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  const availableCategories = categories.filter((c) => c.type === formData.type);

  return (
    <div className="calendar-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Calendar</h1>
        <button
          type="button"
          className="header-add-btn"
          onClick={handleOpenAdd}
          title="Add Expense or Income"
          aria-label="Add transaction"
        >
          +
        </button>
      </div>

      {/* Month Navigation */}
      <div className="calendar-nav">
        <button className="calendar-nav-btn" onClick={prevMonth} aria-label="Previous month">
          ‹
        </button>
        <span className="month-label">{monthLabel}</span>
        <button className="calendar-nav-btn" onClick={nextMonth} aria-label="Next month">
          ›
        </button>
      </div>

      {/* Day Headers */}
      <div className="calendar-grid">
        {DAY_NAMES.map((d) => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map((day, i) => {
          const dayStr = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
          const totals = dailyTotals[dayStr];
          const isToday = dayStr === todayStr;
          const isSelected = dayStr === selectedStr;

          return (
            <button
              key={i}
              className={`calendar-day${day.otherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
              onClick={() => handleDayClick(day)}
              aria-label={`${day.day}, ${totals ? `₹${totals.expenses} spent` : 'no transactions'}`}
            >
              <span className="day-number">{day.day}</span>
              {totals && totals.expenses > 0 && (
                <span className="day-indicator">
                  {formatCurrency(totals.expenses, true).replace('₹', '')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Detail */}
      <div className="date-detail">
        <div className="date-detail-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <h2 className="date-detail-title" style={{ margin: 0 }}>{selectedDateLabel}</h2>
          <button
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: 'var(--font-size-sm)', borderRadius: 'var(--radius-full)' }}
            onClick={handleOpenAdd}
          >
            + Add
          </button>
        </div>

        <div className="date-summary-row">
          <div className="summary-card">
            <div className="summary-label">Income</div>
            <div className="summary-value income">{formatCurrency(selDayIncome)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Spent</div>
            <div className="summary-value expense">{formatCurrency(selDayExpenses)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Net</div>
            <div className={`summary-value net ${selDayNet >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(selDayNet)}
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ marginTop: 'var(--space-md)', marginBottom: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="🔍 Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', fontSize: 'var(--font-size-sm)' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'expense', 'income'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: typeFilter === t ? 'var(--color-primary)' : 'var(--color-card)',
                  color: typeFilter === t ? '#ffffff' : 'var(--color-text-secondary)',
                  fontWeight: typeFilter === t ? 600 : 400,
                  fontSize: 'var(--font-size-xs)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {t === 'all' ? 'All' : t === 'expense' ? 'Expenses' : 'Income'}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        {filteredTransactions.length === 0 ? (
          <div className="chat-messages-empty" style={{ padding: '24px 0' }}>
            <p className="empty-title">No transactions</p>
            <p className="empty-subtitle">
              {searchQuery || typeFilter !== 'all' ? 'No matching transactions' : 'No transactions recorded on this date'}
            </p>
          </div>
        ) : (
          <div className="transaction-list">
            {filteredTransactions.map((txn) => (
              <div
                key={txn.id}
                className="transaction-item"
                onClick={() => handleOpenEdit(txn)}
                role="button"
                tabIndex={0}
                aria-label={`${txn.category_name} ${formatCurrency(txn.amount)}`}
                style={{ cursor: 'pointer' }}
              >
                <div
                  className="transaction-icon"
                  style={{ backgroundColor: `${txn.type === 'income' ? 'var(--color-income-bg)' : 'var(--color-expense-bg)'}` }}
                >
                  {txn.type === 'income' ? '📈' : '📉'}
                </div>
                <div className="transaction-info">
                  <div className="transaction-category">{txn.category_name}</div>
                  {txn.note && <div className="transaction-note">{txn.note}</div>}
                </div>
                <div className={`transaction-amount ${txn.type}`}>
                  {txn.type === 'income' ? '+' : '-'}{formatCurrency(Number(txn.amount))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <h3 className="modal-title">Add Transaction</h3>
            
            {formError && (
              <div style={{ color: 'var(--color-expense)', fontSize: 'var(--font-size-xs)', marginBottom: '8px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Type Switcher */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const firstCat = categories.find((c) => c.type === 'expense');
                    setFormData({ ...formData, type: 'expense', category_id: firstCat?.id || '' });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: formData.type === 'expense' ? 'var(--color-expense)' : 'var(--color-card-secondary)',
                    color: formData.type === 'expense' ? '#fff' : 'var(--color-text)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstCat = categories.find((c) => c.type === 'income');
                    setFormData({ ...formData, type: 'income', category_id: firstCat?.id || '' });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: formData.type === 'income' ? 'var(--color-income)' : 'var(--color-card-secondary)',
                    color: formData.type === 'income' ? '#fff' : 'var(--color-text)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Income
                </button>
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="input-field"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  required
                  className="input-field"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Date
                </label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* Note */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Note (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lunch with friends"
                  className="input-field"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Detail Modal */}
      {editingTxn && (
        <div className="modal-overlay" onClick={() => setEditingTxn(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <h3 className="modal-title">Edit Transaction</h3>

            {formError && (
              <div style={{ color: 'var(--color-expense)', fontSize: 'var(--font-size-xs)', marginBottom: '8px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Type Switcher */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const firstCat = categories.find((c) => c.type === 'expense');
                    setFormData({ ...formData, type: 'expense', category_id: firstCat?.id || '' });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: formData.type === 'expense' ? 'var(--color-expense)' : 'var(--color-card-secondary)',
                    color: formData.type === 'expense' ? '#fff' : 'var(--color-text)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstCat = categories.find((c) => c.type === 'income');
                    setFormData({ ...formData, type: 'income', category_id: firstCat?.id || '' });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: formData.type === 'income' ? 'var(--color-income)' : 'var(--color-card-secondary)',
                    color: formData.type === 'income' ? '#fff' : 'var(--color-text)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Income
                </button>
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-field"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  required
                  className="input-field"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Date
                </label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* Note */}
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Note (optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setDeleteConfirmId(editingTxn.id)}
                  style={{ flex: 1 }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingTxn(null)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? '...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete this transaction?</h3>
            <p className="modal-subtitle">This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirmId)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        className="fab-add-btn"
        onClick={handleOpenAdd}
        title="Add Expense or Income"
        aria-label="Add transaction"
      >
        +
      </button>
    </div>
  );
}

/**
 * Generate calendar grid for a month (Mon–Sun weeks)
 */
function generateCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days = [];

  const prevMonthLast = new Date(year, month, 0);
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthLast.getDate() - i;
    days.push({
      day: d,
      month: month - 1 < 0 ? 11 : month - 1,
      year: month - 1 < 0 ? year - 1 : year,
      otherMonth: true,
    });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ day: d, month, year, otherMonth: false });
  }

  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push({
        day: d,
        month: month + 1 > 11 ? 0 : month + 1,
        year: month + 1 > 11 ? year + 1 : year,
        otherMonth: true,
      });
    }
  }

  return days;
}
