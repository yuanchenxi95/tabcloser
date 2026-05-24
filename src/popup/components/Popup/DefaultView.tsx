import { Statistic, Tabs } from 'antd';
import { SettingOutlined, SyncOutlined, HistoryOutlined } from '@ant-design/icons';
import { DisplayGroup, StatsData, SyncStatus } from '../../../types';
import { ConfigTab } from './ConfigTab';
import { SyncTab } from './SyncTab';
import { HistoryTab } from './HistoryTab';

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
}: Props) {
  const tabItems = [
    {
      key: 'config',
      label: (
        <span>
          <SettingOutlined /> Rules
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
  ];

  return (
    <div>
      <Statistic
        title="Total tabs closed"
        value={stats.allClosed}
        style={{ marginBottom: 12 }}
        valueStyle={{ fontSize: 18, fontWeight: 'bold', color: '#1677ff' }}
      />

      <Tabs
        defaultActiveKey="config"
        items={tabItems}
        size="small"
        animated={{ inkBar: true, tabPane: false }}
      />
    </div>
  );
}
