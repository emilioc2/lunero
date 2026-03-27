'use client';

import { useState, useMemo } from 'react';
import { TrendChart } from '@lunero/ui';
import type { TrendView, TrendPeriod } from '@lunero/api-client';
import { useTrends, useTrendBreakdown } from '../../../lib/hooks/use-trends';
import { useCategories } from '../../../lib/hooks/use-categories';
import { useProfile } from '../../../lib/hooks/use-profile';
import { formatCurrency, formatDate, sortByLocale } from '../../../lib/locale-utils';

const VIEWS: { value: TrendView; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function TrendsPage() {
  const [view, setView] = useState<TrendView>('monthly');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod | null>(null);

  const { data: profile } = useProfile();
  const { data: categories = [] } = useCategories();
  const currency = profile?.defaultCurrency ?? 'USD';

  const trendParams = useMemo(
    () => ({ view, ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}) }),
    [view, selectedCategoryId],
  );

  // Sort categories locale-aware for the filter dropdown (Requirement 15.4)
  const sortedCategories = sortByLocale(categories, (c) => c.name);

  const { data: trendData, isLoading, error } = useTrends(trendParams);
  const { data: breakdown = [], isLoading: breakdownLoading } = useTrendBreakdown(
    selectedPeriod?.id ?? '',
  );

  const periods = trendData?.periods ?? [];
  const insufficientData = !isLoading && !error && periods.length < 2;

  const handleSelectPeriod = (period: TrendPeriod) => {
    setSelectedPeriod((prev) => (prev?.id === period.id ? null : period));
  };

  return (
    <main className="tr-page" aria-label="Trend views">
      <div className="tr-header">
        <h1 className="tr-heading">Trends</h1>

        {/* View switcher — task 22.2 */}
        <div className="tr-switcher" role="group" aria-label="Trend view">
          {VIEWS.map(({ value: v, label }) => (
            <button
              key={v}
              type="button"
              className={`tr-switch-btn${view === v ? ' tr-switch-btn--active' : ''}`}
              aria-pressed={view === v}
              onClick={() => { setView(v); setSelectedPeriod(null); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter — task 22.4 */}
      <div className="tr-filter">
        <label htmlFor="tr-cat-filter" className="tr-filter-label">Filter by category</label>
        <select
          id="tr-cat-filter"
          className="tr-filter-select"
          value={selectedCategoryId}
          onChange={(e) => { setSelectedCategoryId(e.target.value); setSelectedPeriod(null); }}
          aria-label="Filter trends by category"
        >
          <option value="">All categories</option>
          {sortedCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div role="status" aria-label="Loading trends" className="tr-state">Loading trends…</div>
      )}

      {error && !isLoading && (
        <div role="alert" className="tr-state tr-state--error">
          Could not load trend data. Please refresh the page.
        </div>
      )}

      {/* Insufficient data notice — task 22.5 */}
      {insufficientData && (
        <div className="tr-insufficient" role="status" aria-live="polite">
          <p className="tr-insufficient-msg">
            {periods.length === 0
              ? 'No data yet. Add entries to your FlowSheets to see trends.'
              : 'More data needed for meaningful trends. Keep tracking and check back after another period.'}
          </p>
          {/* Render the single period we do have */}
          {periods.length === 1 && (
            <div className="tr-chart-wrap">
              <TrendChart
                periods={periods}
                currency={currency}
                selectedId={selectedPeriod?.id}
                onSelectPeriod={handleSelectPeriod}
              />
            </div>
          )}
        </div>
      )}

      {/* Chart — tasks 22.1, 22.3 */}
      {!isLoading && !error && periods.length >= 2 && (
        <div className="tr-chart-wrap">
          <TrendChart
            periods={periods}
            currency={currency}
            selectedId={selectedPeriod?.id}
            onSelectPeriod={handleSelectPeriod}
          />
          {selectedPeriod && (
            <p className="tr-drill-hint" aria-live="polite">
              Showing breakdown for <strong>{selectedPeriod.label}</strong>. Click again to deselect.
            </p>
          )}
        </div>
      )}

      {/* Drill-down breakdown — task 22.3 */}
      {selectedPeriod && (
        <section className="tr-breakdown" aria-label={`Entry breakdown for ${selectedPeriod.label}`}>
          <div className="tr-breakdown-header">
            <h2 className="tr-breakdown-title">{selectedPeriod.label}</h2>
            <button
              type="button"
              className="tr-breakdown-close"
              aria-label="Close breakdown"
              onClick={() => setSelectedPeriod(null)}
            >
              ✕
            </button>
          </div>

          <div className="tr-breakdown-summary" role="list" aria-label="Period totals">
            <div role="listitem" className="tr-summary-item tr-summary-item--income">
              <span className="tr-summary-label">Income</span>
              <span className="tr-summary-value">{formatCurrency(selectedPeriod.totalIncome, currency)}</span>
            </div>
            <div role="listitem" className="tr-summary-item tr-summary-item--expense">
              <span className="tr-summary-label">Expenses</span>
              <span className="tr-summary-value">{formatCurrency(selectedPeriod.totalExpenses, currency)}</span>
            </div>
            <div role="listitem" className="tr-summary-item tr-summary-item--savings">
              <span className="tr-summary-label">Savings</span>
              <span className="tr-summary-value">{formatCurrency(selectedPeriod.totalSavings, currency)}</span>
            </div>
          </div>

          {breakdownLoading ? (
            <div role="status" className="tr-state">Loading entries…</div>
          ) : breakdown.length === 0 ? (
            <p className="tr-breakdown-empty">No entries for this period.</p>
          ) : (
            <ul role="list" className="tr-entry-list" aria-label="Entries in period">
              {breakdown.map((entry) => {
                const typeColor =
                  entry.entryType === 'income' ? '#6B6F69'
                  : entry.entryType === 'expense' ? '#C86D5A'
                  : '#C4A484';
                return (
                  <li
                    key={entry.id}
                    role="listitem"
                    className="tr-entry-row"
                    aria-label={`${entry.entryType}: ${formatCurrency(entry.convertedAmount ?? entry.amount, currency)}, ${formatDate(entry.entryDate)}`}
                  >
                    <div className="tr-entry-left">
                      <span className="tr-entry-dot" style={{ background: typeColor }} aria-hidden="true" />
                      <div className="tr-entry-meta">
                        <span className="tr-entry-date">{formatDate(entry.entryDate)}</span>
                        {entry.note && <span className="tr-entry-note">{entry.note}</span>}
                      </div>
                    </div>
                    <span className="tr-entry-amount" style={{ color: typeColor }}>
                      {entry.entryType === 'income' ? '+' : '\u2212'}
                      {formatCurrency(entry.convertedAmount ?? entry.amount, currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <style>{`
        .tr-page { display: flex; flex-direction: column; gap: 24px; max-width: 860px; }
        .tr-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .tr-heading { font-size: 20px; font-weight: 500; color: #1C1917; margin: 0; }
        .tr-switcher { display: flex; border: 1px solid #E7E5E4; border-radius: 8px; overflow: hidden; }
        .tr-switch-btn {
          padding: 7px 16px; font-size: 13px; color: #78716C;
          background: none; border: none; cursor: pointer; transition: background 0.12s, color 0.12s;
        }
        .tr-switch-btn:not(:last-child) { border-right: 1px solid #E7E5E4; }
        .tr-switch-btn--active { background: #1C1917; color: #FAFAF9; font-weight: 500; }
        .tr-switch-btn:hover:not(.tr-switch-btn--active) { background: #F5F5F4; }
        .tr-switch-btn:focus-visible { outline: 2px solid #44403C; outline-offset: -2px; }
        .tr-filter { display: flex; align-items: center; gap: 10px; }
        .tr-filter-label { font-size: 13px; color: #78716C; white-space: nowrap; }
        .tr-filter-select {
          font-size: 13px; color: #1C1917; background: #FFFFFF;
          border: 1px solid #E7E5E4; border-radius: 6px; padding: 6px 10px;
          cursor: pointer; min-width: 160px;
        }
        .tr-filter-select:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .tr-chart-wrap { background: #FFFFFF; border: 1px solid #E7E5E4; border-radius: 12px; padding: 24px; }
        .tr-drill-hint { font-size: 12px; color: #A8A29E; margin: 12px 0 0; }
        .tr-drill-hint strong { color: #78716C; font-weight: 500; }
        .tr-state {
          display: flex; align-items: center; justify-content: center;
          min-height: 160px; font-size: 14px; color: #78716C;
        }
        .tr-state--error { color: #C86D5A; }
        .tr-insufficient { display: flex; flex-direction: column; gap: 20px; }
        .tr-insufficient-msg {
          font-size: 14px; color: #A8A29E; background: #F5F5F4;
          border-radius: 10px; padding: 20px 24px; margin: 0;
        }
        .tr-breakdown {
          background: #FFFFFF; border: 1px solid #E7E5E4; border-radius: 12px;
          padding: 20px 24px; display: flex; flex-direction: column; gap: 16px;
        }
        .tr-breakdown-header { display: flex; align-items: center; justify-content: space-between; }
        .tr-breakdown-title { font-size: 16px; font-weight: 500; color: #1C1917; margin: 0; }
        .tr-breakdown-close {
          background: none; border: none; font-size: 14px; color: #A8A29E;
          cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: color 0.12s;
        }
        .tr-breakdown-close:hover { color: #44403C; }
        .tr-breakdown-close:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .tr-breakdown-summary { display: flex; gap: 24px; flex-wrap: wrap; }
        .tr-summary-item { display: flex; flex-direction: column; gap: 2px; }
        .tr-summary-label { font-size: 11px; color: #A8A29E; text-transform: uppercase; letter-spacing: 0.5px; }
        .tr-summary-value { font-size: 18px; font-weight: 300; }
        .tr-summary-item--income .tr-summary-value { color: #6B6F69; }
        .tr-summary-item--expense .tr-summary-value { color: #C86D5A; }
        .tr-summary-item--savings .tr-summary-value { color: #C4A484; }
        .tr-entry-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .tr-entry-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid #F5F5F4; gap: 12px;
        }
        .tr-entry-row:last-child { border-bottom: none; }
        .tr-entry-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .tr-entry-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .tr-entry-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .tr-entry-date { font-size: 13px; color: #44403C; }
        .tr-entry-note { font-size: 12px; color: #A8A29E; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tr-entry-amount { font-size: 14px; font-weight: 500; flex-shrink: 0; }
        .tr-breakdown-empty { font-size: 13px; color: #A8A29E; margin: 0; }
      `}</style>
    </main>
  );
}
