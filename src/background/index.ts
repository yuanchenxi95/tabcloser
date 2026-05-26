import { findMatchingGroup } from '../matcher';
import {
  getAllGroups,
  incrementClosedCount,
  syncRemoteDefaults,
  addHistoryEntry,
  getActiveCountdowns,
  saveActiveCountdowns,
  getEnabled,
  getSettings,
} from '../storage';
import { logEvent } from '../eventLog';
import { ActiveCountdown, ExtensionSettings } from '../types';

const ICONS = {
  DEFAULT: '/icons/icon128.png',
  ACTION: '/icons/icon128timer.png',
} as const;

function setTabIcon(tabId: number, iconPath: string): void {
  try {
    chrome.action.setIcon({ tabId, path: iconPath });
  } catch (e) {
    // Ignore error in case the tab is already removed
  }
}

// Sync default rulesets from remote on service worker startup, install, and browser startup.
syncRemoteDefaults()
  .then(() => scanAndCloseTabs())
  .catch((err) => {
    logEvent('BACKGROUND_SYNC_ERROR', { error: String(err) });
  });

chrome.runtime.onInstalled.addListener(() => {
  syncRemoteDefaults()
    .then(() => scanAndCloseTabs())
    .catch((err) => {
      logEvent('ON_INSTALLED_SYNC_ERROR', { error: String(err) });
    });
});

chrome.runtime.onStartup.addListener(() => {
  syncRemoteDefaults()
    .then(() => scanAndCloseTabs())
    .catch((err) => {
      logEvent('ON_STARTUP_SYNC_ERROR', { error: String(err) });
    });
});

// Setup 1-minute alarm to wake up MV3 Service Worker and check countdowns periodically
chrome.alarms.create('periodic-scan', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodic-scan') {
    scanAndCloseTabs();
  }
});

// Setup 10-second active interval when service worker is awake
setInterval(() => {
  scanAndCloseTabs();
}, 10000);

// Listener for popup queries and rule updates
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && typeof message === 'object') {
    if (message.type === 'GET_PENDING_CLOSURES') {
      scanAndCloseTabs().then(() => {
        getActiveCountdowns().then((countdowns) => {
          const list = countdowns.map((c) => ({
            tabId: c.tabId,
            url: c.url,
            groupName: c.groupName,
            targetCloseTime: c.initializedTime + c.closeTimeout,
          }));
          sendResponse(list);
        });
      });
      return true; // Keep message channel open for async response
    } else if (message.type === 'RULES_CHANGED' || message.type === 'SCAN_TABS') {
      scanAndCloseTabs().then(() => {
        sendResponse({ success: true });
      });
      return true;
    }
  }
  return false;
});

