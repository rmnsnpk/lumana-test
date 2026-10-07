import { MAX_SEARCH_PREFIXES } from '../consts/search.consts.js';

export const searchTokens = (value: string): string[] => [
  ...new Set(
    value
      .normalize('NFKD')
      .toLocaleLowerCase()
      .replace(/[̀-ͯ]/g, '')
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  ),
];

export const searchPrefixes = (...values: Array<string | undefined>): string[] => {
  const prefixes = new Set<string>();

  for (const word of searchTokens(values.filter(Boolean).join(' '))) {
    for (let length = 1; length <= word.length; length++) {
      prefixes.add(word.slice(0, length));
      if (prefixes.size >= MAX_SEARCH_PREFIXES) return [...prefixes];
    }
  }

  return [...prefixes];
};
