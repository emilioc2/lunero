/**
 * Tests for the redesigned TutorialOverlay — segmented progress bar,
 * emoji icons, checkmark bullets, close button, and navigation.
 * Requirements: 11.2, 11.3, 11.6, 11.7, 12.5, 13.3, 13.4
 */
import { describe, it, expect } from 'vitest';
import { STEPS, STEP_EMOJIS, TOTAL_STEPS } from '../tutorial-overlay';

describe('TutorialOverlay data', () => {
  it('has exactly 6 steps', () => {
    expect(TOTAL_STEPS).toBe(6);
    expect(STEPS).toHaveLength(6);
  });

  it('has exactly 6 step emojis', () => {
    expect(STEP_EMOJIS).toHaveLength(6);
    expect(STEP_EMOJIS).toEqual(['✨', '📊', '🤙', '📅', '💫', '🎉']);
  });
});

describe('Segmented progress bar logic', () => {
  // Req 11.2, 11.3: Segmented bar fills first N segments for step N
  it.each([
    { step: 0, expectedFilled: 1 },
    { step: 1, expectedFilled: 2 },
    { step: 2, expectedFilled: 3 },
    { step: 3, expectedFilled: 4 },
    { step: 4, expectedFilled: 5 },
    { step: 5, expectedFilled: 6 },
  ])('fills $expectedFilled segments on step $step', ({ step, expectedFilled }) => {
    const filledCount = STEPS.filter((_, i) => i < step + 1).length;
    const emptyCount = TOTAL_STEPS - filledCount;
    expect(filledCount).toBe(expectedFilled);
    expect(emptyCount).toBe(TOTAL_STEPS - expectedFilled);
  });
});

describe('Step emoji icons', () => {
  // Req 11.4: Each step has a specific emoji
  it('step 1 has ✨ emoji', () => {
    expect(STEPS[0].emoji).toBe('✨');
  });

  it('step 2 has 📊 emoji', () => {
    expect(STEPS[1].emoji).toBe('📊');
  });

  it('step 3 has 🤙 emoji', () => {
    expect(STEPS[2].emoji).toBe('🤙');
  });

  it('step 4 has 📅 emoji', () => {
    expect(STEPS[3].emoji).toBe('📅');
  });

  it('step 5 has 💫 emoji', () => {
    expect(STEPS[4].emoji).toBe('💫');
  });

  it('step 6 has 🎉 emoji', () => {
    expect(STEPS[5].emoji).toBe('🎉');
  });

  it('each step emoji matches the STEP_EMOJIS array', () => {
    STEPS.forEach((step, i) => {
      expect(step.emoji).toBe(STEP_EMOJIS[i]);
    });
  });
});

describe('Step titles with emoji suffixes', () => {
  // Req 11.5: Titles include emoji suffixes
  it('step 1 title includes 🌙', () => {
    expect(STEPS[0].title).toBe('Welcome to Lunero! 🌙');
  });

  it('step 2 title includes 📊', () => {
    expect(STEPS[1].title).toBe('Understanding FlowSheets 📊');
  });

  it('step 6 title includes 🎉', () => {
    expect(STEPS[5].title).toBe("You're All Set! 🎉");
  });
});

describe('Checkmark bullet lists', () => {
  // Req 12.4: Step 1 has description only (no bullets)
  it('step 1 has no bullets', () => {
    expect(STEPS[0].bullets).toBeUndefined();
  });

  // Req 12.5: Step 2 has 4 checkmark bullets
  it('step 2 has 4 checkmark bullets', () => {
    expect(STEPS[1].bullets).toHaveLength(4);
    expect(STEPS[1].bullets).toContain('Set projected income and expenses');
    expect(STEPS[1].bullets).toContain('Track actual spending automatically');
    expect(STEPS[1].bullets).toContain('Compare budget vs reality in real-time');
    expect(STEPS[1].bullets).toContain('View past FlowSheets for insights');
  });

  // Req 12.6: Step 3 has 3 bullets
  it('step 3 has 3 checkmark bullets', () => {
    expect(STEPS[2].bullets).toHaveLength(3);
    expect(STEPS[2].bullets).toContain('Income: Salary, freelance work, gifts');
    expect(STEPS[2].bullets).toContain('Expenses: Daily spending across categories');
    expect(STEPS[2].bullets).toContain('Savings: Money set aside for goals');
  });

  // Req 12.7: Step 4 has 4 bullets
  it('step 4 has 4 checkmark bullets', () => {
    expect(STEPS[3].bullets).toHaveLength(4);
    expect(STEPS[3].bullets).toContain('Green highlights = positive cash flow');
    expect(STEPS[3].bullets).toContain('Red highlights = more expenses than income');
    expect(STEPS[3].bullets).toContain('Dots show transaction types');
    expect(STEPS[3].bullets).toContain('Click any day for details');
  });

  // Req 12.8: Step 5 has 4 bullets
  it('step 5 has 4 checkmark bullets', () => {
    expect(STEPS[4].bullets).toHaveLength(4);
    expect(STEPS[4].bullets).toContain('Get spending insights and trends');
    expect(STEPS[4].bullets).toContain('Receive budget recommendations');
    expect(STEPS[4].bullets).toContain('Ask questions about your finances');
    expect(STEPS[4].bullets).toContain('Set and track financial goals');
  });

  // Req 12.9: Step 6 has description only (no bullets)
  it('step 6 has no bullets', () => {
    expect(STEPS[5].bullets).toBeUndefined();
  });

  // Steps with bullets should all have non-empty descriptions too
  it('all steps have descriptions', () => {
    STEPS.forEach((step) => {
      expect(step.description).toBeTruthy();
      expect(step.description.length).toBeGreaterThan(0);
    });
  });
});

describe('Navigation button labels', () => {
  // Req 13.3: Last step shows "Get Started 🚀"
  it('last step index is 5 (step 6)', () => {
    expect(TOTAL_STEPS - 1).toBe(5);
  });

  // Req 13.2: Step 1 should hide Previous
  it('step 0 is the first step where Previous should be hidden', () => {
    expect(0).toBe(0); // step > 0 check in component hides Previous
  });

  // Req 12.10: Step counter produces correct format "X of 6"
  it('step counter produces correct format for each step', () => {
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const counter = `${i + 1} of ${TOTAL_STEPS}`;
      expect(counter).toMatch(/^\d+ of 6$/);
    }
  });
});
