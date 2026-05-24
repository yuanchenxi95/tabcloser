import { findMatchingGroup } from '../matcher';
import {
  getAllGroups,
  incrementClosedCount,
  syncRemoteDefaults,
  addHistoryEntry,
} from '../storage';
import { logEvent } from '../eventLog';

const ICONS = {
  DEFAULT: '/icons/icon128.png',
  ACTION: '/icons/icon128timer.png',
} as const;

type ActiveClosure = {
  readonly url: string;
  readonly groupName: string;
  readonly targetCloseTime: number;
  readonly timeoutId: ReturnType<typeof setTimeout>;
};

const activeClosures = new Map<number, ActiveClosure>();

function setTabIcon(tabId: number, iconPath: string): void {
  chrome.action.setIcon({ tabId, path: iconPath });
}

// Sync default rulesets from remote on service worker startup, install, and browser startup.
syncRemoteDefaults().catch((err) => {
  logEvent('BACKGROUND_SYNC_ERROR', { error: String(err) });
});

chrome.runtime.onInstalled.addListener(() => {
  syncRemoteDefaults().catch((err) => {
    logEvent('ON_INSTALLED_SYNC_ERROR', { error: String(err) });
  });
});

chrome.runtime.onStartup.addListener(() => {
  syncRemoteDefaults().catch((err) => {
    logEvent('ON_STARTUP_SYNC_ERROR', { error: String(err) });
  });
});

// Listener for popup queries regarding active closures
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PENDING_CLOSURES') {
    const list = Array.from(activeClosures.entries()).map(([tabId, data]) => ({
      tabId,
      url: data.url,
      groupName: data.groupName,
      targetCloseTime: data.targetCloseTime,
    }));
    sendResponse(list);
  }
  return true; // Keep message channel open for async response
});

chrome.tabs.onUpdated.addListener(async (tabId, _changes, tab) => {
  if (tab.status !== 'complete' || !tab.url) {
    return;
  }

  const groups = await getAllGroups();
  const matchedGroup = findMatchingGroup(groups, tab.url);

  if (matchedGroup) {
    setTabIcon(tabId, ICONS.ACTION);

    const existing = activeClosures.get(tabId);
    if (existing !== undefined) {
      clearTimeout(existing.timeoutId);
      activeClosures.delete(tabId);
    }

    const url = tab.url;
    const targetCloseTime = Date.now() + matchedGroup.closeTimeout;

    const timeoutId = setTimeout(async () => {
      try {
        await chrome.tabs.remove(tabId);
        await incrementClosedCount();
        await addHistoryEntry({ url, groupName: matchedGroup.name, status: 'closed' });
        logEvent('TAB_CLOSED', { tabId, groupName: matchedGroup.name, url });
      } catch (e) {
        await addHistoryEntry({
          url,
          groupName: matchedGroup.name,
          status: 'failed',
          error: String(e),
        });
        logEvent('TAB_CLOSE_FAILED', { tabId, error: String(e), url });
      } finally {
        activeClosures.delete(tabId);
      }
    }, matchedGroup.closeTimeout);

    activeClosures.set(tabId, {
      url,
      groupName: matchedGroup.name,
      targetCloseTime,
      timeoutId,
    });
    logEvent('TAB_MATCHED', { tabId, groupName: matchedGroup.name, url });
  } else {
    const existing = activeClosures.get(tabId);
    if (existing !== undefined) {
      clearTimeout(existing.timeoutId);
      activeClosures.delete(tabId);
      setTabIcon(tabId, ICONS.DEFAULT);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const existing = activeClosures.get(tabId);
  if (existing !== undefined) {
    clearTimeout(existing.timeoutId);
    activeClosures.delete(tabId);
  }
});
