import {
  STORAGE_KEYS,
  LocalStorageData,
  StatsData,
  UrlGroup,
  NewUrlGroup,
  SyncStatus,
  HistoryEntry,
  ActiveCountdown,
} from '../types';
import { isNewUrlGroupArray } from '../types/typeGuards';
import { DEFAULT_RULESETS, DEFAULT_FALLBACK } from '../config/rulesets';
import { generateId } from '../idGenerator';
import { logEvent } from '../eventLog';

async function getStorageValue<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get([key]);
  const raw: unknown = result[key];
  if (raw === undefined || raw === null) {
    return fallback;
  }
  return raw as T;
}

async function setStorageValue<T>(key: string, data: T): Promise<void> {
  await chrome.storage.local.set({ [key]: data });
}

const EMPTY_LOCAL: LocalStorageData = { groups: [] };

export async function getLocalData(): Promise<LocalStorageData> {
  return getStorageValue(STORAGE_KEYS.LOCAL, EMPTY_LOCAL);
}

export async function saveLocalData(data: LocalStorageData): Promise<void> {
  return setStorageValue(STORAGE_KEYS.LOCAL, data);
}

export async function saveLocalGroup(group: UrlGroup): Promise<void> {
  const current = await getLocalData();
  const exists = current.groups.some((g) => g.id === group.id);
  if (exists) {
    await saveLocalData({
      groups: current.groups.map((g) => (g.id === group.id ? group : g)),
    });
  } else {
    await saveLocalData({ groups: [...current.groups, group] });
  }
}

export async function removeLocalGroupById(id: string): Promise<void> {
  const current = await getLocalData();
  await saveLocalData({
    groups: current.groups.filter((g) => g.id !== id),
  });
}

export async function importLocalData(
  data: LocalStorageData,
  replace: boolean,
): Promise<void> {
  if (replace) {
    return saveLocalData(data);
  }
  const current = await getLocalData();
  return saveLocalData({
    groups: [...current.groups, ...data.groups],
  });
}

const EMPTY_STATS: StatsData = { allClosed: 0 };

export async function getStats(): Promise<StatsData> {
  return getStorageValue(STORAGE_KEYS.STATS, EMPTY_STATS);
}

export async function incrementClosedCount(): Promise<void> {
  const stats = await getStats();
  await setStorageValue(STORAGE_KEYS.STATS, {
    allClosed: stats.allClosed + 1,
  });
}

const CONFIG_URL = 'https://raw.githubusercontent.com/yuanchenxi95/tabcloser/main/default_rules.json';

export async function getSyncStatus(): Promise<SyncStatus> {
  const lastSyncTime = await getStorageValue<string | null>(STORAGE_KEYS.LAST_SYNC, null);
  const error = await getStorageValue<string | null>(STORAGE_KEYS.SYNC_ERROR, null);
  return { lastSyncTime, error };
}

export async function syncRemoteDefaults(): Promise<SyncStatus> {
  logEvent('REMOTE_SYNC_START');
  try {
    const response = await fetch(CONFIG_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: unknown = await response.json();
    if (!isNewUrlGroupArray(data)) {
      throw new Error('Invalid rulesets structure returned from server');
    }
    await setStorageValue(STORAGE_KEYS.REMOTE_DEFAULTS, data);
    await setStorageValue(STORAGE_KEYS.SYNC_ERROR, null);
    
    const now = new Date().toISOString();
    await setStorageValue(STORAGE_KEYS.LAST_SYNC, now);
    logEvent('REMOTE_SYNC_SUCCESS', { timestamp: now });
    return { lastSyncTime: now, error: null };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await setStorageValue(STORAGE_KEYS.SYNC_ERROR, errMsg);
    logEvent('REMOTE_SYNC_FAILED', { error: errMsg });
    const lastSyncTime = await getStorageValue<string | null>(STORAGE_KEYS.LAST_SYNC, null);
    return { lastSyncTime, error: errMsg };
  }
}

export async function getMergedDefaultGroups(): Promise<readonly UrlGroup[]> {
  const cached = await getStorageValue<readonly NewUrlGroup[] | null>(STORAGE_KEYS.REMOTE_DEFAULTS, null);
  const rules = cached || DEFAULT_RULESETS;
  return rules.map((g) => ({
    id: `default-${g.name.replace(/\s+/g, '-').toLowerCase()}`,
    name: g.name,
    closeTimeout: g.closeTimeout,
    matches: [...g.matches],
  }));
}

export function getDefaultFallbackGroup(): UrlGroup {
  return {
    id: generateId(),
    name: DEFAULT_FALLBACK.name,
    closeTimeout: DEFAULT_FALLBACK.closeTimeout,
    matches: [...DEFAULT_FALLBACK.matches],
  };
}

export async function getAllGroups(): Promise<readonly UrlGroup[]> {
  const [local, defaults] = await Promise.all([
    getLocalData(),
    getMergedDefaultGroups(),
  ]);
  const hasFallback = defaults.some((g) => g.name === 'All Tabs');
  const fallbackList = hasFallback ? [] : [getDefaultFallbackGroup()];
  return [...defaults, ...local.groups, ...fallbackList];
}

export async function getHistory(): Promise<readonly HistoryEntry[]> {
  return getStorageValue<readonly HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
}

export async function addHistoryEntry(
  entry: Omit<HistoryEntry, 'id' | 'timestamp'>,
): Promise<void> {
  const current = await getHistory();
  const maxUrlLength = 512;
  const truncatedUrl =
    entry.url.length > maxUrlLength
      ? entry.url.substring(0, maxUrlLength) + '...'
      : entry.url;

  const newEntry: HistoryEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    ...entry,
    url: truncatedUrl,
  };
  await setStorageValue(STORAGE_KEYS.HISTORY, [newEntry, ...current].slice(0, 100));
}

export async function clearHistory(): Promise<void> {
  await setStorageValue(STORAGE_KEYS.HISTORY, []);
}

export async function getActiveCountdowns(): Promise<readonly ActiveCountdown[]> {
  return getStorageValue<readonly ActiveCountdown[]>(STORAGE_KEYS.ACTIVE_COUNTDOWNS, []);
}

export async function saveActiveCountdowns(countdowns: readonly ActiveCountdown[]): Promise<void> {
  await setStorageValue(STORAGE_KEYS.ACTIVE_COUNTDOWNS, countdowns);
}
