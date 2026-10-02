import { formatCurrency } from '../utils/formatCurrency';

/**
 * A single chat message bubble — either user input or system confirmation.
 */
export default function ChatMessage({ message, onUndo, onCategorySelect }) {
  if (message.type === 'user') {
    return (
      <div className="chat-bubble user" role="log">
        <div className="bubble-content">{message.text}</div>
      </div>
    );
  }

  // System message — success confirmation
  if (message.type === 'success') {
    const txn = message.transaction;
    return (
      <div className="chat-bubble system" role="status">
        <div className="bubble-content">
          <div className="confirmation-row">
            <span className="confirmation-check" aria-hidden="true">✓</span>
            <span className="confirmation-text">{message.text}</span>
          </div>
          {txn && (
            <div className="confirmation-details">
              <span
                className={`confirmation-category-tag ${txn.type}`}
                style={{ '--cat-color': message.categoryColor }}
              >
                {message.categoryIcon} {txn.category_name}
              </span>
              <span>•</span>
              <span>{message.dateLabel}</span>
            </div>
          )}
          {onUndo && message.canUndo && (
            <button
              className={`undo-btn${message.undoExpired ? ' hidden' : ''}`}
              onClick={() => onUndo(message.transactionId)}
              aria-label="Undo this transaction"
            >
              Undo
            </button>
          )}
        </div>
      </div>
    );
  }

  // System message — error
  if (message.type === 'error') {
    return (
      <div className="chat-bubble system error" role="alert">
        <div className="bubble-content">
          <span className="confirmation-text">{message.text}</span>
        </div>
      </div>
    );
  }

  // System message — needs category selection
  if (message.type === 'category-prompt') {
    return (
      <div className="chat-bubble system" role="status">
        <div className="bubble-content">
          <p className="category-select-prompt">{message.text}</p>
          <div className="category-select-grid">
            {message.categories?.map((cat) => (
              <button
                key={cat.id}
                className="category-select-btn"
                onClick={() => onCategorySelect(message.originalMessage, cat.id)}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
