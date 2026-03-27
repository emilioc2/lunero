'use client';

interface RecurringSuggestionBannerProps {
  /** Category name detected as a recurring pattern (3+ consecutive periods) */
  categoryName: string;
  onConvert: () => void;
  onDismiss: () => void;
}

/**
 * Banner shown when the backend detects the same amount+category
 * has been manually entered in 3+ consecutive periods (Requirement 4.7).
 */
export function RecurringSuggestionBanner({
  categoryName,
  onConvert,
  onDismiss,
}: RecurringSuggestionBannerProps) {
  return (
    <div role="status" aria-live="polite" className="suggestion-banner">
      <div className="suggestion-content">
        <span className="suggestion-icon" aria-hidden="true">↻</span>
        <p className="suggestion-text">
          Looks like <strong>{categoryName}</strong> is a regular expense. Want to make it recurring?
        </p>
      </div>
      <div className="suggestion-actions">
        <button
          type="button"
          onClick={onConvert}
          aria-label={`Make ${categoryName} a recurring entry`}
          className="suggestion-btn-primary"
        >
          Make recurring
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss suggestion"
          className="suggestion-btn-dismiss"
        >
          Dismiss
        </button>
      </div>

      <style>{`
        .suggestion-banner {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
          background: #F5F0E8; border: 1px solid #C4A484;
          border-radius: 10px; padding: 14px 16px;
        }
        .suggestion-content { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .suggestion-icon { font-size: 18px; color: #C4A484; flex-shrink: 0; }
        .suggestion-text { font-size: 14px; color: #44403C; margin: 0; line-height: 1.4; }
        .suggestion-text strong { font-weight: 600; }
        .suggestion-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .suggestion-btn-primary {
          padding: 6px 14px; border-radius: 8px; border: none;
          background: #C4A484; color: #FAFAF9;
          font-size: 13px; font-weight: 500; cursor: pointer;
        }
        .suggestion-btn-primary:hover { background: #b8956f; }
        .suggestion-btn-primary:focus-visible { outline: 2px solid #C4A484; outline-offset: 2px; }
        .suggestion-btn-dismiss {
          padding: 6px 14px; border-radius: 8px;
          border: 1px solid #C4A484; background: transparent;
          color: #78716C; font-size: 13px; cursor: pointer;
        }
        .suggestion-btn-dismiss:hover { background: #EDE8DF; }
        .suggestion-btn-dismiss:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
      `}</style>
    </div>
  );
}
