import React from 'react';
import { Text } from '@tamagui/core';
import { XStack, YStack } from './primitives';

export interface OnboardingStepProps {
  /** 1-based current step number */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onSkip?: () => void;
}

export function OnboardingStep({
  currentStep,
  totalSteps,
  title,
  description,
  children,
  onBack,
  onSkip,
}: OnboardingStepProps) {
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  return (
    <YStack
      flex={1}
      gap="$6"
      padding="$6"
      maxWidth={480}
      marginHorizontal="auto"
      role="main"
      aria-label={`Onboarding step ${currentStep} of ${totalSteps}: ${title}`}
    >
      {/* Progress bar */}
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Text
            fontSize={12}
            color="$placeholderColor"
            textTransform="uppercase"
            letterSpacing={1}
            aria-hidden={true}
          >
            Step {currentStep} of {totalSteps}
          </Text>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              aria-label="Skip this step"
              style={skipButtonStyle}
            >
              Skip
            </button>
          )}
        </XStack>

        {/* Track */}
        <XStack
          height={3}
          backgroundColor="$surface2"
          borderRadius="$full"
          overflow="hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progressPercent}% complete`}
        >
          <XStack
            height="100%"
            backgroundColor="$color"
            borderRadius="$full"
            width={`${progressPercent}%` as any}
          />
        </XStack>
      </YStack>

      {/* Step dots */}
      <XStack gap="$2" justifyContent="center" aria-hidden={true}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <XStack
            key={i}
            width={i + 1 === currentStep ? 20 : 6}
            height={6}
            borderRadius="$full"
            backgroundColor={i + 1 <= currentStep ? '$color' : '$surface3'}
          />
        ))}
      </XStack>

      {/* Title + description */}
      <YStack gap="$2">
        <Text fontSize={24} fontWeight="300" color="$color">
          {title}
        </Text>
        {description && (
          <Text fontSize={15} color="$colorHover" lineHeight={22}>
            {description}
          </Text>
        )}
      </YStack>

      {/* Step content */}
      <YStack flex={1} gap="$4">
        {children}
      </YStack>

      {/* Back navigation */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back to previous step"
          style={backButtonStyle}
        >
          ← Back
        </button>
      )}
    </YStack>
  );
}

const skipButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 13,
  color: '#A8A29E',
  cursor: 'pointer',
  padding: '4px 0',
  textDecoration: 'underline',
};

const backButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 14,
  color: '#78716C',
  cursor: 'pointer',
  padding: '4px 0',
  alignSelf: 'flex-start',
};
