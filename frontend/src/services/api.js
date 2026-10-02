/**
 * API client for the Expense Tracker backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Something went wrong');
  }

  return response.json();
}

// ── Chat ──────────────────────────────────────────────

export async function sendChatMessage(message) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function sendChatWithCategory(message, categoryId) {
  return request('/chat/with-category', {
    method: 'POST',
    body: JSON.stringify({ message, category_id: categoryId }),
  });
}

// ── Transactions ──────────────────────────────────────

export async function getTransactions(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.date) searchParams.set('date', params.date);
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);
  if (params.type) searchParams.set('type', params.type);
  if (params.category_id) searchParams.set('category_id', params.category_id);
  if (params.search) searchParams.set('search', params.search);
  if (params.limit) searchParams.set('limit', params.limit);
  if (params.offset) searchParams.set('offset', params.offset);

  const qs = searchParams.toString();
  return request(`/transactions${qs ? '?' + qs : ''}`);
}

export async function getTodaySummary() {
  return request('/transactions/today');
}

export async function createTransaction(data) {
  return request('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTransaction(id, data) {
  return request(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id) {
  return request(`/transactions/${id}`, {
    method: 'DELETE',
  });
}

export async function importTransactions(items) {
  return request('/transactions/import', {
    method: 'POST',
    body: JSON.stringify(items),
  });
}

export async function clearAllTransactions() {
  return request('/transactions/clear-all', {
    method: 'POST',
  });
}

// ── Categories ────────────────────────────────────────

export async function getCategories(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);
  const qs = searchParams.toString();
  return request(`/categories${qs ? '?' + qs : ''}`);
}

export async function getFrequentCategories(limit = 6) {
  return request(`/categories/frequent?limit=${limit}`);
}

export async function createCategory(data) {
  return request('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id, data) {
  return request(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id) {
  return request(`/categories/${id}`, {
    method: 'DELETE',
  });
}

// ── Analytics ─────────────────────────────────────────

export async function getWeeklySummary(date) {
  const qs = date ? `?date=${date}` : '';
  return request(`/analytics/weekly${qs}`);
}

export async function getMonthlySummary(year, month) {
  const params = new URLSearchParams();
  if (year) params.set('year', year);
  if (month) params.set('month', month);
  const qs = params.toString();
  return request(`/analytics/monthly${qs ? '?' + qs : ''}`);
}

export async function getCategoryAnalytics(categoryId, year, month) {
  const params = new URLSearchParams();
  if (year) params.set('year', year);
  if (month) params.set('month', month);
  const qs = params.toString();
  return request(`/analytics/category/${categoryId}${qs ? '?' + qs : ''}`);
}
