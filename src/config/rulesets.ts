import { NewUrlGroup } from '../types';

/**
 * Default rulesets baked into the extension at build time.
 * Edit this file to change which tabs get auto-closed for all users.
 */
export const DEFAULT_RULESETS: readonly NewUrlGroup[] = [
  {
    name: 'Google Docs',
    closeTimeout: 600000,
    matches: [
      'https:\\/\\/docs\\.google\\.com\\/.*',
      'https:\\/\\/sheets\\.google\\.com\\/.*',
      'https:\\/\\/slides\\.google\\.com\\/.*',
    ],
  },
  {
    name: 'Gemini',
    closeTimeout: 3000000,
    matches: ['https:\\/\\/gemini\\.google\\.com\\/.*'],
  },
  {
    name: 'AI Mode',
    closeTimeout: 1200000,
    matches: ['https:\\/\\/www\\.google\\.com\\/search\\?.*udm=50'],
  },
];

/**
 * Catch-all fallback: closes any tab that does not match a specific rule
 * after 1 hour. Always evaluated last in the matching chain.
 */
export const DEFAULT_FALLBACK: NewUrlGroup = {
  name: 'All Tabs',
  closeTimeout: 3_600_000,
  matches: ['.*'],
};
