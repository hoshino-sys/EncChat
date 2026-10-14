import { useState, useEffect } from 'react';

export interface PeekComboState {
  isCtrlPressed: boolean;
  isSpacePressed: boolean;
  isComboActive: boolean; // Ctrl + Space held down
}

/**
 * Hook to track whether the physical Ctrl + Space combination is pressed down.
 * Intercepts Ctrl + Space to prevent browser default actions, IME conflict, or page scrolling.
 */
export function usePeekCombo(): PeekComboState {
  const [isCtrlPressed, setIsCtrlPressed] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === 'Control' || e.ctrlKey || e.metaKey) {
        setIsCtrlPressed(true);
      }

      if (e.code === 'Space' || e.key === ' ') {
        // Prevent browser scrolling and shortcut conflict when Ctrl + Space
        if (e.ctrlKey || e.metaKey || isCtrlPressed) {
          e.preventDefault();
        }
        if (!isInput) {
          setIsSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || (!e.ctrlKey && !e.metaKey)) {
        setIsCtrlPressed(false);
      }
      if (e.code === 'Space' || e.key === ' ') {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsCtrlPressed(false);
      setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isCtrlPressed]);

  return {
    isCtrlPressed,
    isSpacePressed,
    isComboActive: isCtrlPressed && isSpacePressed,
  };
}

/**
 * Legacy hook backward compatibility
 */
export function useAltKey(): boolean {
  const { isComboActive } = usePeekCombo();
  return isComboActive;
}
