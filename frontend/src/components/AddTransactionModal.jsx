import { useState, useEffect } from 'react';
import { createTransaction, getCategories } from '../services/api';

export default function AddTransactionModal({ isOpen, onClose, onSuccess, initialDate }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(() => initialDate || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setDate(initialDate || new Date().toISOString().split('T')[0]);
      setAmount('');
      setNote('');
      setError('');
    }
  }, [isOpen, initialDate]);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
      const firstCat = data.find((c) => c.type === type && c.is_active);
      if (firstCat) {
        setCategoryId(firstCat.id);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  function handleTypeChange(newType) {
    setType(newType);
    const firstCat = categories.find((c) => c.type === newType && c.is_active);
    if (firstCat) {
      setCategoryId(firstCat.id);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createTransaction({
        type,
        amount: numAmount,
        category_id: categoryId,
        transaction_date: date,
        note: note.trim() || null,
        original_input: `Manual: ${type} ${numAmount}`,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type && c.is_active);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '390px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Add Transaction</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            color: 'var(--color-expense)',
            fontSize: 'var(--font-size-xs)',
            background: 'var(--color-expense-bg)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '12px',
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Expense / Income Toggle */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--color-card)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: type === 'expense' ? 'var(--color-expense)' : 'transparent',
                color: type === 'expense' ? '#ffffff' : 'var(--color-text-secondary)',
                fontWeight: 600,
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: type === 'income' ? 'var(--color-income)' : 'transparent',
                color: type === 'income' ? '#ffffff' : 'var(--color-text-secondary)',
                fontWeight: 600,
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div>
            <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              required
              autoFocus
              placeholder="0.00"
              className="input-field"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: '18px', fontWeight: 600 }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Category
            </label>
            <select
              required
              className="input-field"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Date
            </label>
            <input
              type="date"
              required
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Note */}
          <div>
            <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Lunch with team, Groceries, Bonus"
              className="input-field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Actions */}
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
