import { findMatchingGroup } from '../matcher';
import {
  getAllGroups,
  incrementClosedCount,
  syncRemoteDefaults,
  addHistoryEntry,
  getActiveCountdowns,
  saveActiveCountdowns,
} from '../storage';
import { logEvent } from '../eventLog';
import { ActiveCountdown } from '../types';

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
  if (message.type === 'GET_PENDING_CLOSURES') {
    getActiveCountdowns().then((countdowns) => {
      const list = countdowns.map((c) => ({
        tabId: c.tabId,
        url: c.url,
        groupName: c.groupName,
        targetCloseTime: c.initializedTime + c.closeTimeout,
      }));
      sendResponse(list);
    });
    return true; // Keep message channel open for async response
  } else if (message.type === 'RULES_CHANGED' || message.type === 'SCAN_TABS') {
    scanAndCloseTabs().then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
  return true;
});

// Core Scan and Close state machine
async function scanAndCloseTabs(): Promise<void> {
  logEvent('SCAN_TABS_START');
  try {
    const tabs = await chrome.tabs.query({ windowType: 'normal' });
    const groups = await getAllGroups();
    const currentRegistry = await getActiveCountdowns();

    const openTabMap = new Map<number, chrome.tabs.Tab>();
    const seenTabIds = new Set<number>();

    for (const tab of tabs) {
      if (tab.id !== undefined) {
        openTabMap.set(tab.id, tab);
        seenTabIds.add(tab.id);
      }
    }

    const registryMap = new Map<number, ActiveCountdown>();
    for (const item of currentRegistry) {
      registryMap.set(item.tabId, item);
    }

    const nextRegistry: ActiveCountdown[] = [];

    for (const tab of tabs) {
      if (tab.id === undefined || !tab.url) {
        continue;
      }

      const matchedGroup = findMatchingGroup(groups, tab.url);
      if (matchedGroup) {
        const existing = registryMap.get(tab.id);

        if (existing !== undefined && existing.url === tab.url) {
          // Tab is already tracked! Let's calculate the elapsed time since initialization
          const elapsed = Date.now() - existing.initializedTime;
          if (elapsed >= existing.closeTimeout) {
            // Time is UP! Close the tab.
            try {
              await chrome.tabs.remove(tab.id);
              await incrementClosedCount();
              await addHistoryEntry({ url: tab.url, groupName: existing.groupName, status: 'closed' });
              logEvent('TAB_CLOSED', { tabId: tab.id, groupName: existing.groupName, url: tab.url });
            } catch (e) {
              await addHistoryEntry({
                url: tab.url,
                groupName: existing.groupName,
                status: 'failed',
                error: String(e),
              });
              logEvent('TAB_CLOSE_FAILED', { tabId: tab.id, error: String(e), url: tab.url });
            }
            // Since the tab was closed, we do not add it to nextRegistry!
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
            url: tab.url,
            groupName: matchedGroup.name,
            initializedTime: Date.now(),
            closeTimeout: matchedGroup.closeTimeout,
          };
          nextRegistry.push(newCountdown);
          setTabIcon(tab.id, ICONS.ACTION);
          logEvent('TAB_INITIALIZED', { tabId: tab.id, groupName: matchedGroup.name, url: tab.url });
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
  if (!tab.url) {
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
