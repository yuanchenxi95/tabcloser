import { Button, Card, Divider, List, Space, Tag, Tooltip, Typography } from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { DisplayGroup, GroupSource, SyncStatus } from '../../../types';
import { formatDuration } from '../../../formatDuration';

interface Props {
  readonly syncStatus: SyncStatus;
  readonly isSyncing: boolean;
  readonly onSync: () => void;
  readonly displayGroups: readonly DisplayGroup[];
}

export function SyncTab({ syncStatus, isSyncing, onSync, displayGroups }: Props) {
  const remoteUrl =
    'https://raw.githubusercontent.com/yuanchenxi95/tabcloser/main/default_rules.json';

  // Filter for remote/default rules
  const defaultRules = displayGroups
    .filter((dg) => dg.source === GroupSource.DEFAULT)
    .map((dg) => dg.group);

  return (
    <div>
      <Card size="small" style={{ borderRadius: 6, marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              <GlobalOutlined style={{ marginRight: 4 }} /> Remote Source URL
            </Typography.Text>
            <div
              style={{
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                fontSize: 12,
              }}
            >
              <a href={remoteUrl} target="_blank" rel="noreferrer" style={{ color: '#1677ff' }}>
                {remoteUrl}
              </a>
            </div>
          </div>

          <Divider style={{ margin: '6px 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                Status
              </Typography.Text>
              {isSyncing ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  <SyncOutlined spin style={{ marginRight: 4 }} /> Syncing...
                </Typography.Text>
              ) : syncStatus.error ? (
                <Tooltip title={syncStatus.error}>
                  <Typography.Text type="danger" style={{ fontSize: 12, cursor: 'help' }}>
                    <ExclamationCircleOutlined style={{ marginRight: 4 }} /> Sync failed
                  </Typography.Text>
                </Tooltip>
              ) : syncStatus.lastSyncTime ? (
                <Typography.Text style={{ fontSize: 12 }}>
                  <CheckCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                  Synced:{' '}
                  {new Date(syncStatus.lastSyncTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography.Text>
              ) : (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Never synced
                </Typography.Text>
              )}
            </div>

            <Button
              type="primary"
              size="small"
              icon={<SyncOutlined spin={isSyncing} />}
              loading={isSyncing}
              onClick={onSync}
            >
              Sync Now
            </Button>
          </div>
        </div>
      </Card>

      <Typography.Title level={5} style={{ fontSize: 12, marginTop: 12, marginBottom: 8 }}>
        Fetched Default Rules ({defaultRules.length})
      </Typography.Title>

      <List
        size="small"
        dataSource={defaultRules}
        locale={{ emptyText: 'No remote rules fetched' }}
        renderItem={(group) => (
          <List.Item style={{ padding: '6px 0' }}>
            <List.Item.Meta
              title={
                <Space size={4}>
                  <Typography.Text style={{ fontSize: 12, fontWeight: 500 }}>
                    {group.name}
                  </Typography.Text>
                  <Tag
                    color="blue"
                    bordered={false}
                    style={{ fontSize: 9, padding: '0 3px', lineHeight: '12px' }}
                  >
                    Default
                  </Tag>
                </Space>
              }
              description={
                <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                  {group.matches.length} pattern(s) • {formatDuration(group.closeTimeout)}
                </Typography.Text>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
