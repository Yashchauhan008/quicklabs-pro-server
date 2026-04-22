/** Counts words as runs of non-whitespace (line breaks count as separators, not words). */
export function countWords(s: string): number {
  const m = s.trim().match(/\S+/g);
  return m ? m.length : 0;
}

export const BIO_MAX_WORDS = 100;
