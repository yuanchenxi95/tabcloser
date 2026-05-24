import { Button, List, Space, Tag, Typography } from 'antd';
import {
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { DisplayGroup, GroupSource } from '../../../types';
import { formatDuration } from '../../../formatDuration';

interface Props {
  readonly displayGroups: readonly DisplayGroup[];
  readonly onEdit: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onCreate: () => void;
  readonly onExport: () => void;
  readonly onImport: () => void;
}

export function ConfigTab({
  displayGroups,
  onEdit,
  onRemove,
  onCreate,
  onExport,
  onImport,
}: Props) {
  const hasLocalGroups = displayGroups.some(
    (dg) => dg.source === GroupSource.LOCAL,
  );

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={onCreate}>
          New
        </Button>
        <Space size="small">
          <Button icon={<ImportOutlined />} size="small" onClick={onImport}>
            Import
          </Button>
          {hasLocalGroups && (
            <Button icon={<ExportOutlined />} size="small" onClick={onExport}>
              Export
            </Button>
          )}
        </Space>
      </Space>

      <List
        size="small"
        dataSource={[...displayGroups]}
        locale={{ emptyText: 'No rules configured' }}
        renderItem={(dg) => {
          const isDefault = dg.source === GroupSource.DEFAULT;
          return (
            <List.Item
              actions={
                isDefault
                  ? undefined
                  : [
                      <Button
                        key="edit"
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(dg.group.id)}
                      />,
                      <Button
                        key="delete"
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onRemove(dg.group.id)}
                      />,
                    ]
              }
            >
              <List.Item.Meta
                title={
                  <Space size={4}>
                    <Typography.Text style={{ fontSize: 13, fontWeight: 500 }}>
                      {dg.group.name}
                    </Typography.Text>
                    {isDefault && (
                      <Tag
                        color="blue"
                        bordered={false}
                        style={{ fontSize: 10, padding: '0 4px', lineHeight: '14px' }}
                      >
                        Default
                      </Tag>
                    )}
                  </Space>
                }
                description={
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {dg.group.matches.length} pattern(s) • {formatDuration(dg.group.closeTimeout)}
                  </Typography.Text>
                }
              />
            </List.Item>
          );
        }}
      />
    </div>
  );
}
