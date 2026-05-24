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

// Periodic and triggered scanner to match all open browser tabs against active rulesets
async function scanAllTabs(): Promise<void> {
  logEvent('SCAN_TABS_START');
  try {
    const tabs = await chrome.tabs.query({ windowType: 'normal' });
    const groups = await getAllGroups();
    const seenTabIds = new Set<number>();

    for (const tab of tabs) {
      if (tab.id === undefined || !tab.url) {
        continue;
      }
      seenTabIds.add(tab.id);

      const matchedGroup = findMatchingGroup(groups, tab.url);
      if (matchedGroup) {
        const existing = activeClosures.get(tab.id);

        // If the tab is not tracked yet, or if the URL has changed since we last matched it
        if (existing === undefined || existing.url !== tab.url) {
          setTabIcon(tab.id, ICONS.ACTION);

          if (existing !== undefined) {
            clearTimeout(existing.timeoutId);
          }

          const tabId = tab.id;
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
        }
      } else {
        // If it was tracked but no longer matches under the new rulesets, clear the timer
        const existing = activeClosures.get(tab.id);
        if (existing !== undefined) {
          clearTimeout(existing.timeoutId);
          activeClosures.delete(tab.id);
          setTabIcon(tab.id, ICONS.DEFAULT);
        }
      }
    }

    // Garbage collect activeClosures mapping for tabs that were closed while worker was sleeping
    for (const tabId of activeClosures.keys()) {
      if (!seenTabIds.has(tabId)) {
        const existing = activeClosures.get(tabId);
        if (existing !== undefined) {
          clearTimeout(existing.timeoutId);
        }
        activeClosures.delete(tabId);
      }
    }

    logEvent('SCAN_TABS_SUCCESS', { count: tabs.length });
  } catch (err) {
    logEvent('SCAN_TABS_FAILED', { error: String(err) });
  }
}

// Sync default rulesets and trigger an initial scan on startup/load
syncRemoteDefaults()
  .then(() => scanAllTabs())
  .catch((err) => {
    logEvent('BACKGROUND_SYNC_ERROR', { error: String(err) });
  });

chrome.runtime.onInstalled.addListener(() => {
  syncRemoteDefaults()
    .then(() => scanAllTabs())
    .catch((err) => {
      logEvent('ON_INSTALLED_SYNC_ERROR', { error: String(err) });
    });
});

chrome.runtime.onStartup.addListener(() => {
  syncRemoteDefaults()
    .then(() => scanAllTabs())
    .catch((err) => {
      logEvent('ON_STARTUP_SYNC_ERROR', { error: String(err) });
    });
});

// Listener for popup queries and rule updates
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PENDING_CLOSURES') {
    const list = Array.from(activeClosures.entries()).map(([tabId, data]) => ({
      tabId,
      url: data.url,
      groupName: data.groupName,
      targetCloseTime: data.targetCloseTime,
    }));
    sendResponse(list);
  } else if (message.type === 'RULES_CHANGED' || message.type === 'SCAN_TABS') {
    scanAllTabs().then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
  return true; // Keep message channel open for async response
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url) {
    return;
  }

  // To support automation protocols (CDP) and prevent infinite timer resets on minor updates:
  // Only evaluate rules if the URL itself has changed, or if there is a loading status update.
  const hasUrlChange = changeInfo.url !== undefined;
  const hasStatusChange = changeInfo.status !== undefined;
  if (!hasUrlChange && !hasStatusChange) {
    return;
  }

  const groups = await getAllGroups();
  const matchedGroup = findMatchingGroup(groups, tab.url);

  if (matchedGroup) {
    const existing = activeClosures.get(tabId);

    // If we already have an active closure for this tab AND the URL is identical,
    // we only reset the timer if the page is explicitly loading or reloading.
    // This prevents layout/title updates from extending the lifetime forever.
    if (existing !== undefined && existing.url === tab.url) {
      if (changeInfo.status !== 'loading') {
        // Keep the existing timer but ensure the active action icon is set.
        setTabIcon(tabId, ICONS.ACTION);
        return;
      }
    }

    setTabIcon(tabId, ICONS.ACTION);

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
