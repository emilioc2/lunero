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
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  }, []);

  const [displayMonth, setDisplayMonth] = useState<number | null>(null);
  const [displayYear, setDisplayYear] = useState<number | null>(null);

  const resolvedMonth = displayMonth ?? initialMonth.month;
  const resolvedYear = displayYear ?? initialMonth.year;

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });

  // ── Month navigation ──────────────────────────────────────────────────────
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

  const handleAddFromDay = useCallback((isoDate: string) => {
    setModal({ type: 'create', prefillDate: isoDate });
  }, []);

  const handleCreate = useCallback(
    async (values: EntryFormValues) => {
      if (!flowSheet) return;
      const dto = {
        flowSheetId: flowSheet.id,
        entryType: values.entryType,
        category: values.categoryId,
        amount: parseFloat(values.amount),
        currency: values.currency,
        entryDate: values.entryDate,
        note: values.note || undefined,
        clientUpdatedAt: new Date().toISOString(),
      };

      const optimistic: Entry = {
        ...dto,
        categoryId: values.categoryId,
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
        category: values.categoryId,
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
      <div role="status" aria-label="Loading calendar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 200, fontSize: 14, color: 'var(--placeholderColor, #78716C)',
      }}>
        Loading calendar…
      </div>
    );
  }

  if (!flowSheet) {
    return (
      <div role="alert" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 200, fontSize: 14, color: 'var(--expense, #C86D5A)',
      }}>
        No active FlowSheet found.
      </div>
    );
  }

  return (
    <main aria-label="Transaction Calendar" style={{
      display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720, width: '100%',
      marginLeft: 'auto', marginRight: 'auto',
    }}>
      {/* Page title (Req 17.1) */}
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--color, #1C1917)', margin: 0 }}>
        📅 Transaction Calendar
      </h1>

      {/* Calendar card (Req 17.3) */}
      <div style={{
        background: 'var(--surface1, #FFFFFF)', border: '1px solid var(--borderColor, #E7E5E4)', borderRadius: 12,
        padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Month nav: label left, arrows right (Req 17.4) */}
        <nav aria-label="Month navigation" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 aria-live="polite" aria-atomic="true" style={{
            fontSize: 16, fontWeight: 500, color: 'var(--color, #1C1917)', margin: 0,
          }}>
            {monthLabel}
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={!canGoPrev}
              aria-label="Previous month"
              style={{
                background: 'transparent', border: '1px solid var(--borderColorHover, #D6D3D1)', borderRadius: 8,
                width: 32, height: 32, fontSize: 16, color: 'var(--color, #44403C)',
                cursor: canGoPrev ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: canGoPrev ? 1 : 0.35,
              }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={!canGoNext}
              aria-label="Next month"
              style={{
                background: 'transparent', border: '1px solid var(--borderColorHover, #D6D3D1)', borderRadius: 8,
                width: 32, height: 32, fontSize: 16, color: 'var(--color, #44403C)',
                cursor: canGoNext ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: canGoNext ? 1 : 0.35,
              }}
            >
              →
            </button>
          </div>
        </nav>

        {/* Calendar grid (Req 17.2) */}
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

      {/* Day detail panel */}
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

      {/* Entry modal — create with pre-populated date */}
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
        .cal-day-cell:hover[data-in-period="true"]:not([data-selected="true"]):not([data-today="true"]) {
          background-color: var(--backgroundHover, #F5F5F4) !important;
        }
        .cal-day-cell:focus-visible { outline: 2px solid var(--color, #44403C); outline-offset: -2px; }
        .cal-panel-add-btn:hover { border-color: var(--placeholderColor, #A8A29E) !important; color: var(--color, #44403C) !important; }
        .cal-panel-add-btn:focus-visible { outline: 2px solid var(--color, #44403C); outline-offset: 2px; }
      `}</style>
    </main>
  );
}
