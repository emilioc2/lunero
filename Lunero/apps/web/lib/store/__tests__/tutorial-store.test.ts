import { describe, it, expect, beforeEach } from 'vitest';
import { useTutorialStore } from '../tutorial-store';

describe('useTutorialStore', () => {
  beforeEach(() => {
    useTutorialStore.setState({ isOpen: false });
  });

  it('starts closed', () => {
    expect(useTutorialStore.getState().isOpen).toBe(false);
  });

  it('openTutorial sets isOpen to true', () => {
    useTutorialStore.getState().openTutorial();
    expect(useTutorialStore.getState().isOpen).toBe(true);
  });

  it('closeTutorial sets isOpen to false', () => {
    useTutorialStore.setState({ isOpen: true });
    useTutorialStore.getState().closeTutorial();
    expect(useTutorialStore.getState().isOpen).toBe(false);
  });

  it('openTutorial is idempotent', () => {
    useTutorialStore.getState().openTutorial();
    useTutorialStore.getState().openTutorial();
    expect(useTutorialStore.getState().isOpen).toBe(true);
  });

  it('closeTutorial is idempotent', () => {
    useTutorialStore.getState().closeTutorial();
    useTutorialStore.getState().closeTutorial();
    expect(useTutorialStore.getState().isOpen).toBe(false);
  });
});
