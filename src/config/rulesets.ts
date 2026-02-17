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
