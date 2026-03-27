'use client';

import { useState, useCallback, useMemo } from 'react';
import { CalendarGrid, CalendarDayPanel } from '@lunero/ui';
import type { EntryFormValues } from '@lunero/ui';
import type { Entry } from '@lunero/core';
import { useActiveFlowSheet } from '../../../lib/hooks/use-flow-sheets';
import { useEntries, useCreateEntry, useUpdateEntry } from '../../../lib/hooks/use-entries';
import { useCategories } from '../../../lib/hooks/use-categories';
import { useProfile } from '../../../lib/hooks/use-profile';
import { useEntryStore } from '../../../lib/store/entry-store';
import { EntryModal } from '../../../components/dashboard/entry-modal';
import { SUPPORTED_CURRENCIES } from '../../../components/onboarding/step-currency';

type ModalState =
  | { type: 'closed' }
  | { type: 'create'; prefillDate: string }
  | { type: 'edit'; entry: Entry };

export default function CalendarPage() {
  const { data: flowSheet, isLoading: sheetLoading } = useActiveFlowSheet();
  const { data: serverEntries = [], isLoading: entriesLoading } = useEntries(flowSheet?.id ?? '');
  const { data: categories = [] } = useCategories();
  const { data: profile } = useProfile();

  const { entriesBySheet, addEntry, setEntries, updateEntry: updateStoreEntry } = useEntryStore();
  const storeEntries: Entry[] = flowSheet
    ? (entriesBySheet[flowSheet.id] ?? serverEntries)
    : serverEntries;

  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry(flowSheet?.id ?? '');

  const defaultCurrency = profile?.defaultCurrency ?? 'USD';

  // ── Navigation state ───────────────────────────────────────────────────────
  const initialMonth = useMemo(() => {
    if (!flowSheet) return { month: new Date().getMonth(), year: new Date().getFullYear() };
    const d = new Date(flowSheet.startDate);
    return { month: d.getMonth(), year: d.getFullYear() };
  }, [flowSheet]);

  const [displayMonth, setDisplayMonth] = useState<number | null>(null);
  const [displayYear, setDisplayYear] = useState<number | null>(null);

  const resolvedMonth = displayMonth ?? initialMonth.month;
  const resolvedYear = displayYear ?? initialMonth.year;

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });

  // ── Month navigation (task 21.4) ───────────────────────────────────────────
  const handlePrevMonth = useCallback(() => {
    setDisplayMonth((m) => {
      const cur = m ?? initialMonth.month;
      if (cur === 0) {
        setDisplayYear((y) => (y ?? initialMonth.year) - 1);
        return 11;
      }
      return cur - 1;
    });
  }, [initialMonth]);

  const handleNextMonth = useCallback(() => {
    setDisplayMonth((m) => {
      const cur = m ?? initialMonth.month;
      if (cur === 11) {
        setDisplayYear((y) => (y ?? initialMonth.year) + 1);
        return 0;
      }
      return cur + 1;
    });
  }, [initialMonth]);

  // Disable nav buttons when the adjacent month is entirely outside the period
  const canGoPrev = useMemo(() => {
    if (!flowSheet) return false;
    const periodStart = new Date(flowSheet.startDate);
    const prevMonth = resolvedMonth === 0 ? 11 : resolvedMonth - 1;
    const prevYear = resolvedMonth === 0 ? resolvedYear - 1 : resolvedYear;
    return new Date(prevYear, prevMonth + 1, 0) >= periodStart;
  }, [flowSheet, resolvedMonth, resolvedYear]);

  const canGoNext = useMemo(() => {
    if (!flowSheet) return false;
    const periodEnd = new Date(flowSheet.endDate);
    const nextMonth = resolvedMonth === 11 ? 0 : resolvedMonth + 1;
    const nextYear = resolvedMonth === 11 ? resolvedYear + 1 : resolvedYear;
    return new Date(nextYear, nextMonth, 1) <= periodEnd;
  }, [flowSheet, resolvedMonth, resolvedYear]);

  const monthLabel = useMemo(
    () =>
      new Date(resolvedYear, resolvedMonth, 1).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [resolvedMonth, resolvedYear],
  );

  // ── Entry handlers ─────────────────────────────────────────────────────────

  const handleDaySelect = useCallback((isoDate: string) => {
    setSelectedDate((prev) => (prev === isoDate ? undefined : isoDate));
  }, []);

  // Opens create modal with the clicked day pre-populated (task 21.3)
  const handleAddFromDay = useCallback((isoDate: string) => {
    setModal({ type: 'create', prefillDate: isoDate });
  }, []);

  const handleCreate = useCallback(
    async (values: EntryFormValues) => {
      if (!flowSheet) return;
      const dto = {
        flowSheetId: flowSheet.id,
        entryType: values.entryType,
        categoryId: values.categoryId,
        amount: parseFloat(values.amount),
        currency: values.currency,
        entryDate: values.entryDate,
        note: values.note || undefined,
        clientUpdatedAt: new Date().toISOString(),
      };

      const optimistic: Entry = {
        ...dto,
        id: `optimistic-${Date.now()}`,
        userId: '',
        convertedAmount: undefined,
        conversionRate: undefined,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addEntry(optimistic);
      setModal({ type: 'closed' });

      try {
        const created = await createEntry.mutateAsync(dto);
        setEntries(flowSheet.id, [
          ...storeEntries.filter((e) => e.id !== optimistic.id),
          created,
        ]);
      } catch {
        setEntries(
          flowSheet.id,
          storeEntries.filter((e) => e.id !== optimistic.id),
        );
      }
    },
    [flowSheet, storeEntries, addEntry, setEntries, createEntry],
  );

  const handleEdit = useCallback(
    async (values: EntryFormValues) => {
      if (modal.type !== 'edit') return;
      const entry = modal.entry;
      const dto = {
        categoryId: values.categoryId,
        amount: parseFloat(values.amount),
        currency: values.currency,
        entryDate: values.entryDate,
        note: values.note || undefined,
        clientUpdatedAt: new Date().toISOString(),
      };

      updateStoreEntry({ ...entry, ...dto, amount: dto.amount });
      setModal({ type: 'closed' });

      try {
        const updated = await updateEntry.mutateAsync({ id: entry.id, data: dto });
        updateStoreEntry(updated);
      } catch {
        updateStoreEntry(entry);
      }
    },
    [modal, updateStoreEntry, updateEntry],
  );

  // ── Loading / error ────────────────────────────────────────────────────────

  if (sheetLoading || entriesLoading) {
    return (
      <div role="status" aria-label="Loading calendar" className="cal-state">
        Loading calendar…
      </div>
    );
  }

  if (!flowSheet) {
    return (
      <div role="alert" className="cal-state cal-state--error">
        No active FlowSheet found.
      </div>
    );
  }

  return (
    <main className="cal-page" aria-label="Calendar view">
      {/* Month navigation header (task 21.4) */}
      <nav className="cal-nav" aria-label="Month navigation">
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className="cal-nav-btn"
        >
          ‹
        </button>
        <h2 className="cal-nav-label" aria-live="polite" aria-atomic="true">
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={!canGoNext}
          aria-label="Next month"
          className="cal-nav-btn"
        >
          ›
        </button>
      </nav>

      {/* Calendar body: grid + optional day panel */}
      <div className="cal-body">
        <div className="cal-grid-wrap">
          {/* CalendarGrid handles task 21.1 (colored dots), 21.5 (neutral empty cells) */}
          <CalendarGrid
            startDate={flowSheet.startDate}
            endDate={flowSheet.endDate}
            entries={storeEntries}
            displayMonth={resolvedMonth}
            displayYear={resolvedYear}
            selectedDate={selectedDate}
            onDaySelect={handleDaySelect}
          />
        </div>

        {/* Day detail panel — task 21.2 */}
        {selectedDate && (
          <CalendarDayPanel
            selectedDate={selectedDate}
            entries={storeEntries}
            categories={categories}
            defaultCurrency={defaultCurrency}
            onAddEntry={handleAddFromDay}
            onEditEntry={(entry) => setModal({ type: 'edit', entry })}
            onClose={() => setSelectedDate(undefined)}
          />
        )}
      </div>

      {/* Entry modal — create with pre-populated date (task 21.3) */}
      {modal.type === 'create' && (
        <EntryModal
          mode="create"
          categories={categories}
          defaultCurrency={defaultCurrency}
          supportedCurrencies={SUPPORTED_CURRENCIES}
          prefillDate={modal.prefillDate}
          onSubmit={handleCreate}
          onClose={() => setModal({ type: 'closed' })}
          isSubmitting={createEntry.isPending}
        />
      )}

      {modal.type === 'edit' && (
        <EntryModal
          mode="edit"
          entry={modal.entry}
          categories={categories}
          defaultCurrency={defaultCurrency}
          supportedCurrencies={SUPPORTED_CURRENCIES}
          onSubmit={handleEdit}
          onClose={() => setModal({ type: 'closed' })}
          isSubmitting={updateEntry.isPending}
        />
      )}

      <style>{`
        .cal-page { display: flex; flex-direction: column; gap: 20px; height: 100%; }
        .cal-nav { display: flex; align-items: center; gap: 16px; }
        .cal-nav-label {
          font-size: 16px; font-weight: 500; color: #1C1917; margin: 0;
          min-width: 180px; text-align: center;
        }
        .cal-nav-btn {
          background: none; border: 1px solid #D6D3D1; border-radius: 6px;
          width: 32px; height: 32px; font-size: 18px; color: #44403C;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.12s;
        }
        .cal-nav-btn:hover:not(:disabled) { background: #F5F5F4; }
        .cal-nav-btn:disabled { opacity: 0.35; cursor: default; }
        .cal-nav-btn:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .cal-body {
          display: flex; flex: 1; border: 1px solid #E7E5E4;
          border-radius: 12px; overflow: hidden; background: #FFFFFF;
        }
        .cal-grid-wrap { flex: 1; padding: 20px; min-width: 0; }
        .cal-day-cell:hover[data-in-period="true"]:not([data-selected="true"]) {
          background-color: #F5F5F4 !important;
        }
        .cal-day-cell:focus-visible { outline: 2px solid #44403C; outline-offset: -2px; }
        .cal-panel-add-btn:hover { border-color: #A8A29E !important; color: #44403C !important; }
        .cal-panel-add-btn:focus-visible { outline: 2px solid #44403C; outline-offset: 2px; }
        .cal-state {
          display: flex; align-items: center; justify-content: center;
          min-height: 200px; font-size: 14px; color: #78716C;
        }
        .cal-state--error { color: #C86D5A; }
      `}</style>
    </main>
  );
}
