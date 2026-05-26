import { Statistic, Switch, Tabs } from 'antd';
import { SettingOutlined, SyncOutlined, HistoryOutlined, BarsOutlined } from '@ant-design/icons';
import { DisplayGroup, StatsData, SyncStatus } from '../../../types';
import { ConfigTab } from './ConfigTab';
import { SyncTab } from './SyncTab';
import { HistoryTab } from './HistoryTab';
import { SettingsTab } from './SettingsTab';

interface Props {
  readonly displayGroups: readonly DisplayGroup[];
  readonly stats: StatsData;
  readonly onEdit: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onCreate: () => void;
  readonly onExport: () => void;
  readonly onImport: () => void;
  readonly syncStatus: SyncStatus;
  readonly isSyncing: boolean;
  readonly onSync: () => void;
  readonly isEnabled: boolean;
  readonly onToggleEnabled: (value: boolean) => void;
}

export function DefaultView({
  displayGroups,
  stats,
  onEdit,
  onRemove,
  onCreate,
  onExport,
  onImport,
  syncStatus,
  isSyncing,
  onSync,
  isEnabled,
  onToggleEnabled,
}: Props) {
  const tabItems = [
    {
      key: 'config',
      label: (
        <span>
          <BarsOutlined /> Rules
        </span>
      ),
      children: (
        <ConfigTab
          displayGroups={displayGroups}
          onEdit={onEdit}
          onRemove={onRemove}
          onCreate={onCreate}
          onExport={onExport}
          onImport={onImport}
        />
      ),
    },
    {
      key: 'sync',
      label: (
        <span>
          <SyncOutlined spin={isSyncing} /> Sync
        </span>
      ),
      children: (
        <SyncTab
          syncStatus={syncStatus}
          isSyncing={isSyncing}
          onSync={onSync}
          displayGroups={displayGroups}
        />
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined /> History
        </span>
      ),
      children: <HistoryTab />,
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined /> Settings
        </span>
      ),
      children: <SettingsTab />,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Statistic
          title="Total tabs closed"
          value={stats.allClosed}
          valueStyle={{ fontSize: 18, fontWeight: 'bold', color: isEnabled ? '#1677ff' : '#8c8c8c' }}
        />
        <Switch
          checked={isEnabled}
          onChange={onToggleEnabled}
          checkedChildren="ON"
          unCheckedChildren="OFF"
        />
      </div>

      <Tabs
        defaultActiveKey="config"
        items={tabItems}
        size="small"
        animated={{ inkBar: true, tabPane: false }}
      />
    </div>
  );
}
