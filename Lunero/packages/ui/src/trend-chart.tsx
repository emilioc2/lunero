'use client';

import { useMemo } from 'react';

// Defined locally to avoid a dependency on @lunero/api-client from the UI package
export interface TrendPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  availableBalance: number;
}

export interface TrendChartProps {
  periods: TrendPeriod[];
  series?: Array<'income' | 'expenses' | 'savings'>;
  selectedId?: string;
  onSelectPeriod?: (period: TrendPeriod) => void;
  currency?: string;
}

const SERIES_COLORS = {
  income: '#6B6F69',
  expenses: '#C86D5A',
  savings: '#C4A484',
} as const;

const SERIES_LABELS = {
  income: 'Income',
  expenses: 'Expenses',
  savings: 'Savings',
} as const;

function formatCompact(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

function formatFull(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function TrendChart({
  periods,
  series = ['income', 'expenses', 'savings'],
  selectedId,
  onSelectPeriod,
  currency = 'USD',
}: TrendChartProps) {
  const maxValue = useMemo(() => {
    let max = 0;
    for (const p of periods) {
      if (series.includes('income')) max = Math.max(max, p.totalIncome);
      if (series.includes('expenses')) max = Math.max(max, p.totalExpenses);
      if (series.includes('savings')) max = Math.max(max, p.totalSavings);
    }
    return max || 1;
  }, [periods, series]);

  // Responsive bar width: narrower when many periods
  const barWidth = Math.max(16, Math.min(44, Math.floor(520 / Math.max(periods.length, 1)) - 10));
  const groupWidth = barWidth * series.length + (series.length - 1) * 4 + 8;

  return (
    <div className="tc-root" role="figure" aria-label="Trend chart">
      {/* Legend */}
      <div className="tc-legend" role="list" aria-label="Chart legend">
        {series.map((s) => (
          <div key={s} className="tc-legend-item" role="listitem">
            <span className="tc-legend-dot" style={{ background: SERIES_COLORS[s] }} aria-hidden="true" />
            <span className="tc-legend-label">{SERIES_LABELS[s]}</span>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="tc-chart" role="list" aria-label="Trend periods">
        {periods.map((period) => {
          const isSelected = period.id === selectedId;
          const values = {
            income: period.totalIncome,
            expenses: period.totalExpenses,
            savings: period.totalSavings,
          };
          const ariaLabel = series
            .map((s) => `${SERIES_LABELS[s]}: ${formatFull(values[s], currency)}`)
            .join(', ');

          return (
            <div
              key={period.id}
              className={`tc-group${isSelected ? ' tc-group--selected' : ''}`}
              role="listitem"
              aria-label={`${period.label} — ${ariaLabel}`}
              aria-pressed={onSelectPeriod ? isSelected : undefined}
              tabIndex={onSelectPeriod ? 0 : undefined}
              onClick={() => onSelectPeriod?.(period)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onSelectPeriod) {
                  e.preventDefault();
                  onSelectPeriod(period);
                }
              }}
              style={{ width: groupWidth, cursor: onSelectPeriod ? 'pointer' : 'default' }}
            >
              {/* Bars */}
              <div className="tc-bars" aria-hidden="true">
                {series.map((s) => {
                  const pct = (values[s] / maxValue) * 100;
                  return (
                    <div
                      key={s}
                      className="tc-bar-wrap"
                      style={{ width: barWidth }}
                      title={`${SERIES_LABELS[s]}: ${formatCompact(values[s], currency)}`}
                    >
                      <div
                        className="tc-bar"
                        style={{
                          height: `${Math.max(pct, values[s] > 0 ? 1.5 : 0)}%`,
                          background: SERIES_COLORS[s],
                          opacity: isSelected ? 1 : 0.8,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Period label */}
              <div className="tc-label" aria-hidden="true">{period.label}</div>
            </div>
          );
        })}
      </div>

      <style>{`
        .tc-root { display: flex; flex-direction: column; gap: 16px; width: 100%; }
        .tc-legend { display: flex; gap: 20px; flex-wrap: wrap; }
        .tc-legend-item { display: flex; align-items: center; gap: 6px; }
        .tc-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .tc-legend-label { font-size: 12px; color: #78716C; }
        .tc-chart {
          display: flex; align-items: flex-end; gap: 8px;
          height: 180px; overflow-x: auto; padding-bottom: 4px;
        }
        .tc-group {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          flex-shrink: 0; border-radius: 6px; padding: 4px 0;
          transition: background 0.15s;
        }
        .tc-group:hover { background: rgba(0,0,0,0.04); }
        .tc-group--selected { background: rgba(0,0,0,0.06); }
        .tc-group:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; border-radius: 6px; }
        .tc-bars { display: flex; align-items: flex-end; gap: 4px; height: 140px; width: 100%; }
        .tc-bar-wrap { display: flex; align-items: flex-end; height: 100%; }
        .tc-bar { width: 100%; border-radius: 3px 3px 0 0; transition: height 0.3s ease, opacity 0.15s; }
        .tc-label {
          font-size: 11px; color: #A8A29E; text-align: center;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
        }
      `}</style>
    </div>
  );
}
