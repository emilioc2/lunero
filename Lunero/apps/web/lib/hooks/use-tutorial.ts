import { useCallback } from 'react';
import { useTutorialStore } from '../store/tutorial-store';
import { profileApi } from '@lunero/api-client';

export function useTutorial() {
  const isOpen = useTutorialStore((s) => s.isOpen);
  const open = useTutorialStore((s) => s.openTutorial);
  const close = useTutorialStore((s) => s.closeTutorial);

  const completeTutorial = useCallback(async () => {
    close();
    try {
      await profileApi.update({ tutorialComplete: true });
    } catch {
      // Best-effort — tutorial won't re-launch this session regardless
    }
  }, [close]);

  const skipTutorial = useCallback(async () => {
    close();
    try {
      await profileApi.update({ tutorialComplete: true });
    } catch {
      // Best-effort
    }
  }, [close]);

  return { isOpen, openTutorial: open, completeTutorial, skipTutorial };
}
