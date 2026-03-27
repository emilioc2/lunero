'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFlowSheets, useCreateFlowSheet } from '../../../lib/hooks/use-flow-sheets';
import { useProfile } from '../../../lib/hooks/use-profile';
import { useCategories } from '../../../lib/hooks/use-categories';
import { useProjections, useUpsertProjection } from '../../../lib/hooks/use-projections';
import { CreateFlowSheetModal, type ProjectionDraft } from '../../../components/dashboard/create-flow-sheet-modal';
import type { CreateFlowSheetDto } from '@lunero/api-client';
import { formatPeriodLabel, formatCurrency } from '../../../lib/locale-utils';

export default function PastFlowSheetsPage() {
  const { data: allSheets = [], isLoading, error } = useFlowSheets();
  const { data: profile } = useProfile();
  const { data: categories = [] } = useCategories();
  const currency = profile?.defaultCurrency ?? 'USD';
  const [showCreate, setShowCreate] = useState(false);
  const createFlowSheet = useCreateFlowSheet();

  // Exclude the active sheet; sort archived sheets most-recent first
  const pastSheets = allSheets
    .filter((s) => s.status === 'archived')
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

  // Prevent creating a new FlowSheet when one is already active
  const hasActiveSheet = allSheets.some((s) => s.status === 'active');

  // Most recent past sheet — used to carry over projections
  const mostRecentPastSheet = pastSheets[0];
  const { data: carriedProjections = [] } = useProjections(mostRecentPastSheet?.id ?? '');
  const upsertProjection = useUpsertProjection('');

  const handleCreateFlowSheet = async (dto: CreateFlowSheetDto, projections: ProjectionDraft[]) => {
    const created = await createFlowSheet.mutateAsync(dto);
    // Save adjusted projections onto the newly created FlowSheet
    for (const proj of projections) {
      await upsertProjection.mutateAsync({
        categoryId: proj.categoryId,
        data: { projectedAmount: proj.projectedAmount, currency: proj.currency },
      });
    }
    setShowCreate(false);
  };

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading past FlowSheets" className="past-state">
        <span>Loading past FlowSheets…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="past-state past-state--error">
        <p>Could not load past FlowSheets. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <main className="past-page" aria-label="Past FlowSheets">
      <h1 className="past-heading">Past FlowSheets</h1>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {!hasActiveSheet && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            aria-label="Create new FlowSheet"
            className="past-create-btn"
          >
            + New FlowSheet
          </button>
        )}
      </div>

      {pastSheets.length === 0 ? (
        <p className="past-empty" aria-live="polite">
          No past FlowSheets yet. Completed periods will appear here once archived.
        </p>
      ) : (
        <ul role="list" className="past-list" aria-label="Archived FlowSheets">
          {pastSheets.map((sheet) => {
            const isOverspent = sheet.availableBalance < 0;
            return (
              <li key={sheet.id} role="listitem" className="past-item">
                <Link
                  href={`/past/${sheet.id}`}
                  className="past-item-link"
                  aria-label={`View FlowSheet: ${formatPeriodLabel(sheet.startDate, sheet.endDate)}`}
                >
                  <div className="past-item-period">
                    {formatPeriodLabel(sheet.startDate, sheet.endDate)}
                  </div>
                  <div className="past-item-balance-row">
                    <span
                      className={`past-item-balance${isOverspent ? ' past-item-balance--over' : ''}`}
                      aria-label={`Available balance: ${formatCurrency(sheet.availableBalance, currency)}`}
                    >
                      {formatCurrency(sheet.availableBalance, currency)}
                    </span>
                    <span className="past-item-arrow" aria-hidden="true">&rarr;</span>
                  </div>
                  <div className="past-item-totals" role="list" aria-label="Totals">
                    <span role="listitem" className="past-item-total past-item-total--income">
                      <span aria-hidden="true">&uarr;</span>
                      <span className="sr-only">Income: </span>
                      {formatCurrency(sheet.totalIncome, currency)}
                    </span>
                    <span role="listitem" className="past-item-total past-item-total--expense">
                      <span aria-hidden="true">&darr;</span>
                      <span className="sr-only">Expenses: </span>
                      {formatCurrency(sheet.totalExpenses, currency)}
                    </span>
                    <span role="listitem" className="past-item-total past-item-total--savings">
                      <span aria-hidden="true">&#9678;</span>
                      <span className="sr-only">Savings: </span>
                      {formatCurrency(sheet.totalSavings, currency)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {showCreate && (
        <CreateFlowSheetModal
          categories={categories}
          carriedProjections={carriedProjections}
          currency={currency}
          isSubmitting={createFlowSheet.isPending}
          onSubmit={handleCreateFlowSheet}
          onClose={() => setShowCreate(false)}
        />
      )}

      <style>{`
        .past-page { display: flex; flex-direction: column; gap: 24px; max-width: 720px; }
        .past-heading { font-size: 20px; font-weight: 500; color: #1C1917; margin: 0; }
        .past-create-btn {
          padding: 8px 18px; border-radius: 8px; border: none;
          background: #44403C; color: #FAFAF9; font-size: 14px; font-weight: 500; cursor: pointer;
        }
        .past-create-btn:hover { background: #292524; }
        .past-create-btn:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .past-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .past-item { border: 1px solid #E7E5E4; border-radius: 12px; overflow: hidden; }
        .past-item-link {
          display: flex; flex-direction: column; gap: 10px;
          padding: 20px 24px; text-decoration: none; color: inherit;
          transition: background 0.15s;
        }
        .past-item-link:hover { background: #F5F5F4; }
        .past-item-link:focus-visible { outline: 2px solid #44403C; outline-offset: -2px; }
        .past-item-period { font-size: 13px; color: #A8A29E; letter-spacing: 0.3px; }
        .past-item-balance-row { display: flex; align-items: center; justify-content: space-between; }
        .past-item-balance { font-size: 24px; font-weight: 300; color: #1C1917; }
        .past-item-balance--over { color: #C86D5A; }
        .past-item-arrow { font-size: 16px; color: #A8A29E; }
        .past-item-totals { display: flex; gap: 20px; flex-wrap: wrap; }
        .past-item-total { font-size: 13px; font-weight: 500; }
        .past-item-total--income { color: #6B6F69; }
        .past-item-total--expense { color: #C86D5A; }
        .past-item-total--savings { color: #C4A484; }
        .past-state {
          display: flex; align-items: center; justify-content: center;
          min-height: 200px; font-size: 14px; color: #78716C;
        }
        .past-state--error { color: #C86D5A; }
        .past-empty { font-size: 14px; color: #A8A29E; margin: 0; }
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
        }
      `}</style>
    </main>
  );
}
