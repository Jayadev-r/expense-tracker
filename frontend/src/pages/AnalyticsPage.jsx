import { useState, useEffect } from 'react';
import { getWeeklySummary, getMonthlySummary } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const PERIOD_TABS = ['Week', 'Month'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('Month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      if (period === 'Week') {
        const result = await getWeeklySummary();
        setData(result);
      } else {
        const result = await getMonthlySummary();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="analytics-page">
        <h1 className="page-title">Analytics</h1>
        <div className="period-tabs">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab}
              className={`period-tab${period === tab ? ' active' : ''}`}
              onClick={() => setPeriod(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="chat-messages-empty">
          <p className="empty-title loading">Loading...</p>
        </div>
      </div>
    );
  }

  const income = Number(data.total_income || 0);
  const expenses = Number(data.total_expenses || 0);
  const net = Number(data.net_balance || 0);
  const savingsRate = data.savings_rate || 0;
  const txnCount = data.transaction_count || 0;

  // Pie chart data
  const pieData = (data.expense_breakdown || []).map((item) => ({
    name: item.category_name,
    value: Number(item.total),
    color: item.color || '#ADB5BD',
    percentage: item.percentage,
  }));

  // Daily spending bar chart data
  const barData = (data.daily_summaries || []).map((d) => {
    const dateObj = new Date(d.date + 'T00:00:00');
    return {
      name: dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      shortName: dateObj.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2),
      expenses: Number(d.expenses),
      income: Number(d.income),
    };
  });

  const periodLabel = period === 'Week'
    ? 'This Week'
    : new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const hasData = txnCount > 0;

  return (
    <div className="analytics-page">
      <h1 className="page-title">Analytics</h1>

      {/* Period Tabs */}
      <div className="period-tabs" role="tablist">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={period === tab}
            className={`period-tab${period === tab ? ' active' : ''}`}
            onClick={() => setPeriod(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="chat-messages-empty">
          <div className="empty-icon" aria-hidden="true">📊</div>
          <p className="empty-title">No data yet</p>
          <p className="empty-subtitle">Add a few transactions to see your spending insights</p>
        </div>
      ) : (
        <>
          {/* Period Label */}
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-lg)', fontWeight: 500 }}>
            {periodLabel}
          </p>

          {/* Overview Cards */}
          <div className="analytics-overview">
            <div className="analytics-card">
              <div className="card-label">Income</div>
              <div className="card-value" style={{ color: 'var(--color-income)' }}>
                {formatCurrency(income, income >= 100000)}
              </div>
            </div>
            <div className="analytics-card">
              <div className="card-label">Expenses</div>
              <div className="card-value" style={{ color: 'var(--color-expense)' }}>
                {formatCurrency(expenses, expenses >= 100000)}
              </div>
            </div>
            <div className="analytics-card">
              <div className="card-label">Net Balance</div>
              <div className="card-value" style={{ color: net >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                {formatCurrency(net, Math.abs(net) >= 100000)}
              </div>
              {period === 'Month' && savingsRate > 0 && (
                <div className="card-subtext">
                  Savings rate: {savingsRate.toFixed(1)}%
                </div>
              )}
            </div>
            <div className="analytics-card">
              <div className="card-label">Transactions</div>
              <div className="card-value">{txnCount}</div>
            </div>
          </div>

          {/* Expense by Category — Donut Chart */}
          {pieData.length > 0 && (
            <div className="chart-section">
              <h3 className="chart-title">Expense by Category</h3>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown List */}
              <div className="category-breakdown-list">
                {pieData.map((item) => (
                  <div key={item.name} className="category-breakdown-item">
                    <span className="category-color-dot" style={{ backgroundColor: item.color }} />
                    <div className="category-breakdown-info">
                      <div className="category-breakdown-name">{item.name}</div>
                      <div className="category-breakdown-bar">
                        <div
                          className="category-breakdown-bar-fill"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="category-breakdown-amount">{formatCurrency(item.value)}</div>
                      <div className="category-breakdown-pct">{item.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Spending Bar Chart */}
          {barData.length > 0 && (
            <div className="chart-section">
              <h3 className="chart-title">Daily Spending</h3>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                    <XAxis
                      dataKey={period === 'Week' ? 'shortName' : 'name'}
                      tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                      axisLine={false}
                      tickLine={false}
                      interval={period === 'Month' ? Math.floor(barData.length / 8) : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCurrency(v, true).replace('₹', '')}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                    />
                    <Bar dataKey="expenses" fill="var(--color-expense)" radius={[4, 4, 0, 0]} name="Expenses" />
                    <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} name="Income" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Largest Expense */}
          {data.largest_expense && (
            <div className="chart-section">
              <h3 className="chart-title">Largest Expense</h3>
              <div className="transaction-item" style={{ border: 'none', padding: 'var(--space-sm) 0' }}>
                <div className="transaction-info">
                  <div className="transaction-category">{data.largest_expense.category_name}</div>
                  {data.largest_expense.note && (
                    <div className="transaction-note">{data.largest_expense.note}</div>
                  )}
                </div>
                <div className="transaction-amount expense">
                  {formatCurrency(Number(data.largest_expense.amount))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
