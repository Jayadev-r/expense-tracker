import { formatCurrency } from '../utils/formatCurrency';

export default function DaySummary({ summary }) {
  const income = Number(summary?.income || 0);
  const expenses = Number(summary?.expenses || 0);
  const net = income - expenses;

  return (
    <div className="today-summary" role="region" aria-label="Today's summary">
      <div className="summary-card">
        <div className="summary-label">Spent</div>
        <div className={`summary-value expense`}>
          {formatCurrency(expenses, expenses >= 100000)}
        </div>
      </div>
      <div className="summary-card">
        <div className="summary-label">Income</div>
        <div className={`summary-value income`}>
          {formatCurrency(income, income >= 100000)}
        </div>
      </div>
      <div className="summary-card">
        <div className="summary-label">Net</div>
        <div className={`summary-value net ${net >= 0 ? 'positive' : 'negative'}`}>
          {formatCurrency(net, Math.abs(net) >= 100000)}
        </div>
      </div>
    </div>
  );
}
