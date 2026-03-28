import React, { useRef, useEffect } from 'react';
import { Text } from '@tamagui/core';
import { XStack, YStack } from './primitives';
import { COLOR, TYPOGRAPHY } from './tokens';

export interface MiraMessage {
  id: string;
  role: 'user' | 'mira';
  content: string;
}

export interface MiraPopupProps {
  /** Whether the popup is visible */
  isOpen: boolean;
  /** Whether the popup is minimized (header only) */
  isMinimized: boolean;
  /** Chat messages */
  messages: MiraMessage[];
  /** True while a query is in-flight */
  isQuerying: boolean;
  /** Called when user submits a message */
  onSendMessage: (message: string) => void;
  /** Called when minimize button is pressed */
  onMinimize: () => void;
  /** Called when close button is pressed */
  onClose: () => void;
  /** Called when the popup should be restored from minimized state */
  onRestore: () => void;
}

const SUGGESTION_CHIPS = ['How\'s my spending?', 'Show savings', 'Give me a tip'] as const;

const WELCOME_MESSAGE = 'Hi! I\'m Mira, your AI budgeting coach. Ask me anything about your finances.';

export function MiraPopup({
  isOpen,
  isMinimized,
  messages,
  isQuerying,
  onSendMessage,
  onMinimize,
  onClose,
  onRestore,
}: MiraPopupProps) {
  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  if (!isOpen) return null;

  const handleSubmit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isQuerying) return;
    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Minimized state — just show the header bar
  if (isMinimized) {
    return (
      <YStack
        position="absolute"
        bottom={24}
        right={24}
        width={360}
        backgroundColor="$surface1"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        overflow="hidden"
        style={{
          boxShadow: '0 8px 32px rgba(28, 25, 23, 0.18)',
          zIndex: 9999,
          position: 'fixed',
        }}
        role="dialog"
        aria-label="Mira AI budgeting coach"
        onKeyDown={handleKeyDown}
      >
        <PopupHeader onMinimize={onRestore} onClose={onClose} isMinimized />
      </YStack>
    );
  }

  return (
    <YStack
      position="absolute"
      bottom={24}
      right={24}
      width={360}
      maxHeight={520}
      backgroundColor="$surface1"
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      overflow="hidden"
      style={{
        boxShadow: '0 8px 32px rgba(28, 25, 23, 0.18)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
      }}
      role="dialog"
      aria-label="Mira AI budgeting coach"
      onKeyDown={handleKeyDown}
    >
      <PopupHeader onMinimize={onMinimize} onClose={onClose} isMinimized={false} />

      {/* Chat area */}
      <YStack
        flex={1}
        padding={16}
        gap={12}
        style={{ overflowY: 'auto', minHeight: 200 }}
      >
        {messages.length === 0 ? (
          <WelcomeMessage />
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        {isQuerying && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </YStack>

      {/* Suggestion chips */}
      {messages.length === 0 && (
        <XStack paddingHorizontal={16} paddingBottom={8} gap={8} flexWrap="wrap">
          {SUGGESTION_CHIPS.map((chip) => (
            <YStack
              key={chip}
              borderWidth={1}
              borderColor="$borderColor"
              borderRadius={99}
              paddingHorizontal={12}
              paddingVertical={6}
              cursor="pointer"
              hoverStyle={{ backgroundColor: '$backgroundHover' }}
              role="button"
              tabIndex={0}
              aria-label={chip}
              onPress={() => handleSubmit(chip)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSubmit(chip);
                }
              }}
            >
              <Text fontSize={12} color="$color">{chip}</Text>
            </YStack>
          ))}
        </XStack>
      )}

      {/* Input area */}
      <XStack
        borderTopWidth={1}
        borderColor="$borderColor"
        padding={12}
        gap={8}
        alignItems="center"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit(input);
            }
          }}
          placeholder="Ask Mira anything..."
          disabled={isQuerying}
          aria-label="Message input"
          style={{
            flex: 1,
            border: '1px solid var(--borderColor, #E7E5E4)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'inherit',
            color: 'var(--color, #1C1917)',
            backgroundColor: 'var(--inputBackground, #FFFFFF)',
          }}
        />
        <YStack
          width={36}
          height={36}
          borderRadius={8}
          backgroundColor={COLOR.expenseClayRed}
          alignItems="center"
          justifyContent="center"
          cursor={isQuerying ? 'not-allowed' : 'pointer'}
          opacity={isQuerying ? 0.5 : 1}
          role="button"
          tabIndex={0}
          aria-label="Send message"
          onPress={() => handleSubmit(input)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSubmit(input);
            }
          }}
        >
          <Text fontSize={16} color={COLOR.white} aria-hidden="true">→</Text>
        </YStack>
      </XStack>
    </YStack>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function PopupHeader({
  onMinimize,
  onClose,
  isMinimized,
}: {
  onMinimize: () => void;
  onClose: () => void;
  isMinimized: boolean;
}) {
  return (
    <XStack
      padding={16}
      borderBottomWidth={1}
      borderColor="$borderColor"
      alignItems="center"
      justifyContent="space-between"
    >
      <YStack gap={2}>
        <Text fontSize={16} fontWeight="500" color="$color">
          Mira ✨
        </Text>
        <Text fontSize={12} color="$placeholderColor">
          AI Budgeting Coach
        </Text>
      </YStack>
      <XStack gap={12} alignItems="center">
        <YStack
          role="button"
          tabIndex={0}
          cursor="pointer"
          aria-label={isMinimized ? 'Restore popup' : 'Minimize popup'}
          onPress={onMinimize}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onMinimize();
            }
          }}
        >
          <Text fontSize={18} color="$placeholderColor" hoverStyle={{ color: '$color' }}>
            {isMinimized ? '□' : '−'}
          </Text>
        </YStack>
        <YStack
          role="button"
          tabIndex={0}
          cursor="pointer"
          aria-label="Close popup"
          onPress={onClose}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
        >
          <Text fontSize={18} color="$placeholderColor" hoverStyle={{ color: '$color' }}>
            ×
          </Text>
        </YStack>
      </XStack>
    </XStack>
  );
}

function MessageBubble({ message }: { message: MiraMessage }) {
  const isUser = message.role === 'user';
  return (
    <XStack justifyContent={isUser ? 'flex-end' : 'flex-start'}>
      <YStack
        backgroundColor={isUser ? '$surface3' : '$surface2'}
        borderRadius={12}
        paddingHorizontal={14}
        paddingVertical={10}
        maxWidth="80%"
      >
        <Text
          fontSize={14}
          color={isUser ? '$color' : '$color'}
          style={{ lineHeight: '1.5' }}
        >
          {message.content}
        </Text>
      </YStack>
    </XStack>
  );
}

function WelcomeMessage() {
  return (
    <XStack justifyContent="flex-start">
      <YStack
        backgroundColor="$surface2"
        borderRadius={12}
        paddingHorizontal={14}
        paddingVertical={10}
        maxWidth="80%"
      >
        <Text fontSize={14} color="$color" style={{ lineHeight: '1.5' }}>
          {WELCOME_MESSAGE}
        </Text>
      </YStack>
    </XStack>
  );
}

function TypingIndicator() {
  return (
    <XStack justifyContent="flex-start">
      <YStack
        backgroundColor="$surface2"
        borderRadius={12}
        paddingHorizontal={14}
        paddingVertical={10}
      >
        <Text fontSize={14} color="$placeholderColor">…</Text>
      </YStack>
    </XStack>
  );
}
