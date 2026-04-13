import { useCallback, useEffect, useState } from 'react';
import { App, ConfigProvider, theme } from 'antd';
import {
  getLocalData,
  getDefaultGroups,
  getDefaultFallbackGroup,
  removeLocalGroupById,
  getStats,
} from '../../../storage';
import {
  PopupMode,
  UrlGroup,
  DisplayGroup,
  GroupSource,
  StatsData,
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

  const reloadState = useCallback(async () => {
    const [local, currentStats] = await Promise.all([
      getLocalData(),
      getStats(),
    ]);
    const defaults = getDefaultGroups();
    const fallback = getDefaultFallbackGroup();
    const merged: DisplayGroup[] = [
      ...defaults.map(
        (g): DisplayGroup => ({ source: GroupSource.DEFAULT, group: g }),
      ),
      ...local.groups.map(
        (g): DisplayGroup => ({ source: GroupSource.LOCAL, group: g }),
      ),
      { source: GroupSource.DEFAULT, group: fallback },
    ];
    setDisplayGroups(merged);
    setStats(currentStats);
  }, []);

  useEffect(() => {
    reloadState();
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
