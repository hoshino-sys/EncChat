import { useState, useEffect, useRef } from 'react';

const ARCANE_RUNES = [
  'ᚠ', 'ᚡ', 'ᚢ', 'ᚣ', 'ᚤ', 'ᚥ', 'ᚦ', 'ᚧ',
  'ᚐ', 'ᚑ', 'ᚒ', 'ᚓ', 'ᚔ', 'ᚕ', 'ᚖ', 'ᚗ', 'ᚘ', 'ᚙ', 'ᚚ',
  'ᛊ', 'ᛋ', 'ᛌ', 'ᛍ', 'ᛎ', 'ᛏ', 'ᛐ', 'ᛑ', 'ᛒ', 'ᛓ', 'ᛔ', 'ᛕ',
  'ᛖ', 'ᛗ', 'ᛘ', 'ᛙ', 'ᛚ', 'ᛛ', 'ᛜ', 'ᛝ', 'ᛞ', 'ᛟ',
  '✦', '✧', '☿', '♁', '⚚', '◬', '⬡', '⬢', '◈', '❖', '⌬'
];

function getRandomRune(): string {
  return ARCANE_RUNES[Math.floor(Math.random() * ARCANE_RUNES.length)];
}

interface UseScrambleDecryptOptions {
  targetText: string;
  maskedRunes: string;
  isRevealed: boolean;
  revealDurationMs?: number;
  hideDurationMs?: number;
}

export function useScrambleDecrypt({
  targetText,
  maskedRunes,
  isRevealed,
  revealDurationMs = 280,
  hideDurationMs = 120,
}: UseScrambleDecryptOptions): string {
  const [displayText, setDisplayText] = useState(() => (isRevealed ? targetText : maskedRunes));
  const rafRef = useRef<number | null>(null);
  const wasRevealedRef = useRef<boolean>(isRevealed);

  useEffect(() => {
    // If state hasn't changed, just keep target in sync if text changed
    if (wasRevealedRef.current === isRevealed) {
      if (isRevealed) {
        setDisplayText(targetText);
      } else {
        setDisplayText(maskedRunes);
      }
      return;
    }

    wasRevealedRef.current = isRevealed;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    const targetArray = Array.from(isRevealed ? targetText : maskedRunes);
    const totalChars = targetArray.length;
    if (totalChars === 0) {
      setDisplayText('');
      return;
    }

    const duration = isRevealed ? revealDurationMs : hideDurationMs;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Number of characters already resolved
      const resolvedCount = Math.floor(progress * totalChars);

      let currentScramble = '';
      for (let i = 0; i < totalChars; i++) {
        if (i < resolvedCount) {
          // Resolved into target character
          currentScramble += targetArray[i];
        } else if (i === resolvedCount && progress > 0.9) {
          currentScramble += targetArray[i];
        } else {
          // Still scrambling with mystical runes
          currentScramble += getRandomRune();
        }
      }

      setDisplayText(currentScramble);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(isRevealed ? targetText : maskedRunes);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isRevealed, targetText, maskedRunes, revealDurationMs, hideDurationMs]);

  return displayText;
}
