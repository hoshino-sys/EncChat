/**
 * MaskCipher: Generates 1:1 arcane/runic cipher glyphs strictly matching character counts.
 */

const ESOTERIC_GLYPHS = [
  'ᚠ', 'ᚡ', 'ᚢ', 'ᚣ', 'ᚤ', 'ᚥ', 'ᚦ', 'ᚧ',
  'ᚐ', 'ᚑ', 'ᚒ', 'ᚓ', 'ᚔ', 'ᚕ', 'ᚖ', 'ᚗ', 'ᚘ', 'ᚙ', 'ᚚ',
  'ᛊ', 'ᛋ', 'ᛌ', 'ᛍ', 'ᛎ', 'ᛏ', 'ᛐ', 'ᛑ', 'ᛒ', 'ᛓ', 'ᛔ', 'ᛕ',
  'ᛖ', 'ᛗ', 'ᛘ', 'ᛙ', 'ᛚ', 'ᛛ', 'ᛜ', 'ᛝ', 'ᛞ', 'ᛟ',
  '✦', '✧', '☿', '♁', '⚚', '◬', '⬡', '⬢', '◈', '❖', '⌬'
];

/**
 * Deterministically generates an exact 1:1 string of esoteric glyphs
 * matching the length of the given character count.
 */
export function generateMaskedRunes(count: number, seed: string = 'rune'): string {
  if (count <= 0) return '';

  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  let result = '';
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (i + 31), 16777619);
    const index = Math.abs(h) % ESOTERIC_GLYPHS.length;
    result += ESOTERIC_GLYPHS[index];
  }

  return result;
}

/**
 * Get accurate unicode character count (supporting CJK and multi-byte characters)
 */
export function getCharCount(str: string): number {
  if (!str) return 0;
  return Array.from(str).length;
}
