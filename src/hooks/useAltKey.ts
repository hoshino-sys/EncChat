import { useState, useEffect } from 'react';

/**
 * Hook to track whether the physical Alt key is currently pressed down.
 * Automatically clears when window blurs to prevent stuck keys.
 */
export function useAltKey(): boolean {
  const [isAltPressed, setIsAltPressed] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.altKey) {
        setIsAltPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || !e.altKey) {
        setIsAltPressed(false);
      }
    };

    const handleBlur = () => {
      setIsAltPressed(false);
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

  return isAltPressed;
}
