import { describe, expect, it } from 'vitest';

import { searchPrefixes, searchTokens } from './search-prefixes.js';

describe('search prefixes', () => {
  it('tokenizes case and accent insensitively', () => {
    expect(searchTokens('Atlántic  AVENUE/Sedan sedan')).toEqual(['atlantic', 'avenue', 'sedan']);
  });

  it('indexes every prefix of every word', () => {
    expect(searchPrefixes('Bronx', undefined, 'Bus')).toEqual([
      'b',
      'br',
      'bro',
      'bron',
      'bronx',
      'bu',
      'bus',
    ]);
  });
});
