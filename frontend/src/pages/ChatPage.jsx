import { useState, useEffect, useRef, useCallback } from 'react';
import { sendChatMessage, sendChatWithCategory, getTodaySummary, deleteTransaction, getTransactions, getFrequentCategories } from '../services/api';
import { getGreeting, formatDate, getTodayStr } from '../utils/formatCurrency';
import DaySummary from '../components/DaySummary';
import ChatMessage from '../components/ChatMessage';

const UNDO_TIMEOUT_MS = 8000;

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, net: 0, transaction_count: 0 });
  const [quickCategories, setQuickCategories] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const undoTimers = useRef({});

  const todayStr = getTodayStr();
  const today = new Date();
  const dateDisplay = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Load initial data
  useEffect(() => {
    loadSummary();
    loadQuickCategories();
    loadTodayHistory();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadSummary() {
    try {
      const data = await getTodaySummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  }

  async function loadQuickCategories() {
    try {
      const cats = await getFrequentCategories(6);
      setQuickCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  async function loadTodayHistory() {
    try {
      const txns = await getTransactions({ date: todayStr, limit: 50 });
      if (txns.length > 0) {
        // Show recent transactions as history (newest last for chat flow)
        const historyMessages = txns.reverse().flatMap((txn) => [
          {
            id: `hist-user-${txn.id}`,
            type: 'user',
            text: txn.original_input || `${txn.amount} ${txn.category_name}`,
          },
          {
            id: `hist-sys-${txn.id}`,
            type: 'success',
            text: `Added ₹${Number(txn.amount).toLocaleString('en-IN')} to ${txn.category_name}`,
            transaction: txn,
            transactionId: txn.id,
            categoryIcon: '',
            categoryColor: '',
            dateLabel: formatDate(txn.transaction_date),
            canUndo: false,
          },
        ]);
        setMessages(historyMessages);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    // Add user message immediately
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, type: 'user', text }]);
    setInputValue('');
    setSending(true);

    try {
      const response = await sendChatMessage(text);

      if (response.success) {
        const txn = response.transaction;
        const sysMsgId = `sys-${Date.now()}`;

        setMessages((prev) => [
          ...prev,
          {
            id: sysMsgId,
            type: 'success',
            text: response.message,
            transaction: txn,
            transactionId: txn.id,
            categoryIcon: '',
            categoryColor: '',
            dateLabel: formatDate(txn.transaction_date),
            canUndo: true,
            undoExpired: false,
          },
        ]);

        // Refresh summary
        loadSummary();
        loadQuickCategories();

        // Set undo timer
        const timer = setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === sysMsgId ? { ...m, canUndo: false, undoExpired: true } : m
            )
          );
        }, UNDO_TIMEOUT_MS);
        undoTimers.current[txn.id] = timer;
      } else if (response.needs_category) {
        // Ambiguous — show category selection
        setMessages((prev) => [
          ...prev,
          {
            id: `cat-${Date.now()}`,
            type: 'category-prompt',
            text: response.message,
            originalMessage: text,
            categories: response.suggested_categories || [],
          },
        ]);
      } else {
        // Error message
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            type: 'error',
            text: response.message,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'error',
          text: "Couldn't save the transaction. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputValue, sending]);

  const handleUndo = useCallback(async (transactionId) => {
    try {
      await deleteTransaction(transactionId);

      // Clear timer
      if (undoTimers.current[transactionId]) {
        clearTimeout(undoTimers.current[transactionId]);
        delete undoTimers.current[transactionId];
      }

      // Update messages — mark as undone
      setMessages((prev) =>
        prev.map((m) => {
          if (m.transactionId === transactionId && m.type === 'success') {
            return { ...m, type: 'error', text: 'Transaction undone', canUndo: false };
          }
          return m;
        })
      );

      // Refresh summary
      loadSummary();
    } catch (err) {
      console.error('Undo failed:', err);
    }
  }, []);

  const handleCategorySelect = useCallback(async (originalMessage, categoryId) => {
    setSending(true);
    try {
      const response = await sendChatWithCategory(originalMessage, categoryId);

      if (response.success) {
        const txn = response.transaction;
        const sysMsgId = `sys-${Date.now()}`;

        setMessages((prev) => [
          ...prev,
          {
            id: sysMsgId,
            type: 'success',
            text: response.message,
            transaction: txn,
            transactionId: txn.id,
            categoryIcon: '',
            categoryColor: '',
            dateLabel: formatDate(txn.transaction_date),
            canUndo: true,
            undoExpired: false,
          },
        ]);

        loadSummary();
        loadQuickCategories();

        const timer = setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === sysMsgId ? { ...m, canUndo: false, undoExpired: true } : m
            )
          );
        }, UNDO_TIMEOUT_MS);
        undoTimers.current[txn.id] = timer;
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, type: 'error', text: response.message },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, type: 'error', text: "Couldn't save the transaction." },
      ]);
    } finally {
      setSending(false);
    }
  }, []);

  const handleQuickCategory = (catName) => {
    setInputValue((prev) => {
      const trimmed = prev.trim();
      if (trimmed) return `${trimmed} ${catName.toLowerCase()}`;
      return catName.toLowerCase();
    });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cleanup undo timers
  useEffect(() => {
    return () => {
      Object.values(undoTimers.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="chat-page">
      {/* Header */}
      <header className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Trackrr
          </span>
        </div>
        <p className="chat-greeting">{getGreeting()}</p>
        <h1 className="chat-date">{dateDisplay}</h1>
      </header>

      {/* Today's Summary */}
      <DaySummary summary={summary} />

      {/* Messages */}
      <div className="chat-messages" role="log" aria-label="Transaction history" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-messages-empty">
            <div className="empty-icon" aria-hidden="true">💬</div>
            <p className="empty-title">No transactions today</p>
            <p className="empty-subtitle">
              Type something like<br />
              <strong>₹500 food</strong> or <strong>salary 36000</strong>
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onUndo={handleUndo}
              onCategorySelect={handleCategorySelect}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Categories */}
      {quickCategories.length > 0 && (
        <div className="quick-categories" role="toolbar" aria-label="Quick categories">
          {quickCategories.map((cat) => (
            <button
              key={cat.id}
              className="quick-cat-btn"
              onClick={() => handleQuickCategory(cat.name)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Enter expense or income..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            aria-label="Transaction input"
            autoComplete="off"
            enterKeyHint="send"
            id="chat-input"
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            aria-label="Send transaction"
            id="chat-send"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
