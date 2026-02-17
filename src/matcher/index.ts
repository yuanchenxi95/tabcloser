import { UrlGroup } from '../types';
import { logEvent } from '../eventLog';

export function findMatchingGroup(
  groups: readonly UrlGroup[],
  url: string,
): UrlGroup | undefined {
  for (const group of groups) {
    const matched = group.matches.some((pattern) => {
      try {
        return new RegExp(pattern).test(url);
      } catch {
        logEvent('INVALID_REGEX_PATTERN', {
          groupName: group.name,
          pattern,
        });
        return false;
      }
    });
    if (matched) {
      return group;
    }
  }
  return undefined;
}
