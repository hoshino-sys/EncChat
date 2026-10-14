import { useState, useEffect } from 'react';

export interface PeekComboState {
  isAltPressed: boolean;
  isSpacePressed: boolean;
  isComboActive: boolean; // Alt + Space held down
}

/**
 * Hook to track whether the physical Alt + Space combination is pressed down.
 * Intercepts Alt + Space to prevent Windows system context menu or page scrolling.
 */
export function usePeekCombo(): PeekComboState {
  const [isAltPressed, setIsAltPressed] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === 'Alt' || e.altKey) {
        setIsAltPressed(true);
      }

      if (e.code === 'Space' || e.key === ' ') {
        // Prevent browser scrolling and Windows system menu when Alt + Space
        if (e.altKey || isAltPressed) {
          e.preventDefault();
        }
        if (!isInput) {
          setIsSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || !e.altKey) {
        setIsAltPressed(false);
      }
      if (e.code === 'Space' || e.key === ' ') {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsAltPressed(false);
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
  }, [isAltPressed]);

  return {
    isAltPressed,
    isSpacePressed,
    isComboActive: isAltPressed && isSpacePressed,
  };
}

/**
 * Legacy hook backward compatibility
 */
export function useAltKey(): boolean {
  const { isAltPressed } = usePeekCombo();
  return isAltPressed;
}
