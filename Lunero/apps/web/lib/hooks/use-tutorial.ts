import { useTutorialStore } from '../store/tutorial-store';
import { useUpdateProfile } from './use-profile';

/**
 * Combines the tutorial open/close store with profile persistence.
 * Both completing and skipping mark tutorialComplete = true so the
 * tutorial does not auto-launch again on subsequent logins.
 */
export function useTutorial() {
  const { isOpen, openTutorial, closeTutorial } = useTutorialStore();
  const { mutateAsync: updateProfile } = useUpdateProfile();

  async function completeTutorial() {
    closeTutorial();
    await updateProfile({ tutorialComplete: true });
  }

  async function skipTutorial() {
    closeTutorial();
    await updateProfile({ tutorialComplete: true });
  }

  return { isOpen, openTutorial, completeTutorial, skipTutorial };
}
