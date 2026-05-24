import { useEffect, useState } from 'react';
import { Button, List, Space, Tag, Typography, Divider, Card } from 'antd';
import {
  ClockCircleOutlined,
  HistoryOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { HistoryEntry, PendingClosure } from '../../../types';
import { getHistory, clearHistory } from '../../../storage';

export function HistoryTab() {
  const [history, setHistory] = useState<readonly HistoryEntry[]>([]);
  const [pending, setPending] = useState<readonly PendingClosure[]>([]);

  const loadHistory = async () => {
    const list = await getHistory();
    setHistory(list);
  };

  const loadPending = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(
        { type: 'GET_PENDING_CLOSURES' },
        (response: PendingClosure[]) => {
          if (chrome.runtime.lastError) {
            setPending([]);
            return;
          }
          if (response) {
            setPending(response);
          }
        },
      );
    }
  };

  useEffect(() => {
    loadHistory();
    loadPending();

    const interval = setInterval(() => {
      loadPending();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleClearHistory = async () => {
    await clearHistory();
    await loadHistory();
  };

  const getRemainingSeconds = (targetTime: number) => {
    return Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
  };

  const formatRemaining = (seconds: number) => {
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}h ${m}m`;
    }
    if (seconds >= 60) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div>
      {/* 1. Pending Closures section */}
      <div style={{ marginBottom: 16 }}>
        <Typography.Title
          level={5}
          style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}
        >
          <ClockCircleOutlined /> Active Countdowns ({pending.length})
        </Typography.Title>
        <List
          size="small"
          dataSource={[...pending]}
          locale={{ emptyText: 'No tabs are currently matching countdowns' }}
          renderItem={(item) => {
            const secs = getRemainingSeconds(item.targetCloseTime);
            return (
              <Card
                size="small"
                style={{
                  marginBottom: 6,
                  borderRadius: 6,
                  border: '1px solid #ffe58f',
                  backgroundColor: '#fffbe6',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Typography.Text
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        maxWidth: '75%',
                      }}
                      title={item.url}
                    >
                      {item.url}
                    </Typography.Text>
                    <Tag
                      color="warning"
                      bordered={false}
                      style={{ fontSize: 10, margin: 0, fontWeight: 'bold' }}
                    >
                      {formatRemaining(secs)} left
                    </Tag>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                      Rule: <strong>{item.groupName}</strong>
                    </Typography.Text>
                  </div>
                </div>
              </Card>
            );
          }}
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* 2. Closed History section */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <Typography.Title
            level={5}
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}
          >
            <HistoryOutlined /> Closed History ({history.length})
          </Typography.Title>
          {history.length > 0 && (
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={handleClearHistory}
              style={{ fontSize: 11, padding: '0 4px', height: 'auto' }}
            >
              Clear
            </Button>
          )}
        </div>

        <List
          size="small"
          dataSource={[...history]}
          locale={{ emptyText: 'No closed tabs history yet' }}
          renderItem={(item) => {
            const isClosed = item.status === 'closed';
            const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            return (
              <List.Item style={{ padding: '6px 0' }}>
                <List.Item.Meta
                  title={
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Typography.Text
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: '70%',
                        }}
                        title={item.url}
                      >
                        {item.url}
                      </Typography.Text>
                      <Space size={4}>
                        <Tag
                          color={isClosed ? 'success' : 'error'}
                          bordered={false}
                          style={{ fontSize: 9, padding: '0 3px', lineHeight: '12px', margin: 0 }}
                        >
                          {isClosed ? <CheckOutlined /> : <CloseOutlined />}{' '}
                          {isClosed ? 'Closed' : 'Failed'}
                        </Tag>
                        <span style={{ fontSize: 10, color: 'gray' }}>{timeStr}</span>
                      </Space>
                    </div>
                  }
                  description={
                    <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                      Matched Group: <strong>{item.groupName}</strong>
                      {!isClosed && item.error && ` • Error: ${item.error}`}
                    </Typography.Text>
                  }
                />
              </List.Item>
            );
          }}
        />
      </div>
    </div>
  );
}
