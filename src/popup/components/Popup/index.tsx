import { useCallback, useEffect, useState } from 'react';
import { App, ConfigProvider, theme } from 'antd';
import {
  getLocalData,
  getMergedDefaultGroups,
  getDefaultFallbackGroup,
  removeLocalGroupById,
  getStats,
  getSyncStatus,
  syncRemoteDefaults,
} from '../../../storage';
import {
  PopupMode,
  UrlGroup,
  DisplayGroup,
  GroupSource,
  StatsData,
  SyncStatus,
} from '../../../types';
import { exhaustiveSwitchGuard } from '../../../types/exhaustiveSwitchGuard';
import { DefaultView } from './DefaultView';
import { SaveModal } from './SaveModal';
import { ConfirmRemoveModal } from './ConfirmRemoveModal';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';

export function Popup() {
  const [mode, setMode] = useState<PopupMode>(PopupMode.DEFAULT);
  const [displayGroups, setDisplayGroups] = useState<readonly DisplayGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<UrlGroup | undefined>();
  const [stats, setStats] = useState<StatsData>({ allClosed: 0 });
  const [groupToRemoveId, setGroupToRemoveId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ lastSyncTime: null, error: null });
  const [isSyncing, setIsSyncing] = useState(false);

  const reloadState = useCallback(async () => {
    const [local, currentStats, defaults, currentSync] = await Promise.all([
      getLocalData(),
      getStats(),
      getMergedDefaultGroups(),
      getSyncStatus(),
    ]);
    const hasFallback = defaults.some((g) => g.name === 'All Tabs');
    const fallback = getDefaultFallbackGroup();
    const merged: DisplayGroup[] = [
      ...defaults.map(
        (g): DisplayGroup => ({ source: GroupSource.DEFAULT, group: g }),
      ),
      ...local.groups.map(
        (g): DisplayGroup => ({ source: GroupSource.LOCAL, group: g }),
      ),
      ...(hasFallback ? [] : [{ source: GroupSource.DEFAULT, group: fallback }]),
    ];
    setDisplayGroups(merged);
    setStats(currentStats);
    setSyncStatus(currentSync);
  }, []);

  useEffect(() => {
    reloadState().then(async () => {
      // Auto-sync in popup if last sync was more than 24h ago
      const status = await getSyncStatus();
      const lastSync = status.lastSyncTime ? new Date(status.lastSyncTime).getTime() : 0;
      const now = Date.now();
      if (now - lastSync > 86400000) {
        setIsSyncing(true);
        try {
          await syncRemoteDefaults();
        } finally {
          setIsSyncing(false);
          reloadState();
        }
      }
    });
  }, [reloadState]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncRemoteDefaults();
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'RULES_CHANGED' });
      }
    } finally {
      setIsSyncing(false);
      await reloadState();
    }
  }, [reloadState]);

  const goToDefault = useCallback(() => {
    setMode(PopupMode.DEFAULT);
    reloadState();
  }, [reloadState]);

  const handleEdit = useCallback(
    (id: string) => {
      const found = displayGroups.find(
        (dg) => dg.source === GroupSource.LOCAL && dg.group.id === id,
      );
      if (found) {
        setSelectedGroup(found.group);
        setMode(PopupMode.EDIT);
      }
    },
    [displayGroups],
  );

  const handleRemoveClick = useCallback((id: string) => {
    setGroupToRemoveId(id);
    setMode(PopupMode.CONFIRM_REMOVE);
  }, []);

  const handleRemoveConfirm = useCallback(async () => {
    if (groupToRemoveId) {
      await removeLocalGroupById(groupToRemoveId);
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'RULES_CHANGED' });
      }
    }
    goToDefault();
  }, [groupToRemoveId, goToDefault]);

  const renderContent = () => {
    switch (mode) {
      case PopupMode.DEFAULT:
        return (
          <DefaultView
            displayGroups={displayGroups}
            stats={stats}
            onEdit={handleEdit}
            onRemove={handleRemoveClick}
            onCreate={() => setMode(PopupMode.CREATE_NEW)}
            onExport={() => setMode(PopupMode.EXPORT)}
            onImport={() => setMode(PopupMode.IMPORT)}
            syncStatus={syncStatus}
            isSyncing={isSyncing}
            onSync={handleSync}
          />
        );
      case PopupMode.CREATE_NEW:
        return <SaveModal onClose={goToDefault} />;
      case PopupMode.EDIT:
        return <SaveModal onClose={goToDefault} existingGroup={selectedGroup} />;
      case PopupMode.CONFIRM_REMOVE:
        return (
          <ConfirmRemoveModal
            onConfirm={handleRemoveConfirm}
            onCancel={goToDefault}
          />
        );
      case PopupMode.EXPORT:
        return <ExportModal onClose={goToDefault} />;
      case PopupMode.IMPORT:
        return <ImportModal onClose={goToDefault} />;
      default:
        return exhaustiveSwitchGuard(mode);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: { fontSize: 13 },
      }}
    >
      <App>
        <div style={{ width: 380, padding: 12 }}>{renderContent()}</div>
      </App>
    </ConfigProvider>
  );
}
