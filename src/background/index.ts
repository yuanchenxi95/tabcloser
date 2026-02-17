import { findMatchingGroup } from '../matcher';
import { getAllGroups, incrementClosedCount } from '../storage';
import { logEvent } from '../eventLog';

const ICONS = {
  DEFAULT: '/icons/icon128.png',
  ACTION: '/icons/icon128timer.png',
} as const;

const pendingTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

function setTabIcon(tabId: number, iconPath: string): void {
  chrome.action.setIcon({ tabId, path: iconPath });
}

chrome.tabs.onUpdated.addListener(async (tabId, _changes, tab) => {
  if (tab.status !== 'complete' || !tab.url) {
    return;
  }

  const groups = await getAllGroups();
  const matchedGroup = findMatchingGroup(groups, tab.url);

  if (matchedGroup) {
    setTabIcon(tabId, ICONS.ACTION);

    const existingTimeout = pendingTimeouts.get(tabId);
    if (existingTimeout !== undefined) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(async () => {
      try {
        await chrome.tabs.remove(tabId);
        await incrementClosedCount();
        logEvent('TAB_CLOSED', { tabId, groupName: matchedGroup.name });
      } catch (e) {
        logEvent('TAB_CLOSE_FAILED', { tabId, error: String(e) });
      } finally {
        pendingTimeouts.delete(tabId);
      }
    }, matchedGroup.closeTimeout);

    pendingTimeouts.set(tabId, timeoutId);
    logEvent('TAB_MATCHED', { tabId, groupName: matchedGroup.name, url: tab.url });
  } else {
    const existingTimeout = pendingTimeouts.get(tabId);
    if (existingTimeout !== undefined) {
      clearTimeout(existingTimeout);
      pendingTimeouts.delete(tabId);
      setTabIcon(tabId, ICONS.DEFAULT);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const existingTimeout = pendingTimeouts.get(tabId);
  if (existingTimeout !== undefined) {
    clearTimeout(existingTimeout);
    pendingTimeouts.delete(tabId);
  }
});
