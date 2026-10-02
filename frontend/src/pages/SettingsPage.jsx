import { useState, useEffect, useRef } from 'react';
import { getCategories, createCategory, deleteCategory, getTransactions, importTransactions, clearAllTransactions } from '../services/api';

export default function SettingsPage() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [categoryTypeTab, setCategoryTypeTab] = useState('expense');
  const [categories, setCategories] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState({ text: '', type: 'success' });
  const fileInputRef = useRef(null);

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [newCatAliases, setNewCatAliases] = useState('');
  const [catError, setCatError] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // Apply theme
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load categories
  useEffect(() => {
    loadCategoryList();
  }, []);

  async function loadCategoryList() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  function showMessage(text, type = 'success') {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage({ text: '', type: 'success' }), 3500);
  }

  function applyTheme(t) {
    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (t === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }

  function cycleTheme() {
    const themes = ['light', 'dark', 'system'];
    const currentIdx = themes.indexOf(theme);
    const nextTheme = themes[(currentIdx + 1) % themes.length];
    setTheme(nextTheme);
  }

  // Export handlers
  async function handleExport(format) {
    setShowExportMenu(false);
    try {
      const transactions = await getTransactions({ limit: 500 });
      if (format === 'csv') {
        exportCSV(transactions);
      } else {
        exportJSON(transactions);
      }
      showMessage(`Exported ${transactions.length} transactions as ${format.toUpperCase()}`);
    } catch (err) {
      showMessage('Export failed. Please try again.', 'error');
    }
  }

  function exportCSV(transactions) {
    const header = 'Date,Type,Category,Amount,Note,Original Input';
    const rows = transactions.map((t) =>
      [
        t.transaction_date,
        t.type,
        `"${t.category_name}"`,
        t.amount,
        `"${t.note || ''}"`,
        `"${t.original_input || ''}"`,
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    downloadFile(csv, 'expense-tracker-export.csv', 'text/csv');
  }

  function exportJSON(transactions) {
    const json = JSON.stringify(transactions, null, 2);
    downloadFile(json, 'expense-tracker-export.json', 'application/json');
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import handler
  async function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        let itemsToImport = [];

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          const rawItems = Array.isArray(parsed) ? parsed : [parsed];
          itemsToImport = rawItems.map((item) => ({
            amount: Number(item.amount),
            type: item.type || 'expense',
            category_id: item.category_id || (categories.find(c => c.name.toLowerCase() === (item.category_name || item.category || '').toLowerCase())?.id) || 'others',
            transaction_date: item.transaction_date || item.date || new Date().toISOString().split('T')[0],
            note: item.note || null,
            original_input: item.original_input || `Import: ${item.type || 'expense'} ${item.amount}`,
          }));
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          if (lines.length > 1) {
            // Assume format Date,Type,Category,Amount,Note,...
            for (let i = 1; i < lines.length; i++) {
              const parts = lines[i].split(',').map((p) => p.replace(/^"|"$/g, '').trim());
              if (parts.length >= 4) {
                const date = parts[0];
                const type = parts[1].toLowerCase() === 'income' ? 'income' : 'expense';
                const catName = parts[2];
                const amount = parseFloat(parts[3]);
                const note = parts[4] || null;
                const matchedCat = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
                if (!isNaN(amount) && amount > 0) {
                  itemsToImport.push({
                    amount,
                    type,
                    category_id: matchedCat ? matchedCat.id : 'others',
                    transaction_date: date || new Date().toISOString().split('T')[0],
                    note,
                    original_input: `CSV Import: ${catName} ${amount}`,
                  });
                }
              }
            }
          }
        }

        if (itemsToImport.length === 0) {
          showMessage('No valid transactions found in file', 'error');
          return;
        }

        const res = await importTransactions(itemsToImport);
        showMessage(`Successfully imported ${res.imported} of ${res.total} transactions!`);
      } catch (err) {
        console.error('Import error:', err);
        showMessage('Failed to import file. Check format and try again.', 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }

  // Clear All Data
  async function handleClearAll() {
    try {
      await clearAllTransactions();
      setShowClearConfirm(false);
      showMessage('All transaction data cleared');
    } catch (err) {
      showMessage('Failed to clear data', 'error');
    }
  }

  // Add Custom Category
  async function handleCreateCategory(e) {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCatError('Please enter a category name');
      return;
    }
    setSavingCat(true);
    setCatError('');
    try {
      const aliasList = newCatAliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      await createCategory({
        name: newCatName.trim(),
        icon: newCatIcon || '🏷️',
        type: categoryTypeTab,
        aliases: aliasList,
      });
      setShowAddCategoryModal(false);
      setNewCatName('');
      setNewCatAliases('');
      showMessage(`Added "${newCatName.trim()}" category!`);
      await loadCategoryList();
    } catch (err) {
      setCatError(err.message || 'Failed to create category');
    } finally {
      setSavingCat(false);
    }
  }

  async function handleDeleteCategory(cat) {
    if (cat.is_default) {
      showMessage('Cannot delete default categories', 'error');
      return;
    }
    if (window.confirm(`Delete category "${cat.name}"?`)) {
      try {
        await deleteCategory(cat.id);
        showMessage(`Deleted category "${cat.name}"`);
        await loadCategoryList();
      } catch (err) {
        showMessage(err.message || 'Failed to delete category', 'error');
      }
    }
  }

  const themeLabels = { light: 'Light', dark: 'Dark', system: 'System' };
  const filteredCategories = categories.filter((c) => c.type === categoryTypeTab && c.is_active);

  return (
    <div className="settings-page">
      <h1 className="page-title">Settings</h1>

      {feedbackMessage.text && (
        <div style={{
          padding: 'var(--space-md) var(--space-lg)',
          background: feedbackMessage.type === 'error' ? 'var(--color-expense-bg)' : 'var(--color-success-bg)',
          color: feedbackMessage.type === 'error' ? 'var(--color-expense)' : 'var(--color-income)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          marginBottom: 'var(--space-lg)',
          animation: 'fadeIn var(--transition-fast) forwards',
        }}>
          {feedbackMessage.text}
        </div>
      )}

      {/* Appearance */}
      <div className="settings-section">
        <div className="settings-section-title">Appearance</div>
        <div className="settings-group">
          <div className="settings-item" onClick={cycleTheme}>
            <div className="settings-item-left">
              <span className="settings-item-icon">🎨</span>
              <span className="settings-item-label">Theme</span>
            </div>
            <span className="settings-item-value">{themeLabels[theme]}</span>
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <span className="settings-item-icon">💱</span>
              <span className="settings-item-label">Currency</span>
            </div>
            <span className="settings-item-value">INR (₹)</span>
          </div>
        </div>
      </div>

      {/* Categories Management */}
      <div className="settings-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div className="settings-section-title" style={{ margin: 0 }}>Categories</div>
          <button
            className="btn btn-primary"
            style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)', borderRadius: 'var(--radius-full)' }}
            onClick={() => {
              setCatError('');
              setShowAddCategoryModal(true);
            }}
          >
            + Add Custom
          </button>
        </div>

        {/* Expense / Income Category Toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => setCategoryTypeTab('expense')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: categoryTypeTab === 'expense' ? 'var(--color-expense)' : 'var(--color-card)',
              color: categoryTypeTab === 'expense' ? '#fff' : 'var(--color-text)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Expenses ({categories.filter((c) => c.type === 'expense' && c.is_active).length})
          </button>
          <button
            onClick={() => setCategoryTypeTab('income')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: categoryTypeTab === 'income' ? 'var(--color-income)' : 'var(--color-card)',
              color: categoryTypeTab === 'income' ? '#fff' : 'var(--color-text)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Income ({categories.filter((c) => c.type === 'income' && c.is_active).length})
          </button>
        </div>

        {/* Categories List */}
        <div className="settings-group" style={{ maxHeight: '240px', overflowY: 'auto' }}>
          {filteredCategories.map((cat) => (
            <div key={cat.id} className="settings-item">
              <div className="settings-item-left">
                <span className="settings-item-icon">{cat.icon}</span>
                <span className="settings-item-label">{cat.name}</span>
                {cat.is_default && (
                  <span style={{ fontSize: '10px', opacity: 0.6, background: 'var(--color-card-secondary)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>
                    Default
                  </span>
                )}
              </div>
              {!cat.is_default && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(cat);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-expense)', cursor: 'pointer', fontSize: '14px' }}
                  title="Delete category"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="settings-section">
        <div className="settings-section-title">Data Management</div>
        <div className="settings-group">
          {/* Export */}
          <div className="settings-item" onClick={() => setShowExportMenu(true)}>
            <div className="settings-item-left">
              <span className="settings-item-icon">📤</span>
              <span className="settings-item-label">Export Data (CSV / JSON)</span>
            </div>
            <span className="settings-item-chevron">›</span>
          </div>

          {/* Import */}
          <div className="settings-item" onClick={() => fileInputRef.current?.click()}>
            <div className="settings-item-left">
              <span className="settings-item-icon">📥</span>
              <span className="settings-item-label">Import Data (CSV / JSON)</span>
            </div>
            <span className="settings-item-chevron">›</span>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".csv,.json"
            style={{ display: 'none' }}
          />

          {/* Clear All */}
          <div className="settings-item danger" onClick={() => setShowClearConfirm(true)}>
            <div className="settings-item-left">
              <span className="settings-item-icon">🗑️</span>
              <span className="settings-item-label">Clear All Data</span>
            </div>
            <span className="settings-item-chevron">›</span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <div className="settings-section-title">About</div>
        <div className="settings-group">
          <div className="settings-item">
            <div className="settings-item-left">
              <span className="settings-item-icon">ℹ️</span>
              <span className="settings-item-label">Version</span>
            </div>
            <span className="settings-item-value">1.0.0 (PWA Ready)</span>
          </div>
        </div>
      </div>

      {/* Export Format Modal */}
      {showExportMenu && (
        <div className="modal-overlay" onClick={() => setShowExportMenu(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Export Data</h3>
            <p className="modal-subtitle">Choose export format</p>
            <div className="modal-actions" style={{ flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-primary" onClick={() => handleExport('csv')}>
                📄 Export as CSV
              </button>
              <button className="btn btn-secondary" onClick={() => handleExport('json')}>
                📋 Export as JSON
              </button>
              <button className="btn btn-secondary" onClick={() => setShowExportMenu(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Category Modal */}
      {showAddCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowAddCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <h3 className="modal-title">Add Custom Category</h3>

            {catError && (
              <div style={{ color: 'var(--color-expense)', fontSize: 'var(--font-size-xs)', marginBottom: '8px' }}>
                {catError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gym, Freelance, Pet"
                  className="input-field"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  className="input-field"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  style={{ width: '80px', textAlign: 'center', fontSize: '18px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Keywords / Aliases (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. fitness, workout, trainer"
                  className="input-field"
                  value={newCatAliases}
                  onChange={(e) => setNewCatAliases(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingCat}>
                  {savingCat ? 'Saving...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete all transactions?</h3>
            <p className="modal-subtitle">This action cannot be undone. All your transaction records will be permanently deleted.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleClearAll}>
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
