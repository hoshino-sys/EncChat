import { useState, useEffect } from 'react';

export interface PeekComboState {
  isCtrlPressed: boolean;
  isSpacePressed: boolean;
  isComboActive: boolean; // Now active whenever Ctrl (or Mac Command) is pressed
}

/**
 * Hook to track whether the Ctrl (or Command on Mac) key is pressed down.
 * Used for PC peek inspection: holding Ctrl + Right-Click reveals messages.
 */
export function usePeekCombo(): PeekComboState {
  const [isCtrlPressed, setIsCtrlPressed] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.ctrlKey || e.metaKey) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || (!e.ctrlKey && !e.metaKey)) {
        setIsCtrlPressed(false);
      }
    };

    const handleBlur = () => {
      setIsCtrlPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return {
    isCtrlPressed,
    isSpacePressed: false,
    isComboActive: isCtrlPressed,
  };
}

/**
 * Legacy hook backward compatibility
 */
export function useAltKey(): boolean {
  const { isComboActive } = usePeekCombo();
  return isComboActive;
}