// Core Scan and Close state machine
async function scanAndCloseTabs(): Promise<void> {
  logEvent('SCAN_TABS_START');
  try {
    const enabled = await getEnabled();
    if (!enabled) {
      const current = await getActiveCountdowns();
      for (const c of current) {
        setTabIcon(c.tabId, ICONS.DEFAULT);
      }
      await saveActiveCountdowns([]);
      return;
    }

    const tabs = await chrome.tabs.query({}); // Query all tabs in all windows (normal, popup, and automation debugger windows)
    const groups = await getAllGroups();
    const currentRegistry = await getActiveCountdowns();
    const settings = await getSettings();

    const openTabMap = new Map<number, chrome.tabs.Tab>();
    const seenTabIds = new Set<number>();

    for (const tab of tabs) {
      if (tab.id !== undefined) {
        openTabMap.set(tab.id, tab);
        seenTabIds.add(tab.id);
      }
    }

    // Count tabs per window to identify "last tab in window"
    const windowTabCounts = new Map<number, number>();
    for (const tab of tabs) {
      if (tab.windowId !== undefined) {
        windowTabCounts.set(tab.windowId, (windowTabCounts.get(tab.windowId) || 0) + 1);
      }
    }

    const registryMap = new Map<number, ActiveCountdown>();
    for (const item of currentRegistry) {
      registryMap.set(item.tabId, item);
    }

    const nextRegistry: ActiveCountdown[] = [];

    for (const tab of tabs) {
      const url = tab.url || tab.pendingUrl;
      if (tab.id === undefined || !url) {
        continue;
      }

      const matchedGroup = findMatchingGroup(groups, url);
      if (matchedGroup) {
        const existing = registryMap.get(tab.id);

        if (existing !== undefined && existing.url === url) {
          // Tab is already tracked! Let's calculate the elapsed time since initialization
          const elapsed = Date.now() - existing.initializedTime;
          if (elapsed >= existing.closeTimeout) {
            // Time is UP!
            const isLastTabInWindow = (windowTabCounts.get(tab.windowId) || 0) <= 1;
            const shouldExcludeActive = settings.protectActiveTab && tab.active;
            const shouldExcludeLast = settings.protectLastTab && isLastTabInWindow;

            if (shouldExcludeActive || shouldExcludeLast) {
              // Postpone close: keep original countdown so it fires on next scan after protection lifts
              nextRegistry.push(existing);
              setTabIcon(tab.id, ICONS.ACTION);
            } else {
              // Close the tab!
              let fallbackTab: chrome.tabs.Tab | undefined;
              try {
                if (isLastTabInWindow) {
                  // Fallback: open google.com first!
                  fallbackTab = await chrome.tabs.create({
                    windowId: tab.windowId,
                    url: 'https://www.google.com',
                    active: true,
                  });
                  windowTabCounts.set(tab.windowId, (windowTabCounts.get(tab.windowId) || 0) + 1);
                }
                await chrome.tabs.remove(tab.id);
                windowTabCounts.set(tab.windowId, (windowTabCounts.get(tab.windowId) || 1) - 1);
                await incrementClosedCount();
                await addHistoryEntry({ url, groupName: existing.groupName, status: 'closed' });
                logEvent('TAB_CLOSED', { tabId: tab.id, groupName: existing.groupName, url });
              } catch (e) {
                // Roll back the fallback tab if removal failed
                if (fallbackTab?.id !== undefined) {
                  try { await chrome.tabs.remove(fallbackTab.id); } catch { /* ignore */ }
                }
                await addHistoryEntry({
                  url,
                  groupName: existing.groupName,
                  status: 'failed',
                  error: String(e),
                });
                logEvent('TAB_CLOSE_FAILED', { tabId: tab.id, error: String(e), url });
              }
            }
          } else {
            // Time is not up yet, keep tracking it in the nextRegistry
            nextRegistry.push(existing);
            setTabIcon(tab.id, ICONS.ACTION);
          }
        } else {
          // This is the FIRST time this tab shows up in our list or the URL changed!
          // We say it is INITIALIZED!
          const newCountdown: ActiveCountdown = {
            tabId: tab.id,
            url,
            groupName: matchedGroup.name,
            initializedTime: Date.now(),
            closeTimeout: matchedGroup.closeTimeout,
          };
          nextRegistry.push(newCountdown);
          setTabIcon(tab.id, ICONS.ACTION);
          logEvent('TAB_INITIALIZED', { tabId: tab.id, groupName: matchedGroup.name, url });
        }
      } else {
        // Tab does not match any rules. If it was tracked, clear its action icon
        const existing = registryMap.get(tab.id);
        if (existing !== undefined) {
          setTabIcon(tab.id, ICONS.DEFAULT);
        }
      }
    }

    await saveActiveCountdowns(nextRegistry);
    logEvent('SCAN_TABS_SUCCESS', { openCount: tabs.length, activeCountdowns: nextRegistry.length });
  } catch (err) {
    logEvent('SCAN_TABS_FAILED', { error: String(err) });
  }
}

// Bind tab event listeners to trigger immediate scan-and-close runs
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const url = tab.url || tab.pendingUrl;
  if (!url) {
    return;
  }
  const hasUrlChange = changeInfo.url !== undefined;
  const hasStatusChange = changeInfo.status !== undefined;
  if (hasUrlChange || hasStatusChange) {
    scanAndCloseTabs();
  }
});

chrome.tabs.onRemoved.addListener(() => {
  scanAndCloseTabs();
});
