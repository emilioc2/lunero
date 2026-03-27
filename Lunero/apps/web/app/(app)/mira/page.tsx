'use client';

import { useState, useCallback } from 'react';
import { AICoachPanel } from '@lunero/ui';
import type { ChatMessage } from '@lunero/ui';
import { useMiraAlerts, useMiraQuery, useDismissAlert } from '../../../lib/hooks/use-mira';

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}-${Date.now()}`;
}

export default function MiraPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dismissingId, setDismissingId] = useState<string | undefined>();
  // Track Mira unavailability from failed queries (503 / network error) — task 25.5
  const [unavailable, setUnavailable] = useState(false);

  const { data: alerts = [], isLoading: isLoadingAlerts } = useMiraAlerts();
  const queryMutation = useMiraQuery();
  const dismissMutation = useDismissAlert();

  // task 25.2 — submit query, show loading, append response
  const handleSubmitQuery = useCallback(
    async (message: string) => {
      const userMsg: ChatMessage = {
        id: nextId(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setUnavailable(false);

      try {
        const result = await queryMutation.mutateAsync({ message });
        const miraMsg: ChatMessage = {
          id: nextId(),
          role: 'mira',
          content: result.response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, miraMsg]);
      } catch {
        // Surface unavailability inline; does not block other app functions
        setUnavailable(true);
      }
    },
    [queryMutation],
  );

  // task 25.4 — dismiss alert, remove from UI via query invalidation in hook
  const handleDismissAlert = useCallback(
    async (id: string) => {
      setDismissingId(id);
      try {
        await dismissMutation.mutateAsync(id);
      } finally {
        setDismissingId(undefined);
      }
    },
    [dismissMutation],
  );

  return (
    <main
      aria-label="Mira — AI budgeting coach"
      style={{ display: 'flex', flexDirection: 'column', maxWidth: 680, height: '100%' }}
    >
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1C1917', margin: '0 0 4px' }}>
          Mira
        </h1>
        <p style={{ fontSize: 13, color: '#A8A29E', margin: 0 }}>
          Your AI budgeting coach. Ask anything about your FlowSheet.
        </p>
      </div>

      <div
        style={{
          flex: 1,
          background: '#FFFFFF',
          border: '1px solid #E7E5E4',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AICoachPanel
          messages={messages}
          alerts={alerts}
          isQuerying={queryMutation.isPending}
          isLoadingAlerts={isLoadingAlerts}
          isDismissingId={dismissingId}
          unavailable={unavailable}
          onSubmitQuery={handleSubmitQuery}
          onDismissAlert={handleDismissAlert}
        />
      </div>
    </main>
  );
}
