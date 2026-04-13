import {
  STORAGE_KEYS,
  LocalStorageData,
  StatsData,
  UrlGroup,
} from '../types';
import { DEFAULT_RULESETS, DEFAULT_FALLBACK } from '../config/rulesets';
import { generateId } from '../idGenerator';

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

export function getDefaultGroups(): readonly UrlGroup[] {
  return DEFAULT_RULESETS.map((g) => ({
    id: generateId(),
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
  const local = await getLocalData();
  return [...getDefaultGroups(), ...local.groups, getDefaultFallbackGroup()];
}
